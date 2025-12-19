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
        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        // Get user with merchant profile
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                wallet: true,
                merchantProfile: true,
            },
        });

        // Check if user has merchant access (either MERCHANT userType or hasMerchantAccount)
        const hasMerchantAccess = user && (
            user.userType === 'MERCHANT' ||
            user.hasMerchantAccount
        );

        if (!hasMerchantAccess || !user.merchantProfile) {
            return NextResponse.json(
                { error: 'Unauthorized - Merchant access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        // Get business wallet if user has separate business wallet
        let businessBalance = user.wallet?.balance || 0;
        if (user.businessWalletId) {
            const businessWallet = await prisma.wallet.findUnique({
                where: { id: user.businessWalletId },
            });
            if (businessWallet) {
                businessBalance = businessWallet.balance;
            }
        }

        // Get today's transactions
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTransactions = await prisma.transaction.count({
            where: {
                receiverId: payload.userId,
                type: 'QR_PAYMENT',
                status: 'COMPLETED',
                createdAt: { gte: today },
            },
        });

        // Get recent transactions
        const recentTransactions = await prisma.transaction.findMany({
            where: {
                receiverId: payload.userId,
                type: 'QR_PAYMENT',
                status: 'COMPLETED',
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                sender: {
                    select: { fullName: true, fullNameAr: true },
                },
            },
        });

        return NextResponse.json(
            {
                merchantCode: user.merchantProfile.merchantCode,
                qrCode: user.merchantProfile.qrCode,
                businessName: user.merchantProfile.businessName,
                businessNameAr: user.merchantProfile.businessNameAr,
                balance: businessBalance,
                totalSales: user.merchantProfile.totalSales,
                todayTransactions,
                recentTransactions: recentTransactions.map(tx => ({
                    id: tx.id,
                    referenceNumber: tx.referenceNumber,
                    amount: tx.amount,
                    fee: tx.fee,
                    netAmount: tx.netAmount,
                    description: tx.description,
                    status: tx.status,
                    createdAt: tx.createdAt,
                    senderName: tx.sender?.fullNameAr || tx.sender?.fullName || 'ناقص',
                })),
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Merchant dashboard error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
