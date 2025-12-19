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

        const agents = await prisma.agentProfile.findMany({
            where: {
                deletedAt: null,
            },
            include: {
                user: {
                    select: {
                        phone: true,
                        isActive: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(
            {
                agents: agents.map(agent => ({
                    id: agent.id,
                    agentCode: agent.agentCode,
                    businessName: agent.businessNameAr || agent.businessName,
                    phone: agent.user.phone,
                    currentCredit: agent.currentCredit,
                    cashCollected: agent.cashCollected,
                    totalDeposits: agent.totalDeposits,
                    totalWithdrawals: agent.totalWithdrawals,
                    isActive: agent.user.isActive,
                })),
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get agents error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
