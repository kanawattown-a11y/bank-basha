import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

export async function GET() {
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

        // Get or create Central Bank
        let centralBank = await prisma.user.findFirst({
            where: { phone: 'CENTRAL_BANK' },
            include: { wallet: true },
        });

        if (!centralBank) {
            centralBank = await prisma.user.create({
                data: {
                    phone: 'CENTRAL_BANK',
                    fullName: 'Bank Basha Central',
                    fullNameAr: 'البنك المركزي',
                    passwordHash: 'SYSTEM_ACCOUNT_NO_LOGIN',
                    userType: 'ADMIN',
                    isActive: true,
                    kycStatus: 'APPROVED',
                    wallet: {
                        create: {
                            balance: 0,
                            currency: 'USD',
                        },
                    },
                },
                include: { wallet: true },
            });
        }

        // Get all user wallet balances
        const userWallets = await prisma.wallet.aggregate({
            _sum: { balance: true },
            where: {
                user: {
                    userType: { in: ['USER', 'MERCHANT'] },
                    phone: { not: 'CENTRAL_BANK' },
                },
            },
        });

        // Get all agent credits
        const agentCredits = await prisma.agentProfile.aggregate({
            _sum: { currentCredit: true, cashCollected: true },
        });

        // Get recent credit grants
        const recentTransactions = await prisma.transaction.findMany({
            where: { type: 'CREDIT_GRANT' },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                receiver: {
                    select: { fullName: true, phone: true },
                },
            },
        });

        return NextResponse.json({
            centralBank: {
                balance: centralBank.wallet?.balance || 0,
                name: centralBank.fullNameAr || centralBank.fullName,
            },
            summary: {
                totalUserBalances: userWallets._sum.balance || 0,
                totalAgentCredit: agentCredits._sum.currentCredit || 0,
                totalAgentCash: agentCredits._sum.cashCollected || 0,
                // System should balance to zero
                systemBalance: (centralBank.wallet?.balance || 0)
                    + (userWallets._sum.balance || 0),
            },
            recentCreditGrants: recentTransactions.map(t => ({
                id: t.id,
                amount: t.amount,
                receiver: t.receiver?.fullName || 'N/A',
                date: t.createdAt,
                reference: t.referenceNumber,
            })),
        }, { status: 200, headers: getSecurityHeaders() });

    } catch (error) {
        console.error('Central bank API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
