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
                { error: 'Agent access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        // Get transactions where user is the agent
        const transactions = await prisma.transaction.findMany({
            where: {
                agentId: payload.userId,
                type: { in: ['DEPOSIT', 'WITHDRAW'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                sender: { select: { fullName: true, fullNameAr: true } },
                receiver: { select: { fullName: true, fullNameAr: true } },
            },
        });

        return NextResponse.json(
            {
                transactions: transactions.map(tx => ({
                    id: tx.id,
                    referenceNumber: tx.referenceNumber,
                    type: tx.type,
                    amount: tx.amount,
                    fee: tx.fee,
                    agentFee: tx.agentFee,
                    platformFee: tx.platformFee,
                    description: tx.description,
                    status: tx.status,
                    customerName: tx.type === 'DEPOSIT'
                        ? (tx.receiver?.fullNameAr || tx.receiver?.fullName || 'عميل')
                        : (tx.sender?.fullNameAr || tx.sender?.fullName || 'عميل'),
                    senderName: tx.sender?.fullNameAr || tx.sender?.fullName,
                    receiverName: tx.receiver?.fullNameAr || tx.receiver?.fullName,
                    createdAt: tx.createdAt,
                })),
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Agent transactions error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
