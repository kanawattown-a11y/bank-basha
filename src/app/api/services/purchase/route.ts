import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, generateReferenceNumber } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const purchaseSchema = z.object({
    serviceId: z.string(),
    phoneNumber: z.string().min(9, 'رقم الهاتف مطلوب'),
    amount: z.number().positive().optional(),
    userInput: z.string().optional(),
});

// POST - Purchase a service (with seller approval)
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
        const result = purchaseSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { serviceId, phoneNumber, amount: customAmount, userInput } = result.data;

        // Get service
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: { seller: true },
        });

        if (!service || !service.isActive || service.status !== 'APPROVED') {
            return NextResponse.json(
                { error: 'الخدمة غير متوفرة' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Use custom amount or service price
        const amount = customAmount || service.price;

        // Calculate fees
        const { calculateCommission } = await import('@/lib/ledger/ledger');
        const commission = await calculateCommission(amount, 'SERVICE_PURCHASE');

        // Total logic:
        // We assume Input Amount is the gross amount deducted from user wallet.
        // Provider gets Net Amount (Amount - Fee).

        const totalDeducted = amount;

        // Get user wallet
        const wallet = await prisma.wallet.findUnique({
            where: { userId: payload.userId },
        });

        if (!wallet) {
            return NextResponse.json(
                { error: 'المحفظة غير موجودة' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Check balance
        if (wallet.balance < totalDeducted) {
            return NextResponse.json(
                { error: `رصيد غير كافي. المطلوب: $${totalDeducted.toFixed(2)}` },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const referenceNumber = generateReferenceNumber('SVC');

        // Determine if this needs seller approval
        const needsApproval = !!service.sellerId;

        // Create purchase and deduct balance in transaction
        const purchase = await prisma.$transaction(async (tx) => {
            // Deduct from wallet
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: totalDeducted } },
            });

            // Create purchase record
            const newPurchase = await tx.servicePurchase.create({
                data: {
                    serviceId: service.id,
                    userId: payload.userId,
                    amount: commission.netAmount, // Provider gets net
                    fee: commission.totalFee,     // Fee
                    totalAmount: amount,          // User paid this
                    platformFee: commission.platformFee,
                    agentFee: commission.agentFee,
                    netAmount: commission.netAmount,
                    status: needsApproval ? 'PENDING' : 'COMPLETED',
                    sellerResponse: needsApproval ? 'PENDING' : null,
                    referenceNumber,
                    phoneNumber,
                    userInput: userInput || JSON.stringify({ phoneNumber }),
                },
            });

            return newPurchase;
        });

        // Create notifications
        if (service.sellerId) {
            // Database Notification for Seller
            await prisma.notification.create({
                data: {
                    userId: service.sellerId,
                    type: 'SERVICE',
                    title: '📦 طلب خدمة جديد',
                    titleAr: '📦 طلب خدمة جديد',
                    message: `طلب تعبئة $${amount} للرقم ${phoneNumber}`,
                    messageAr: `طلب تعبئة $${amount} للرقم ${phoneNumber}`,
                    metadata: JSON.stringify({ purchaseId: purchase.id }),
                },
            });

            // Push Notification for Seller
            if (service.seller?.fcmToken) {
                const { sendPushNotification } = await import('@/lib/firebase/admin');
                await sendPushNotification(
                    service.seller.fcmToken,
                    '📦 طلب خدمة جديد',
                    `طلب تعبئة $${amount} للرقم ${phoneNumber}`,
                    { type: 'SERVICE_ORDER', purchaseId: purchase.id }
                ).catch(err => console.error('Push seller error:', err));
            }
        }

        // Notify buyer
        await prisma.notification.create({
            data: {
                userId: payload.userId,
                type: 'SERVICE',
                title: needsApproval ? '⏳ تم إرسال طلبك' : '✅ تم شراء الخدمة',
                titleAr: needsApproval ? '⏳ تم إرسال طلبك' : '✅ تم شراء الخدمة',
                message: needsApproval
                    ? `طلب تعبئة $${amount} قيد الانتظار`
                    : `تم شراء ${service.nameAr || service.name} بنجاح`,
                messageAr: needsApproval
                    ? `طلب تعبئة $${amount} قيد الانتظار`
                    : `تم شراء ${service.nameAr || service.name} بنجاح`,
                metadata: JSON.stringify({ purchaseId: purchase.id }),
            },
        });

        return NextResponse.json(
            {
                success: true,
                purchase: {
                    id: purchase.id,
                    referenceNumber,
                    status: purchase.status,
                    amount,
                    phoneNumber,
                },
                message: needsApproval
                    ? 'تم إرسال طلبك للتاجر. سيتم إعلامك عند المعالجة.'
                    : 'تم شراء الخدمة بنجاح',
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid data', details: error.errors },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        console.error('Error purchasing service:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
