import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// Middleware to get current user from token
async function getCurrentUser(request: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) {
        return null;
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
        return null;
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
        return null;
    }

    return session.user;
}

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        // Get all user wallets
        const wallets = await prisma.wallet.findMany({
            where: { userId: user.id },
            orderBy: [{ walletType: 'asc' }, { currency: 'asc' }],
        });

        if (wallets.length === 0) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Organize wallets by type and currency
        const personalWalletUSD = wallets.find(
            (w: { currency: string; walletType: string }) => w.walletType === 'PERSONAL' && w.currency === 'USD'
        );
        const personalWalletSYP = wallets.find(
            (w: { currency: string; walletType: string }) => w.walletType === 'PERSONAL' && w.currency === 'SYP'
        );
        const businessWalletUSD = wallets.find(
            (w: { currency: string; walletType: string }) => w.walletType === 'BUSINESS' && w.currency === 'USD'
        );
        const businessWalletSYP = wallets.find(
            (w: { currency: string; walletType: string }) => w.walletType === 'BUSINESS' && w.currency === 'SYP'
        );

        // Get merchant profile if user has merchant account
        let merchantProfile = null;
        if (user.hasMerchantAccount) {
            merchantProfile = await prisma.merchantProfile.findUnique({
                where: { userId: user.id },
            });
        }

        // Get recent transactions
        const recentTransactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { senderId: user.id },
                    { receiverId: user.id },
                ],
                status: 'COMPLETED',
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                sender: {
                    select: { id: true, fullName: true, fullNameAr: true },
                },
                receiver: {
                    select: { id: true, fullName: true, fullNameAr: true },
                },
            },
        });

        // Calculate totals for the month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyStats = await prisma.transaction.groupBy({
            by: ['type'],
            where: {
                OR: [
                    { senderId: user.id },
                    { receiverId: user.id },
                ],
                status: 'COMPLETED',
                createdAt: { gte: startOfMonth },
            },
            _sum: { amount: true },
            _count: true,
        });

        return NextResponse.json(
            {
                user: {
                    fullName: user.fullName,
                    fullNameAr: user.fullNameAr,
                    phone: user.phone,
                },

                // Main wallet (USD personal for backward compatibility)
                wallet: personalWalletUSD ? {
                    balance: personalWalletUSD.balance,
                    frozenBalance: personalWalletUSD.frozenBalance,
                    currency: personalWalletUSD.currency,
                    isActive: personalWalletUSD.isActive,
                    dailyLimit: personalWalletUSD.dailyLimit,
                    monthlyLimit: personalWalletUSD.monthlyLimit,
                } : null,

                // All personal wallets
                personalWallets: {
                    USD: personalWalletUSD ? {
                        id: personalWalletUSD.id,
                        balance: personalWalletUSD.balance,
                        frozenBalance: personalWalletUSD.frozenBalance,
                        isActive: personalWalletUSD.isActive,
                    } : null,
                    SYP: personalWalletSYP ? {
                        id: personalWalletSYP.id,
                        balance: personalWalletSYP.balance,
                        frozenBalance: personalWalletSYP.frozenBalance,
                        isActive: personalWalletSYP.isActive,
                    } : null,
                },

                // Business wallet (USD for backward compatibility)
                businessWallet: businessWalletUSD ? {
                    balance: businessWalletUSD.balance,
                    frozenBalance: businessWalletUSD.frozenBalance,
                    currency: businessWalletUSD.currency,
                } : null,

                // All business wallets
                businessWallets: user.hasMerchantAccount ? {
                    USD: businessWalletUSD ? {
                        id: businessWalletUSD.id,
                        balance: businessWalletUSD.balance,
                        frozenBalance: businessWalletUSD.frozenBalance,
                    } : null,
                    SYP: businessWalletSYP ? {
                        id: businessWalletSYP.id,
                        balance: businessWalletSYP.balance,
                        frozenBalance: businessWalletSYP.frozenBalance,
                    } : null,
                } : null,

                merchantProfile: merchantProfile ? {
                    businessName: merchantProfile.businessName,
                    businessNameAr: merchantProfile.businessNameAr,
                    merchantCode: merchantProfile.merchantCode,
                    qrCode: merchantProfile.qrCode,
                } : null,

                hasMerchantAccount: user.hasMerchantAccount,

                recentTransactions: recentTransactions.map(tx => ({
                    id: tx.id,
                    referenceNumber: tx.referenceNumber,
                    type: tx.type,
                    amount: tx.amount,
                    currency: (tx as unknown as { currency: string }).currency || 'USD',
                    fee: tx.fee,
                    netAmount: tx.netAmount,
                    status: tx.status,
                    description: tx.description,
                    descriptionAr: tx.descriptionAr,
                    createdAt: tx.createdAt,
                    isOutgoing: tx.senderId === user.id,
                    senderName: tx.sender?.fullNameAr || tx.sender?.fullName,
                    receiverName: tx.receiver?.fullNameAr || tx.receiver?.fullName,
                    counterparty: tx.senderId === user.id
                        ? tx.receiver?.fullName
                        : tx.sender?.fullName,
                })),

                monthlyStats: monthlyStats.reduce((acc, stat) => {
                    acc[stat.type] = {
                        total: stat._sum.amount || 0,
                        count: stat._count,
                    };
                    return acc;
                }, {} as Record<string, { total: number; count: number }>),
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Wallet API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
