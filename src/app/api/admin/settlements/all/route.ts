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

        const settlements = await prisma.settlement.findMany({
            include: {
                agent: {
                    select: {
                        agentCode: true,
                        businessName: true,
                        businessNameAr: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(
            {
                settlements: settlements.map(s => ({
                    id: s.id,
                    settlementNumber: s.settlementNumber,
                    agentCode: s.agent.agentCode,
                    businessName: s.agent.businessNameAr || s.agent.businessName,
                    cashCollected: s.cashCollected,
                    amountDue: s.amountDue,
                    status: s.status,
                    createdAt: s.createdAt,
                })),
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get settlements error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
