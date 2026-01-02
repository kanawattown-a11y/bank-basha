import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders, validateAmount, generateReferenceNumber } from '@/lib/auth/security';
import { verifyAuth, getAuthErrorMessage } from '@/lib/auth/verify-session';
import { sendPushNotification } from '@/lib/firebase/admin';
import { getUserWallet, getOrCreateWallet, formatCurrency, type Currency } from '@/lib/wallet/currency';
import { z } from 'zod';

const qrPaymentSchema = z.object({
    merchantCode: z.string().min(3, 'Invalid merchant code'),
    amount: z.number().positive('Amount must be positive'),
    currency: z.enum(['USD', 'SYP']).default('USD'),
});

export async function POST(request: NextRequest) {
    try {
        // Full session verification (token + DB session + user status)
        const auth = await verifyAuth(request);

        if (!auth.success || !auth.payload) {
            return NextResponse.json(
                { error: getAuthErrorMessage(auth.error || 'INVALID_TOKEN', 'ar') },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const payload = auth.payload;

        const body = await request.json();
        const result = qrPaymentSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { merchantCode, amount, currency } = result.data;

        if (!validateAmount(amount)) {
            return NextResponse.json(
                { error: 'Invalid amount' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Find merchant profile
        const merchantProfile = await prisma.merchantProfile.findUnique({
            where: { merchantCode },
            include: {
                user: true,
            },
        });

        if (!merchantProfile || !merchantProfile.isActive) {
            return NextResponse.json(
                { error: 'Merchant not found or inactive' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Get sender's wallet for the selected currency
        const senderWallet = await getUserWallet(payload.userId, currency as Currency, 'PERSONAL');

        if (!senderWallet) {
            const currencyName = currency === 'SYP' ? 'الليرة السورية' : 'الدولار';
            return NextResponse.json(
                { error: `ليس لديك محفظة بـ${currencyName}` },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Calculate fees
        const { calculateCommission } = await import('@/lib/ledger/ledger');
        const { platformFee, totalFee } = await calculateCommission(amount, 'QR_PAYMENT');

        // Check balance
        if (senderWallet.balance < amount + totalFee) {
            return NextResponse.json(
                { error: `رصيد غير كافٍ. المطلوب: ${formatCurrency(amount + totalFee, currency as Currency)}` },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Get or create merchant's business wallet for this currency
        let merchantWallet = await getUserWallet(merchantProfile.userId, currency as Currency, 'BUSINESS');
        if (!merchantWallet) {
            // Create business wallet if it doesn't exist
            merchantWallet = await getOrCreateWallet(merchantProfile.userId, currency as Currency, 'BUSINESS');
        }

        // Process payment
        const referenceNumber = generateReferenceNumber('QRP');

        const transaction = await prisma.$transaction(async (tx) => {
            // Deduct from sender
            await tx.wallet.update({
                where: { id: senderWallet.id },
                data: { balance: { decrement: amount + totalFee } },
            });

            // Add to merchant's business wallet
            await tx.wallet.update({
                where: { id: merchantWallet!.id },
                data: { balance: { increment: amount } },
            });

            // Update merchant stats based on currency
            if (currency === 'SYP') {
                await tx.merchantProfile.update({
                    where: { id: merchantProfile.id },
                    data: {
                        totalSalesSYP: { increment: amount },
                        totalTransactionsSYP: { increment: 1 },
                    },
                });
            } else {
                await tx.merchantProfile.update({
                    where: { id: merchantProfile.id },
                    data: {
                        totalSales: { increment: amount },
                        totalTransactions: { increment: 1 },
                    },
                });
            }

            // Create transaction record
            const newTransaction = await tx.transaction.create({
                data: {
                    referenceNumber,
                    type: 'QR_PAYMENT',
                    status: 'COMPLETED',
                    senderId: payload.userId,
                    receiverId: merchantProfile.userId,
                    amount,
                    fee: totalFee,
                    platformFee,
                    agentFee: 0,
                    netAmount: amount,
                    currency, // USD or SYP
                    description: `Payment to ${merchantProfile.businessName}`,
                    descriptionAr: `دفع إلى ${merchantProfile.businessNameAr || merchantProfile.businessName}`,
                    completedAt: new Date(),
                },
            });

            return newTransaction;
        });

        // Get sender info for notifications
        const sender = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        // Create database notifications with currency
        const formattedAmount = formatCurrency(amount, currency as Currency);
        await prisma.notification.createMany({
            data: [
                {
                    userId: payload.userId,
                    type: 'TRANSACTION',
                    title: 'Payment Sent',
                    titleAr: 'تم الدفع',
                    message: `You paid ${formattedAmount} to ${merchantProfile.businessName}`,
                    messageAr: `دفعت ${formattedAmount} إلى ${merchantProfile.businessNameAr || merchantProfile.businessName}`,
                },
                {
                    userId: merchantProfile.userId,
                    type: 'TRANSACTION',
                    title: 'Payment Received',
                    titleAr: 'تم استلام دفعة',
                    message: `You received ${formattedAmount}`,
                    messageAr: `استلمت ${formattedAmount}`,
                },
            ],
        });

        // Send Firebase Push Notifications
        if (sender?.fcmToken) {
            sendPushNotification(
                sender.fcmToken,
                '💳 تم الدفع بنجاح',
                `دفعت ${formattedAmount} إلى ${merchantProfile.businessNameAr || merchantProfile.businessName}`,
                { type: 'PAYMENT_SENT', amount: amount.toString(), currency }
            ).catch(err => console.error('Push payer error:', err));
        }

        if (merchantProfile.user.fcmToken) {
            sendPushNotification(
                merchantProfile.user.fcmToken,
                '💰 دفعة جديدة!',
                `استلمت ${formattedAmount} من ${sender?.fullNameAr || sender?.fullName}`,
                { type: 'PAYMENT_RECEIVED', amount: amount.toString(), currency }
            ).catch(err => console.error('Push merchant error:', err));
        }

        return NextResponse.json(
            {
                success: true,
                transactionId: transaction.id,
                referenceNumber,
                currency,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('QR Payment error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
