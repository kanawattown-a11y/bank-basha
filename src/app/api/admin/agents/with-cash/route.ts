import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// GET: Get agents with sufficient cash for distribution
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

        // Get minimum amount from query params
        const { searchParams } = new URL(request.url);
        const minAmount = parseFloat(searchParams.get('minAmount') || '0');

        // Find agents with cash >= minAmount
        const agents = await prisma.agentProfile.findMany({
            where: {
                isActive: true,
                cashCollected: {
                    gte: minAmount,
                },
            },
            select: {
                id: true,
                agentCode: true,
                businessName: true,
                businessNameAr: true,
                cashCollected: true,
                currentCredit: true,
            },
            orderBy: {
                cashCollected: 'desc',
            },
            take: 20,
        });

        return NextResponse.json(
            { agents },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get agents with cash error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
