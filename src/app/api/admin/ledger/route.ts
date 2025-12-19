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

        // Get all transactions as ledger entries
        const transactions = await prisma.transaction.findMany({
            include: {
                sender: {
                    select: {
                        fullName: true,
                        userType: true,
                    },
                },
                receiver: {
                    select: {
                        fullName: true,
                        userType: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            // No limit - show all transactions
        });

        return NextResponse.json(
            {
                entries: transactions.map(tx => ({
                    id: tx.id,
                    entryNumber: tx.referenceNumber,
                    description: tx.descriptionAr || tx.description,
                    totalDebit: tx.amount,
                    totalCredit: tx.netAmount,
                    createdAt: tx.createdAt,
                    sender: tx.sender,
                    receiver: tx.receiver,
                    type: tx.type,
                    status: tx.status,
                    fee: tx.fee,
                    platformFee: tx.platformFee,
                    agentFee: tx.agentFee,
                })),
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get ledger error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
