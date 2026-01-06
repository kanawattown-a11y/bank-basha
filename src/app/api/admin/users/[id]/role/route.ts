import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { generateMerchantQR } from '@/lib/utils/qr';

const roleSchema = z.object({
    userType: z.enum(['USER', 'AGENT', 'MERCHANT']),
});

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('accessToken')?.value;

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const payload = verifyAccessToken(token);
        if (!payload || payload.userType !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const userId = params.id;
        const body = await request.json();
        const result = roleSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { userType } = result.data;

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Check if KYC is approved
        if (user.kycStatus !== 'APPROVED') {
            return NextResponse.json(
                { error: 'KYC must be approved before changing role' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Update in transaction
        await prisma.$transaction(async (tx) => {
            // Update user type
            await tx.user.update({
                where: { id: userId },
                data: { userType },
            });

            // Create agent profile if changing to AGENT
            if (userType === 'AGENT' && user.userType !== 'AGENT') {
                const agentCode = `AG${Date.now().toString().slice(-8)}`;
                await tx.agentProfile.create({
                    data: {
                        userId,
                        agentCode,
                        businessName: user.fullName,
                        businessNameAr: user.fullName,
                        businessAddress: user.address || 'السويداء',
                        // USD Credit (Default)
                        creditLimit: 0,
                        currentCredit: 0,
                        cashCollected: 0,
                        totalDeposits: 0,
                        totalWithdrawals: 0,
                        // SYP Credit (Dual Currency)
                        creditLimitSYP: 0,
                        currentCreditSYP: 0,
                        cashCollectedSYP: 0,
                        totalDepositsSYP: 0,
                        totalWithdrawalsSYP: 0,
                    },
                });
            }

            // Create merchant profile if changing to MERCHANT
            if (userType === 'MERCHANT' && user.userType !== 'MERCHANT') {
                const merchantCode = `MC${Date.now().toString().slice(-8)}`;
                const qrCode = generateMerchantQR(merchantCode);

                // Create Business Wallets (USD & SYP)
                await tx.wallet.create({
                    data: {
                        userId,
                        balance: 0,
                        walletType: 'BUSINESS',
                        currency: 'USD',
                    },
                });

                await tx.wallet.create({
                    data: {
                        userId,
                        balance: 0,
                        walletType: 'BUSINESS',
                        currency: 'SYP',
                    },
                });

                // Create Profile with Dual Currency Stats
                await tx.merchantProfile.create({
                    data: {
                        userId,
                        merchantCode,
                        businessName: user.fullName,
                        businessNameAr: user.fullName,
                        businessType: 'RETAIL',
                        businessAddress: user.address || 'السويداء',
                        qrCode,
                        // USD Stats
                        totalSales: 0,
                        totalTransactions: 0,
                        // SYP Stats
                        totalSalesSYP: 0,
                        totalTransactionsSYP: 0,
                    },
                });
            }

            // Create audit log
            await tx.auditLog.create({
                data: {
                    userId: payload.userId,
                    action: 'ROLE_CHANGED',
                    entity: 'User',
                    entityId: userId,
                    oldValue: user.userType,
                    newValue: userType,
                },
            });
        });

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Role change error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
