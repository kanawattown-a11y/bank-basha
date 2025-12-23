import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders, validateAmount, generateReferenceNumber } from '@/lib/auth/security';
import { verifyAuth, getAuthErrorMessage } from '@/lib/auth/verify-session';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const internalTransferSchema = z.object({
    direction: z.enum(['TO_BUSINESS', 'TO_PERSONAL']),
    amount: z.number().positive('Amount must be positive'),
    pin: z.string().length(4, 'PIN must be 4 digits'),
});

/**
 * Internal transfer between personal and business wallets
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

        // Get user with both wallets
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallet: true,
                businessWallet: true,
            },
        });

        if (!user || !user.hasMerchantAccount || !user.businessWallet) {
            return NextResponse.json(
                { error: 'Business account required for internal transfers' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        if (!user.wallet) {
            return NextResponse.json(
                { error: 'Personal wallet not found' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const result = internalTransferSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { direction, amount, pin } = result.data;

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

        // Check source wallet balance
        const sourceWallet = direction === 'TO_BUSINESS' ? user.wallet : user.businessWallet;
        const destWallet = direction === 'TO_BUSINESS' ? user.businessWallet : user.wallet;

        if (sourceWallet.balance < amount) {
            return NextResponse.json(
                { error: 'Insufficient balance' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Process internal transfer (no fees)
        const referenceNumber = generateReferenceNumber('INT');
        const directionLabel = direction === 'TO_BUSINESS' ? 'Personal → Business' : 'Business → Personal';
        const directionLabelAr = direction === 'TO_BUSINESS' ? 'شخصي → بزنس' : 'بزنس → شخصي';

        const transaction = await prisma.$transaction(async (tx) => {
            // Deduct from source
            await tx.wallet.update({
                where: { id: sourceWallet.id },
                data: { balance: { decrement: amount } },
            });

            // Add to destination
            await tx.wallet.update({
                where: { id: destWallet.id },
                data: { balance: { increment: amount } },
            });

            // Create transaction record
            const txn = await tx.transaction.create({
                data: {
                    senderId: userId,
                    receiverId: userId,
                    amount,
                    netAmount: amount,
                    fee: 0,
                    referenceNumber,
                    type: 'INTERNAL_TRANSFER',
                    status: 'COMPLETED',
                    description: `Internal transfer: ${directionLabel}`,
                    descriptionAr: `تحويل داخلي: ${directionLabelAr}`,
                    completedAt: new Date(),
                    metadata: JSON.stringify({
                        direction,
                        fromWalletId: sourceWallet.id,
                        toWalletId: destWallet.id,
                        fromWalletType: direction === 'TO_BUSINESS' ? 'PERSONAL' : 'BUSINESS',
                        toWalletType: direction === 'TO_BUSINESS' ? 'BUSINESS' : 'PERSONAL',
                    }),
                },
            });

            return txn;
        });

        // Create notification
        await prisma.notification.create({
            data: {
                userId,
                type: 'TRANSACTION',
                title: 'Internal Transfer',
                titleAr: 'تحويل داخلي',
                message: `Transferred $${amount} ${directionLabel}`,
                messageAr: `تم تحويل $${amount} ${directionLabelAr}`,
                metadata: JSON.stringify({ transactionId: transaction.id }),
            },
        });

        // Get updated balances
        const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallet: true,
                businessWallet: true,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: direction === 'TO_BUSINESS'
                    ? 'تم التحويل إلى حساب البزنس بنجاح'
                    : 'تم التحويل إلى الحساب الشخصي بنجاح',
                transaction: {
                    id: transaction.id,
                    referenceNumber: transaction.referenceNumber,
                    amount: transaction.amount,
                    direction,
                },
                balances: {
                    personal: updatedUser?.wallet?.balance || 0,
                    business: updatedUser?.businessWallet?.balance || 0,
                },
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Internal transfer error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
