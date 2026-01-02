import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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
                { error: 'Unauthorized - Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        // Get counts
        const [totalUsers, totalAgents, totalMerchants, pendingKYCCount, pendingSettlementsCount] = await Promise.all([
            prisma.user.count({ where: { userType: 'USER' } }),
            prisma.user.count({ where: { userType: 'AGENT', status: 'ACTIVE' } }),
            prisma.user.count({ where: { userType: 'MERCHANT', status: 'ACTIVE' } }),
            prisma.user.count({ where: { kycStatus: 'PENDING' } }),
            prisma.settlement.count({ where: { status: 'PENDING' } }),
        ]);

        // Get today's volume by currency
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Total volume today - USD transactions
        const todayVolumeUSD = await prisma.transaction.aggregate({
            where: {
                status: 'COMPLETED',
                createdAt: { gte: today },
                currency: 'USD',
            },
            _sum: { amount: true },
        });

        // Total volume today - SYP transactions
        const todayVolumeSYP = await prisma.transaction.aggregate({
            where: {
                status: 'COMPLETED',
                createdAt: { gte: today },
                currency: 'SYP',
            },
            _sum: { amount: true },
        });

        // Get total balances by currency
        const totalBalanceUSD = await prisma.wallet.aggregate({
            where: { currency: 'USD' },
            _sum: { balance: true },
        });

        const totalBalanceSYP = await prisma.wallet.aggregate({
            where: { currency: 'SYP' },
            _sum: { balance: true },
        });

        // Get pending KYC users
        const pendingKYC = await prisma.user.findMany({
            where: { kycStatus: 'PENDING' },
            select: {
                id: true,
                fullName: true,
                phone: true,
                createdAt: true,
            },
            take: 5,
            orderBy: { createdAt: 'asc' },
        });

        // Get pending settlements
        const pendingSettlements = await prisma.settlement.findMany({
            where: { status: 'PENDING' },
            include: {
                agent: {
                    select: {
                        agentCode: true,
                        businessName: true,
                    },
                },
            },
            take: 5,
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(
            {
                stats: {
                    totalUsers,
                    totalAgents,
                    totalMerchants,

                    // Dual currency volumes
                    todayVolume: {
                        USD: todayVolumeUSD._sum.amount || 0,
                        SYP: todayVolumeSYP._sum.amount || 0,
                    },

                    // Dual currency total balances
                    totalBalance: {
                        USD: totalBalanceUSD._sum.balance || 0,
                        SYP: totalBalanceSYP._sum.balance || 0,
                    },

                    pendingKYC: pendingKYCCount,
                    pendingSettlements: pendingSettlementsCount,
                },

                pendingKYC,

                pendingSettlements: pendingSettlements.map(s => ({
                    id: s.id,
                    agentCode: s.agent.agentCode,
                    businessName: s.agent.businessName,
                    amountDue: s.amountDue,
                    createdAt: s.createdAt,
                })),
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Admin dashboard error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
