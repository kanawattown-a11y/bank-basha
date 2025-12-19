import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const transactionId = params.id;

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                sender: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        userType: true,
                        hasMerchantAccount: true,
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        userType: true,
                        hasMerchantAccount: true,
                    },
                },
            },
        });

        if (!transaction) {
            return NextResponse.json(
                { error: 'Transaction not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        return NextResponse.json(
            { transaction },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get transaction error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
