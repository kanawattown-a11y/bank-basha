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

        const merchants = await prisma.merchantProfile.findMany({
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
                merchants: merchants.map(merchant => ({
                    id: merchant.id,
                    merchantCode: merchant.merchantCode,
                    businessName: merchant.businessNameAr || merchant.businessName,
                    phone: merchant.user.phone,
                    totalSales: merchant.totalSales,
                    totalSalesSYP: merchant.totalSalesSYP || 0,
                    totalTransactions: merchant.totalTransactions,
                    isActive: merchant.user.isActive,
                })),
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get merchants error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
