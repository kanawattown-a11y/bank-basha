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

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const where: any = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }

        const requests = await prisma.passwordResetRequest.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        email: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(
            { requests },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get password requests error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
