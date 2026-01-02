import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// GET - List orders for my services (as seller)
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
        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        // Get all services owned by this user
        const myServices = await prisma.service.findMany({
            where: { sellerId: payload.userId },
            select: { id: true },
        });

        const serviceIds = myServices.map(s => s.id);

        if (serviceIds.length === 0) {
            return NextResponse.json(
                { orders: [], stats: { pending: 0, completed: 0, total: 0 } },
                { status: 200, headers: getSecurityHeaders() }
            );
        }

        // Get all purchases for my services
        const orders = await prisma.servicePurchase.findMany({
            where: { serviceId: { in: serviceIds } },
            orderBy: { createdAt: 'desc' },
            include: {
                service: {
                    select: { id: true, name: true, nameAr: true, price: true }
                },
                user: {
                    select: { id: true, fullName: true, fullNameAr: true, phone: true }
                },
            },
        });

        // Calculate stats
        const stats = {
            pending: orders.filter(o => o.status === 'PENDING').length,
            completed: orders.filter(o => o.status === 'COMPLETED').length,
            cancelled: orders.filter(o => o.status === 'CANCELLED').length,
            total: orders.length,
            totalEarnings: orders
                .filter(o => o.status === 'COMPLETED')
                .reduce((sum, o) => sum + (o.netAmount || 0), 0),
        };

        return NextResponse.json(
            { orders, stats },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error fetching seller orders:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST - Respond to an order (complete/cancel)
export async function POST(request: NextRequest) {
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
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const { orderId, action, response } = body;

        if (!orderId || !action || !['complete', 'cancel'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid request' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Find the order
        const order = await prisma.servicePurchase.findUnique({
            where: { id: orderId },
            include: {
                service: { include: { seller: true } },
                user: true,
            },
        });

        if (!order) {
            return NextResponse.json(
                { error: 'الطلب غير موجود' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Verify ownership
        if (order.service.sellerId !== payload.userId) {
            return NextResponse.json(
                { error: 'غير مصرح' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        if (order.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'الطلب تمت معالجته مسبقاً' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        if (action === 'complete') {
            // Complete order and transfer money to seller
            await prisma.$transaction(async (tx) => {
                // Update order status
                await tx.servicePurchase.update({
                    where: { id: orderId },
                    data: {
                        status: 'COMPLETED',
                        sellerResponse: response || 'تم التنفيذ',
                    },
                });

                // Get currency from linked transaction
                let orderCurrency = 'USD';
                if (order.transactionId) {
                    const linkedTransaction = await tx.transaction.findUnique({
                        where: { id: order.transactionId },
                    });
                    if (linkedTransaction?.currency) {
                        orderCurrency = linkedTransaction.currency;
                    }

                    // Update the linked Transaction status
                    await tx.transaction.update({
                        where: { id: order.transactionId },
                        data: {
                            status: 'COMPLETED',
                            completedAt: new Date(),
                        },
                    });
                }

                // Add to seller wallet (using order currency)
                const sellerWallet = await tx.wallet.findFirst({
                    where: { userId: payload.userId, walletType: 'BUSINESS', currency: orderCurrency },
                });

                if (sellerWallet) {
                    await tx.wallet.update({
                        where: { id: sellerWallet.id },
                        data: { balance: { increment: order.netAmount || order.amount } },
                    });
                }

                // Notify buyer
                await tx.notification.create({
                    data: {
                        userId: order.userId,
                        type: 'SERVICE',
                        title: '✅ تم تنفيذ طلبك',
                        titleAr: '✅ تم تنفيذ طلبك',
                        message: `طلبك ${order.service.nameAr || order.service.name} تم تنفيذه`,
                        messageAr: `طلبك ${order.service.nameAr || order.service.name} تم تنفيذه`,
                        metadata: JSON.stringify({ purchaseId: order.id }),
                    },
                });
            });

            // Send push notification to buyer
            if (order.user?.fcmToken) {
                const { sendPushNotification } = await import('@/lib/firebase/admin');
                await sendPushNotification(
                    order.user.fcmToken,
                    '✅ تم تنفيذ طلبك',
                    `طلبك ${order.service.nameAr || order.service.name} تم تنفيذه`,
                    { type: 'SERVICE_COMPLETED', purchaseId: order.id }
                ).catch(err => console.error('Push buyer error:', err));
            }

            return NextResponse.json(
                { success: true, message: 'تم تنفيذ الطلب بنجاح' },
                { status: 200, headers: getSecurityHeaders() }
            );
        } else {
            // Cancel order and refund buyer
            await prisma.$transaction(async (tx) => {
                // Update order status
                await tx.servicePurchase.update({
                    where: { id: orderId },
                    data: {
                        status: 'CANCELLED',
                        sellerResponse: response || 'تم الإلغاء',
                    },
                });

                // Get currency from linked transaction
                let orderCurrency = 'USD';
                if (order.transactionId) {
                    const linkedTransaction = await tx.transaction.findUnique({
                        where: { id: order.transactionId },
                    });
                    if (linkedTransaction?.currency) {
                        orderCurrency = linkedTransaction.currency;
                    }

                    // Update the linked Transaction status
                    await tx.transaction.update({
                        where: { id: order.transactionId },
                        data: {
                            status: 'CANCELLED',
                            completedAt: new Date(),
                        },
                    });
                }

                // Refund buyer wallet (using order currency)
                const buyerWallet = await tx.wallet.findFirst({
                    where: { userId: order.userId, walletType: 'PERSONAL', currency: orderCurrency },
                });

                if (buyerWallet) {
                    await tx.wallet.update({
                        where: { id: buyerWallet.id },
                        data: { balance: { increment: order.totalAmount } },
                    });
                }

                // Notify buyer
                await tx.notification.create({
                    data: {
                        userId: order.userId,
                        type: 'SERVICE',
                        title: '❌ تم إلغاء طلبك',
                        titleAr: '❌ تم إلغاء طلبك',
                        message: `تم إلغاء طلبك وإعادة المبلغ لمحفظتك`,
                        messageAr: `تم إلغاء طلبك وإعادة المبلغ لمحفظتك`,
                        metadata: JSON.stringify({ purchaseId: order.id }),
                    },
                });
            });

            // Send push notification to buyer
            if (order.user?.fcmToken) {
                const { sendPushNotification } = await import('@/lib/firebase/admin');
                await sendPushNotification(
                    order.user.fcmToken,
                    '❌ تم إلغاء طلبك',
                    `تم إلغاء طلبك وإعادة المبلغ لمحفظتك`,
                    { type: 'SERVICE_CANCELLED', purchaseId: order.id }
                ).catch(err => console.error('Push buyer error:', err));
            }

            return NextResponse.json(
                { success: true, message: 'تم إلغاء الطلب وإعادة المبلغ للمشتري' },
                { status: 200, headers: getSecurityHeaders() }
            );
        }
    } catch (error) {
        console.error('Error responding to order:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
