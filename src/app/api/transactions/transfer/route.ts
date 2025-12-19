import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, validateAmount, sanitizePhoneNumber } from '@/lib/auth/security';
import { processTransfer } from '@/lib/ledger/ledger';
import { sendTransactionEmail } from '@/lib/email/email';
import { sendPushNotification } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { z } from 'zod';

const transferSchema = z.object({
    recipientPhone: z.string().min(9, 'Invalid phone number'),
    amount: z.number().positive('Amount must be positive'),
    note: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
    // ═══════════════════════════════════════════════════════════════
    // DEPRECATED: This API is disabled for security reasons.
    // Use /api/transactions/transfer/initiate and /confirm instead.
    // ═══════════════════════════════════════════════════════════════
    return NextResponse.json(
        {
            error: 'يرجى استخدام نظام OTP للتحويل. هذا الـ API معطّل.',
            redirect: '/dashboard/transfer'
        },
        { status: 400, headers: getSecurityHeaders() }
    );

    /* Original code disabled for security - OTP is now required
    try {
        // Get current user
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
    
        const body = await request.json();
    
        // Validate input
        const result = transferSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }
    
        const { recipientPhone, amount, note } = result.data;
    
        // Validate amount
        if (!validateAmount(amount)) {
            return NextResponse.json(
                { error: 'Invalid amount' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }
    
        // Find recipient
        const sanitizedPhone = sanitizePhoneNumber(recipientPhone);
        const recipient = await prisma.user.findUnique({
            where: { phone: sanitizedPhone },
        });
    
        if (!recipient) {
            return NextResponse.json(
                { error: 'Recipient not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }
    
        // Block transfers to agents (agents are like ATMs, cannot receive transfers)
        if (recipient.userType === 'AGENT') {
            return NextResponse.json(
                { error: 'Cannot transfer to agents. Please use deposit/withdrawal services.' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }
    
        // Check transaction risk and limits
        const { checkTransactionRisk, createRiskAlert, holdTransaction } = await import('@/lib/financial/risk-engine');
    
        const riskCheck = await checkTransactionRisk({
            userId: payload.userId,
            amount,
            type: 'TRANSFER',
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        });
    
        // If risk check fails (e.g., daily limit exceeded), return error
        if (!riskCheck.passed) {
            const limitAlert = riskCheck.alerts.find(a => a.type === 'LIMIT_EXCEEDED');
            if (limitAlert) {
                return NextResponse.json(
                    { error: limitAlert.reasonAr || limitAlert.reason },
                    { status: 400, headers: getSecurityHeaders() }
                );
            }
        }
    
        // Process transfer
        const transferResult = await processTransfer(
            payload.userId,
            recipient.id,
            amount,
            note
        );
    
        if (!transferResult.success) {
            return NextResponse.json(
                { error: transferResult.error },
                { status: 400, headers: getSecurityHeaders() }
            );
        }
    
        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: payload.userId,
                action: 'TRANSFER_COMPLETED',
                entity: 'Transaction',
                entityId: transferResult.transactionId,
                newValue: JSON.stringify({ amount, recipientPhone: sanitizedPhone }),
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
            },
        });
    
        // Create notifications
        await prisma.notification.createMany({
            data: [
                {
                    userId: payload.userId,
                    type: 'TRANSACTION',
                    title: 'Transfer Sent',
                    titleAr: 'تم إرسال التحويل',
                    message: `You sent ${amount} $ to ${recipient.fullName}`,
                    messageAr: `أرسلت ${amount} $ إلى ${recipient.fullNameAr || recipient.fullName}`,
                    metadata: JSON.stringify({ transactionId: transferResult.transactionId }),
                },
                {
                    userId: recipient.id,
                    type: 'TRANSACTION',
                    title: 'Transfer Received',
                    titleAr: 'تم استلام تحويل',
                    message: `You received ${amount} $`,
                    messageAr: `استلمت ${amount} $`,
                    metadata: JSON.stringify({ transactionId: transferResult.transactionId }),
                },
            ],
        });
    
        // Send Firebase Push Notifications
        const sender = await prisma.user.findUnique({ where: { id: payload.userId } });
    
        // Push to sender (you sent)
        if (sender?.fcmToken) {
            sendPushNotification(
                sender.fcmToken,
                '💸 تم إرسال التحويل',
                `أرسلت $${amount.toFixed(2)} إلى ${recipient.fullNameAr || recipient.fullName}`,
                { type: 'TRANSFER_SENT', amount: amount.toString() }
            ).catch(err => console.error('Push send error:', err));
        }
    
        // Push to recipient (you received)
        if (recipient.fcmToken) {
            sendPushNotification(
                recipient.fcmToken,
                '💰 تحويل وارد!',
                `استلمت $${amount.toFixed(2)} من ${sender?.fullNameAr || sender?.fullName || 'مستخدم'}`,
                { type: 'TRANSFER_RECEIVED', amount: amount.toString() }
            ).catch(err => console.error('Push receive error:', err));
        }
    
        // Email to sender
        if (sender?.email) {
            const senderWallet = await prisma.wallet.findUnique({ where: { userId: sender.id } });
            await sendTransactionEmail({
                to: sender.email,
                userName: sender.fullNameAr || sender.fullName,
                transactionType: 'TRANSFER',
                amount,
                referenceNumber: transferResult.referenceNumber || '',
                status: 'COMPLETED',
                date: new Date(),
                recipientName: recipient.fullNameAr || recipient.fullName,
                balance: senderWallet?.balance || 0,
            }).catch(err => console.error('Email send error:', err));
        }
    
        // Email to recipient
        if (recipient.email) {
            const recipientWallet = await prisma.wallet.findUnique({ where: { userId: recipient.id } });
            await sendTransactionEmail({
                to: recipient.email,
                userName: recipient.fullNameAr || recipient.fullName,
                transactionType: 'TRANSFER',
                amount,
                referenceNumber: transferResult.referenceNumber || '',
                status: 'COMPLETED',
                date: new Date(),
                recipientName: sender?.fullNameAr || sender?.fullName || 'مستخدم',
                balance: recipientWallet?.balance || 0,
            }).catch(err => console.error('Email send error:', err));
        }
    
        return NextResponse.json(
            {
                success: true,
                transactionId: transferResult.transactionId,
                referenceNumber: transferResult.referenceNumber,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Transfer error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
    */ // End of disabled original code
}
