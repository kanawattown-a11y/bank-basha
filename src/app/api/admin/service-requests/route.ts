import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// GET - List pending service requests
export async function GET() {
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

        const services = await prisma.service.findMany({
            where: {
                sellerId: { not: null },
                deletedAt: null,
            },
            orderBy: [
                { status: 'asc' }, // PENDING first
                { createdAt: 'desc' },
            ],
            include: {
                seller: {
                    select: { id: true, fullName: true, fullNameAr: true, phone: true },
                },
                _count: {
                    select: { purchases: true },
                },
            },
        });

        return NextResponse.json(
            { services },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error fetching service requests:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// PUT - Approve or reject a service
export async function PUT(request: NextRequest) {
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

        const body = await request.json();
        const { serviceId, action, rejectionReason } = body;

        if (!serviceId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid request' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: { seller: true },
        });

        if (!service) {
            return NextResponse.json(
                { error: 'Service not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        if (action === 'approve') {
            await prisma.service.update({
                where: { id: serviceId },
                data: {
                    status: 'APPROVED',
                    isActive: true,
                    reviewedBy: payload.userId,
                    reviewedAt: new Date(),
                },
            });

            // Notify seller
            if (service.sellerId) {
                await prisma.notification.create({
                    data: {
                        userId: service.sellerId,
                        type: 'SYSTEM',
                        title: 'Service Approved',
                        titleAr: 'تمت الموافقة على خدمتك',
                        message: `Your service "${service.name}" has been approved!`,
                        messageAr: `تمت الموافقة على خدمتك "${service.nameAr || service.name}"! يمكن للآخرين الآن شراؤها`,
                    },
                });
            }

            return NextResponse.json(
                { success: true, message: 'Service approved' },
                { status: 200, headers: getSecurityHeaders() }
            );
        } else {
            await prisma.service.update({
                where: { id: serviceId },
                data: {
                    status: 'REJECTED',
                    rejectionReason: rejectionReason || 'لا يتوافق مع سياسة المنصة',
                    reviewedBy: payload.userId,
                    reviewedAt: new Date(),
                },
            });

            // Notify seller
            if (service.sellerId) {
                await prisma.notification.create({
                    data: {
                        userId: service.sellerId,
                        type: 'SYSTEM',
                        title: 'Service Rejected',
                        titleAr: 'تم رفض خدمتك',
                        message: `Your service "${service.name}" was rejected. Reason: ${rejectionReason || 'Policy violation'}`,
                        messageAr: `تم رفض خدمتك "${service.nameAr || service.name}". السبب: ${rejectionReason || 'لا يتوافق مع سياسة المنصة'}`,
                    },
                });
            }

            return NextResponse.json(
                { success: true, message: 'Service rejected' },
                { status: 200, headers: getSecurityHeaders() }
            );
        }
    } catch (error) {
        console.error('Error processing service request:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
