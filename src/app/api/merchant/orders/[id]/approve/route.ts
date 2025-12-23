import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const approveSchema = z.object({
    notes: z.string().optional(),
});

// POST - Approve an order
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
        const body = await request.json().catch(() => ({}));
        const { notes } = approveSchema.parse(body);

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

        // Approve the order
        await prisma.$transaction(async (tx) => {
            // Update order status
            await tx.servicePurchase.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    sellerResponse: 'APPROVED',
                    sellerNotes: notes,
                    processedBy: payload.userId,
                    processedAt: new Date(),
                },
            });

            // Update the linked Transaction status as well
            if (order.transactionId) {
                await tx.transaction.update({
                    where: { id: order.transactionId },
                    data: {
                        status: 'COMPLETED',
                        completedAt: new Date(),
                    },
                });
            }

            // Transfer amount to merchant wallet
            await tx.wallet.update({
                where: { userId: payload.userId },
                data: { balance: { increment: order.amount } },
            });
        });

        // Notify buyer
        await prisma.notification.create({
            data: {
                userId: order.userId,
                type: 'SERVICE',
                title: '✅ تمت الموافقة على طلبك',
                titleAr: '✅ تمت الموافقة على طلبك',
                message: `تم تعبئة الرصيد للرقم ${order.phoneNumber}`,
                messageAr: `تم تعبئة الرصيد للرقم ${order.phoneNumber}`,
            },
        });

        return NextResponse.json(
            { success: true, message: 'تمت الموافقة على الطلب بنجاح' },
            { headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error approving order:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
