import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const rejectSchema = z.object({
    notes: z.string().min(1, 'سبب الرفض مطلوب'),
});

// POST - Reject an order and refund
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
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
        if (!payload) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const { id } = await params;
        const body = await request.json();

        const result = rejectSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { notes } = result.data;

        // Get the order
        const order = await prisma.servicePurchase.findUnique({
            where: { id },
            include: {
                service: true,
                user: true,
            },
        });

        if (!order) {
            return NextResponse.json(
                { error: 'الطلب غير موجود' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Verify this merchant owns the service
        if (order.service.sellerId !== payload.userId) {
            return NextResponse.json(
                { error: 'غير مصرح' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        // Check if already processed
        if (order.sellerResponse !== 'PENDING') {
            return NextResponse.json(
                { error: 'تم معالجة هذا الطلب مسبقاً' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Reject and refund
        await prisma.$transaction(async (tx) => {
            // Update order status
            await tx.servicePurchase.update({
                where: { id },
                data: {
                    status: 'REFUNDED',
                    sellerResponse: 'REJECTED',
                    sellerNotes: notes,
                    processedBy: payload.userId,
                    processedAt: new Date(),
                    refundedAt: new Date(),
                },
            });

            // Refund to buyer wallet
            await tx.wallet.update({
                where: { userId: order.userId },
                data: { balance: { increment: order.totalAmount } },
            });
        });

        // Notify buyer
        await prisma.notification.create({
            data: {
                userId: order.userId,
                type: 'SERVICE',
                title: '❌ تم رفض طلبك',
                titleAr: '❌ تم رفض طلبك',
                message: `تم إرجاع $${order.totalAmount} إلى محفظتك. السبب: ${notes}`,
                messageAr: `تم إرجاع $${order.totalAmount} إلى محفظتك. السبب: ${notes}`,
            },
        });

        return NextResponse.json(
            { success: true, message: 'تم رفض الطلب وإرجاع المبلغ للزبون' },
            { headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error rejecting order:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
