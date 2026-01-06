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
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        // Get all transactions
        const transactions = await prisma.transaction.findMany({
            include: {
                sender: {
                    select: { fullName: true, fullNameAr: true },
                },
                receiver: {
                    select: { fullName: true, fullNameAr: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 500, // Last 500 transactions
        });

        // Get active users (last 10 minutes based on updatedAt)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const activeUsers = await prisma.user.findMany({
            where: {
                updatedAt: { gte: tenMinutesAgo },
            },
            select: {
                id: true,
                fullName: true,
                fullNameAr: true,
                phone: true,
                userType: true,
                hasMerchantAccount: true,
                updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: 50,
        });

        // Calculate stats - separate by currency
        const stats = {
            totalTransactions: transactions.length,
            totalVolumeUSD: transactions.filter(tx => tx.currency === 'USD').reduce((sum, tx) => sum + tx.amount, 0),
            totalVolumeSYP: transactions.filter(tx => tx.currency === 'SYP').reduce((sum, tx) => sum + tx.amount, 0),
            totalDeposits: transactions.filter(tx => tx.type === 'DEPOSIT').reduce((sum, tx) => sum + tx.amount, 0),
            totalWithdrawals: transactions.filter(tx => tx.type === 'WITHDRAW').reduce((sum, tx) => sum + tx.amount, 0),
            totalTransfers: transactions.filter(tx => tx.type === 'TRANSFER').reduce((sum, tx) => sum + tx.amount, 0),
            totalPayments: transactions.filter(tx => tx.type === 'QR_PAYMENT').reduce((sum, tx) => sum + tx.amount, 0),
            activeUsersCount: activeUsers.length,
        };

        return NextResponse.json(
            {
                transactions: transactions.map(tx => ({
                    id: tx.id,
                    referenceNumber: tx.referenceNumber,
                    type: tx.type,
                    amount: tx.amount,
                    currency: tx.currency,
                    fee: tx.fee,
                    status: tx.status,
                    senderName: tx.sender?.fullNameAr || tx.sender?.fullName || 'نظام',
                    receiverName: tx.receiver?.fullNameAr || tx.receiver?.fullName || 'نظام',
                    createdAt: tx.createdAt,
                })),
                activeUsers: activeUsers.map(u => ({
                    id: u.id,
                    name: u.fullNameAr || u.fullName,
                    phone: u.phone,
                    type: u.userType,
                    hasMerchantAccount: u.hasMerchantAccount,
                    lastActive: u.updatedAt,
                })),
                stats,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Monitor error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
