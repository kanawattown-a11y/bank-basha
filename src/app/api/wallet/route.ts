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

        const wallet = await prisma.wallet.findUnique({
            where: { userId: user.id },
        });

        if (!wallet) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Get business wallet if user has merchant account
        let businessWallet = null;
        let merchantProfile = null;

        if (user.hasMerchantAccount && user.businessWalletId) {
            businessWallet = await prisma.wallet.findUnique({
                where: { id: user.businessWalletId },
            });

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
                wallet: {
                    balance: wallet.balance,
                    frozenBalance: wallet.frozenBalance,
                    currency: wallet.currency,
                    isActive: wallet.isActive,
                    dailyLimit: wallet.dailyLimit,
                    monthlyLimit: wallet.monthlyLimit,
                },
                businessWallet: businessWallet ? {
                    balance: businessWallet.balance,
                    frozenBalance: businessWallet.frozenBalance,
                    currency: businessWallet.currency,
                } : null,
                merchantProfile: merchantProfile ? {
                    businessName: merchantProfile.businessName,
                    businessNameAr: merchantProfile.businessNameAr,
                    qrCode: merchantProfile.qrCode,
                } : null,
                hasMerchantAccount: user.hasMerchantAccount,
                recentTransactions: recentTransactions.map(tx => ({
                    id: tx.id,
                    referenceNumber: tx.referenceNumber,
                    type: tx.type,
                    amount: tx.amount,
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
