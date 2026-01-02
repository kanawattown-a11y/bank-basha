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
        if (!payload || payload.userType !== 'AGENT') {
            return NextResponse.json(
                { error: 'Unauthorized - Agent access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        // Get agent profile with wallets
        const agent = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                wallets: true,
                agentProfile: true,
            },
        });

        if (!agent || !agent.agentProfile) {
            return NextResponse.json(
                { error: 'Agent profile not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Get wallets by currency
        const walletUSD = agent.wallets.find(
            (w: { currency: string; walletType: string }) => w.currency === 'USD' && w.walletType === 'PERSONAL'
        );
        const walletSYP = agent.wallets.find(
            (w: { currency: string; walletType: string }) => w.currency === 'SYP' && w.walletType === 'PERSONAL'
        );

        // Get today's transaction count
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTransactions = await prisma.transaction.count({
            where: {
                agentId: payload.userId,
                createdAt: { gte: today },
                status: 'COMPLETED',
            },
        });

        // Get pending settlement amount
        const pendingSettlements = await prisma.settlement.aggregate({
            where: {
                agentId: agent.agentProfile.id,
                status: 'PENDING',
            },
            _sum: { amountDue: true },
        });

        return NextResponse.json(
            {
                // Dual currency balances
                balances: {
                    USD: walletUSD?.balance || 0,
                    SYP: walletSYP?.balance || 0,
                },

                // Dual currency cash collected
                cashCollected: {
                    USD: agent.agentProfile.cashCollected,
                    SYP: agent.agentProfile.cashCollectedSYP,
                },

                // Dual currency credit
                currentCredit: {
                    USD: agent.agentProfile.currentCredit,
                    SYP: agent.agentProfile.currentCreditSYP,
                },

                // Dual currency stats
                stats: {
                    USD: {
                        totalDeposits: agent.agentProfile.totalDeposits,
                        totalWithdrawals: agent.agentProfile.totalWithdrawals,
                    },
                    SYP: {
                        totalDeposits: agent.agentProfile.totalDepositsSYP,
                        totalWithdrawals: agent.agentProfile.totalWithdrawalsSYP,
                    },
                },

                todayTransactions,
                pendingSettlement: pendingSettlements._sum.amountDue || 0,
                pendingDebt: agentProfile.pendingDebt || 0,
                agentCode: agent.agentProfile.agentCode,
                businessName: agent.agentProfile.businessName,
                businessNameAr: agent.agentProfile.businessNameAr,

                // Legacy fields for backward compatibility
                digitalBalance: walletUSD?.balance || 0,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Agent dashboard error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
