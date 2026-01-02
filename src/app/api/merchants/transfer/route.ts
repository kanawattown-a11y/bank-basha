import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders, validateAmount, sanitizePhoneNumber, generateReferenceNumber } from '@/lib/auth/security';
import { verifyAuth, getAuthErrorMessage } from '@/lib/auth/verify-session';
import { processTransfer } from '@/lib/ledger/ledger';
import { sendPushNotification } from '@/lib/firebase/admin';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const transferSchema = z.object({
    recipientPhone: z.string().min(9, 'Invalid phone number'),
    amount: z.number().positive('Amount must be positive'),
    pin: z.string().length(4, 'PIN must be 4 digits'),
    note: z.string().max(200).optional(),
    currency: z.enum(['USD', 'SYP']).default('USD'),
});

/**
 * Merchant transfer from business wallet to any user
 * Uses Payment PIN for verification
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await verifyAuth(request);

        if (!auth.success || !auth.user) {
            return NextResponse.json(
                { error: getAuthErrorMessage(auth.error || 'INVALID_TOKEN', 'ar') },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const userId = auth.user.id;

        // Check merchant account
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { merchantProfile: true, wallets: true },
        });

        if (!user || !user.hasMerchantAccount) {
            return NextResponse.json(
                { error: 'Merchant account required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const result = transferSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { recipientPhone, amount, pin, note, currency } = result.data;

        // Verify Payment PIN
        if (!user.paymentPin) {
            return NextResponse.json(
                { error: 'Payment PIN not set. Please set it in settings.' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const isPinValid = await bcrypt.compare(pin, user.paymentPin);
        if (!isPinValid) {
            return NextResponse.json(
                { error: 'Invalid PIN' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        if (!validateAmount(amount)) {
            return NextResponse.json(
                { error: 'Invalid amount' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Find recipient - allow personal wallets only
        const sanitizedPhone = sanitizePhoneNumber(recipientPhone);
        const recipient = await prisma.user.findUnique({
            where: { phone: sanitizedPhone },
            include: { wallets: true },
        });

        if (!recipient) {
            return NextResponse.json(
                { error: 'Recipient not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Cannot transfer to agents
        if (recipient.userType === 'AGENT') {
            return NextResponse.json(
                { error: 'Cannot transfer to agents' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Cannot transfer to self
        if (recipient.id === userId) {
            return NextResponse.json(
                { error: 'Use internal transfer to move funds between your wallets' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Get business wallet based on currency
        const businessWallet = (user.wallets as any[])?.find(
            (w: { currency: string; walletType: string }) => w.currency === currency && w.walletType === 'BUSINESS'
        );

        if (!businessWallet) {
            return NextResponse.json(
                { error: `Business wallet not found for ${currency}` },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        if (businessWallet.balance < amount) {
            return NextResponse.json(
                { error: 'Insufficient balance in business wallet' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Find recipient's personal wallet with same currency
        const recipientWallet = (recipient.wallets as any[])?.find(
            (w: { currency: string; walletType: string }) => w.currency === currency && w.walletType === 'PERSONAL'
        );

        if (!recipientWallet) {
            return NextResponse.json(
                { error: `Recipient does not have a ${currency} wallet` },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Process transfer from business wallet to recipient's personal wallet
        const transaction = await prisma.$transaction(async (tx) => {
            // Deduct from business wallet
            await tx.wallet.update({
                where: { id: businessWallet.id },
                data: { balance: { decrement: amount } },
            });

            // Add to recipient's personal wallet
            await tx.wallet.update({
                where: { id: recipientWallet.id },
                data: { balance: { increment: amount } },
            });

            // Create transaction record
            const referenceNumber = generateReferenceNumber('MTF');
            const txn = await tx.transaction.create({
                data: {
                    senderId: userId,
                    receiverId: recipient.id,
                    amount,
                    netAmount: amount,
                    referenceNumber,
                    type: 'MERCHANT_TRANSFER',
                    status: 'COMPLETED',
                    description: note || `تحويل من ${user.merchantProfile?.businessName || 'حساب بزنس'}`,
                    metadata: JSON.stringify({
                        fromBusinessWallet: true,
                        businessWalletId: businessWallet.id,
                        businessName: user.merchantProfile?.businessName,
                    }),
                },
            });

            return txn;
        });

        // Create notifications
        await prisma.notification.createMany({
            data: [
                {
                    userId: userId,
                    type: 'TRANSACTION',
                    title: 'Transfer Sent',
                    titleAr: 'تم إرسال التحويل',
                    message: `Sent $${amount} from business to ${recipient.fullName}`,
                    messageAr: `أرسلت $${amount} من البزنس إلى ${recipient.fullNameAr || recipient.fullName}`,
                    metadata: JSON.stringify({ transactionId: transaction.id }),
                },
                {
                    userId: recipient.id,
                    type: 'TRANSACTION',
                    title: 'Transfer Received',
                    titleAr: 'تحويل وارد',
                    message: `Received $${amount} from ${user.merchantProfile?.businessName || 'Business'}`,
                    messageAr: `استلمت $${amount} من ${user.merchantProfile?.businessName || 'حساب بزنس'}`,
                    metadata: JSON.stringify({ transactionId: transaction.id }),
                },
            ],
        });

        // Push notifications
        if (recipient.fcmToken) {
            sendPushNotification(
                recipient.fcmToken,
                '💰 تحويل وارد!',
                `استلمت $${amount.toFixed(2)} من ${user.merchantProfile?.businessName || 'حساب بزنس'}`,
                { type: 'MERCHANT_TRANSFER_RECEIVED', amount: amount.toString() }
            ).catch(err => console.error('Push error:', err));
        }

        // Get updated balance
        const updatedWallet = await prisma.wallet.findUnique({
            where: { id: businessWallet.id },
        });

        return NextResponse.json({
            success: true,
            transactionId: transaction.id,
            newBalance: updatedWallet?.balance || 0,
        });
    } catch (error) {
        console.error('Merchant transfer error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
