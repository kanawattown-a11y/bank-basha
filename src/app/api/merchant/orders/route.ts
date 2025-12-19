import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// GET - Get all pending orders for merchant
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
                { error: 'Invalid token' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        // Get URL params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'PENDING';

        // Get all services owned by this merchant
        const merchantServices = await prisma.service.findMany({
            where: {
                sellerId: payload.userId,
                deletedAt: null,
            },
            select: { id: true },
        });

        const serviceIds = merchantServices.map(s => s.id);

        if (serviceIds.length === 0) {
            return NextResponse.json({ orders: [] }, { headers: getSecurityHeaders() });
        }

        // Get orders for these services
        const orders = await prisma.servicePurchase.findMany({
            where: {
                serviceId: { in: serviceIds },
                ...(status !== 'ALL' ? { sellerResponse: status } : {}),
            },
            include: {
                service: {
                    select: { name: true, nameAr: true, imageUrl: true },
                },
                user: {
                    select: { fullName: true, fullNameAr: true, phone: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(
            { orders },
            { headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error fetching merchant orders:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
