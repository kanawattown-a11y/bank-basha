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
            include: { wallets: true },
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
                    wallets: {
                        create: [
                            { balance: 0, currency: 'USD', walletType: 'PERSONAL' },
                            { balance: 0, currency: 'SYP', walletType: 'PERSONAL' },
                        ],
                    },
                },
                include: { wallets: true },
            });
        }

        // Find central bank wallets for display
        const centralBankUSDWallet = (centralBank.wallets as any[])?.find(
            (w: { currency: string }) => w.currency === 'USD'
        );
        const centralBankSYPWallet = (centralBank.wallets as any[])?.find(
            (w: { currency: string }) => w.currency === 'SYP'
        );

        // Get all user wallet balances by currency
        const userWalletsUSD = await prisma.wallet.aggregate({
            _sum: { balance: true },
            where: {
                currency: 'USD',
                user: {
                    userType: { in: ['USER', 'MERCHANT'] },
                    phone: { not: 'CENTRAL_BANK' },
                },
            },
        });

        const userWalletsSYP = await prisma.wallet.aggregate({
            _sum: { balance: true },
            where: {
                currency: 'SYP',
                user: {
                    userType: { in: ['USER', 'MERCHANT'] },
                    phone: { not: 'CENTRAL_BANK' },
                },
            },
        });

        // Get all agent credits (USD and SYP)
        const agentCredits = await prisma.agentProfile.aggregate({
            _sum: {
                currentCredit: true,
                cashCollected: true,
                currentCreditSYP: true,
                cashCollectedSYP: true,
            },
        });

        // Get Internal Accounts (the REAL system balances)
        const internalAccounts = await prisma.internalAccount.findMany({
            where: {
                code: {
                    in: ['SYS-RESERVE', 'SYS-RESERVE-SYP', 'FEES-COLLECTED', 'FEES-COLLECTED-SYP', 'AGENTS-LEDGER', 'AGENTS-LEDGER-SYP', 'USERS-LEDGER', 'USERS-LEDGER-SYP']
                }
            }
        });

        const getAccountBalance = (code: string) =>
            internalAccounts.find(a => a.code === code)?.balance || 0;

        // System Reserve is the central bank's actual reserve
        const systemReserveUSD = getAccountBalance('SYS-RESERVE');
        const systemReserveSYP = getAccountBalance('SYS-RESERVE-SYP');
        const feesCollectedUSD = getAccountBalance('FEES-COLLECTED');
        const feesCollectedSYP = getAccountBalance('FEES-COLLECTED-SYP');

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
                // Central Bank balance = System Reserve (what's held by the system)
                balance: systemReserveUSD,
                balanceSYP: systemReserveSYP,
                feesCollected: feesCollectedUSD,
                feesCollectedSYP: feesCollectedSYP,
                name: 'البنك المركزي',
            },
            summary: {
                totalUserBalances: userWalletsUSD._sum.balance || 0,
                totalUserBalancesSYP: userWalletsSYP._sum.balance || 0,
                totalAgentCredit: agentCredits._sum.currentCredit || 0,
                totalAgentCreditSYP: agentCredits._sum.currentCreditSYP || 0,
                totalAgentCash: agentCredits._sum.cashCollected || 0,
                totalAgentCashSYP: agentCredits._sum.cashCollectedSYP || 0,
                // System should balance to zero (USD)
                systemBalance: systemReserveUSD + (userWalletsUSD._sum.balance || 0),
                // System should balance to zero (SYP)
                systemBalanceSYP: systemReserveSYP + (userWalletsSYP._sum.balance || 0),
            },
            internalAccounts: internalAccounts.map(a => ({
                code: a.code,
                name: a.name,
                balance: a.balance,
            })),
            recentCreditGrants: recentTransactions.map(t => ({
                id: t.id,
                amount: t.amount,
                currency: t.currency || 'USD',
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
