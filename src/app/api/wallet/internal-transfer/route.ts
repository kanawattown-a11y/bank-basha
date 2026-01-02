import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders, generateReferenceNumber } from '@/lib/auth/security';
import { verifyAuth } from '@/lib/auth/verify-session';
import { z } from 'zod';

const transferSchema = z.object({
    fromWallet: z.enum(['personal', 'business']),
    toWallet: z.enum(['personal', 'business']),
    amount: z.number().positive().min(0.01),
    currency: z.enum(['USD', 'SYP']).default('USD'),
});

/**
 * Internal transfer between personal and business wallets
 * No PIN required since it's between own accounts
 * Supports dual currency (USD / SYP)
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await verifyAuth(request);
        if (!auth.success || !auth.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const userId = auth.user.id;

        // Check if user has merchant account
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallets: true,
            },
        });

        if (!user || !user.hasMerchantAccount) {
            return NextResponse.json(
                { error: 'Merchant account required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        // Parse request body
        const body = await request.json();
        const validation = transferSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { fromWallet, toWallet, amount, currency } = validation.data;

        // Can't transfer to same wallet
        if (fromWallet === toWallet) {
            return NextResponse.json(
                { error: 'Cannot transfer to the same wallet' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Get wallets for the selected currency
        const personalWallet = user.wallets.find(
            (w: { currency: string; walletType: string }) => w.currency === currency && w.walletType === 'PERSONAL'
        );
        const businessWallet = user.wallets.find(
            (w: { currency: string; walletType: string }) => w.currency === currency && w.walletType === 'BUSINESS'
        );

        if (!personalWallet || !businessWallet) {
            return NextResponse.json(
                { error: `لا توجد محفظة ${currency === 'SYP' ? 'ليرة سورية' : 'دولار'}` },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Determine source and destination
        const sourceWallet = fromWallet === 'personal' ? personalWallet : businessWallet;
        const destWallet = toWallet === 'personal' ? personalWallet : businessWallet;

        // Check balance
        if (sourceWallet.balance < amount) {
            return NextResponse.json(
                { error: 'رصيد غير كافي' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Perform transaction
        const result = await prisma.$transaction(async (tx) => {
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
            const referenceNumber = generateReferenceNumber('INT');
            const transaction = await tx.transaction.create({
                data: {
                    senderId: userId,
                    receiverId: userId,
                    amount,
                    netAmount: amount,
                    currency, // Add currency
                    referenceNumber,
                    type: 'INTERNAL_TRANSFER',
                    status: 'COMPLETED',
                    description: fromWallet === 'personal'
                        ? 'تحويل من الحساب الشخصي للبزنس'
                        : 'تحويل من البزنس للحساب الشخصي',
                    metadata: JSON.stringify({
                        fromWallet,
                        toWallet,
                        currency,
                        sourceWalletId: sourceWallet.id,
                        destWalletId: destWallet.id,
                    }),
                },
            });

            return transaction;
        });

        // Get updated balances
        const updatedPersonal = await prisma.wallet.findUnique({ where: { id: personalWallet.id } });
        const updatedBusiness = await prisma.wallet.findUnique({ where: { id: businessWallet.id } });

        return NextResponse.json({
            success: true,
            transaction: {
                id: result.id,
                amount,
                currency,
                fromWallet,
                toWallet,
            },
            balances: {
                personal: updatedPersonal?.balance || 0,
                business: updatedBusiness?.balance || 0,
            },
        });
    } catch (error) {
        console.error('Internal transfer error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
