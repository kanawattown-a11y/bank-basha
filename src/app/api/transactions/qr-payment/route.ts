import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders, validateAmount, generateReferenceNumber } from '@/lib/auth/security';
import { verifyAuth, getAuthErrorMessage } from '@/lib/auth/verify-session';
import { sendPushNotification } from '@/lib/firebase/admin';
import { z } from 'zod';

const qrPaymentSchema = z.object({
    merchantCode: z.string().min(3, 'Invalid merchant code'),
    amount: z.number().positive('Amount must be positive'),
});

export async function POST(request: NextRequest) {
    try {
        // Full session verification (token + DB session + user status)
        const auth = await verifyAuth(request);

        if (!auth.success || !auth.payload) {
            return NextResponse.json(
                { error: getAuthErrorMessage(auth.error || 'INVALID_TOKEN', 'ar') },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const payload = auth.payload;

        const body = await request.json();
        const result = qrPaymentSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { merchantCode, amount } = result.data;

        if (!validateAmount(amount)) {
            return NextResponse.json(
                { error: 'Invalid amount' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Find merchant
        const merchantProfile = await prisma.merchantProfile.findUnique({
            where: { merchantCode },
            include: { user: true },
        });

        if (!merchantProfile || !merchantProfile.isActive) {
            return NextResponse.json(
                { error: 'Merchant not found or inactive' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Get sender wallet and user
        const sender = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { wallet: true },
        });

        if (!sender?.wallet || sender.wallet.balance < amount) {
            return NextResponse.json(
                { error: 'Insufficient balance' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }
        // Calculate fees from system settings
        const { calculateCommission } = await import('@/lib/ledger/ledger');
        const { platformFee, totalFee, netAmount } = await calculateCommission(amount, 'QR_PAYMENT');

        // Check if sender has enough for amount + fee
        if (sender.wallet.balance < amount + totalFee) {
            return NextResponse.json(
                { error: `رصيد غير كافٍ. المطلوب: $${(amount + totalFee).toFixed(2)}` },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Process payment in a transaction
        const referenceNumber = generateReferenceNumber('QRP');

        const transaction = await prisma.$transaction(async (tx) => {
            // Deduct from sender (amount + fee)
            await tx.wallet.update({
                where: { userId: payload.userId },
                data: { balance: { decrement: amount + totalFee } },
            });

            // Add to merchant (full amount - merchant gets 100%)
            await tx.wallet.update({
                where: { userId: merchantProfile.userId },
                data: { balance: { increment: amount } },
            });

            // Update merchant stats
            await tx.merchantProfile.update({
                where: { id: merchantProfile.id },
                data: {
                    totalSales: { increment: amount },
                    totalTransactions: { increment: 1 },
                },
            });

            // Create transaction record
            const newTransaction = await tx.transaction.create({
                data: {
                    referenceNumber,
                    type: 'QR_PAYMENT',
                    status: 'COMPLETED',
                    senderId: payload.userId,
                    receiverId: merchantProfile.userId,
                    amount,
                    fee: totalFee,
                    platformFee,
                    agentFee: 0,
                    netAmount: amount, // Merchant receives full amount
                    description: `Payment to ${merchantProfile.businessName}`,
                    descriptionAr: `دفع إلى ${merchantProfile.businessNameAr || merchantProfile.businessName}`,
                    completedAt: new Date(),
                },
            });

            return newTransaction;
        });

        // Create database notifications
        await prisma.notification.createMany({
            data: [
                {
                    userId: payload.userId,
                    type: 'TRANSACTION',
                    title: 'Payment Sent',
                    titleAr: 'تم الدفع',
                    message: `You paid ${amount} $ to ${merchantProfile.businessName}`,
                    messageAr: `دفعت ${amount} $ إلى ${merchantProfile.businessNameAr || merchantProfile.businessName}`,
                },
                {
                    userId: merchantProfile.userId,
                    type: 'TRANSACTION',
                    title: 'Payment Received',
                    titleAr: 'تم استلام دفعة',
                    message: `You received ${amount} $`,
                    messageAr: `استلمت ${amount} $`,
                },
            ],
        });

        // Send Firebase Push Notifications
        // Push to payer (you paid)
        if (sender.fcmToken) {
            sendPushNotification(
                sender.fcmToken,
                '💳 تم الدفع بنجاح',
                `دفعت $${amount.toFixed(2)} إلى ${merchantProfile.businessNameAr || merchantProfile.businessName}`,
                { type: 'PAYMENT_SENT', amount: amount.toString() }
            ).catch(err => console.error('Push payer error:', err));
        }

        // Push to merchant (you received payment)
        if (merchantProfile.user.fcmToken) {
            sendPushNotification(
                merchantProfile.user.fcmToken,
                '💰 دفعة جديدة!',
                `استلمت $${amount.toFixed(2)} من ${sender.fullNameAr || sender.fullName}`,
                { type: 'PAYMENT_RECEIVED', amount: amount.toString() }
            ).catch(err => console.error('Push merchant error:', err));
        }

        return NextResponse.json(
            {
                success: true,
                transactionId: transaction.id,
                referenceNumber,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('QR Payment error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
