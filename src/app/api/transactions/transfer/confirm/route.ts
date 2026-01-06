import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders } from '@/lib/auth/security';
import { verifyAuth, getAuthErrorMessage } from '@/lib/auth/verify-session';
import { verifyOTP, isOTPExpired } from '@/lib/otp/generator';
import { processTransfer } from '@/lib/ledger/ledger';
import { sendPushNotification } from '@/lib/firebase/admin';
import { z } from 'zod';

const confirmSchema = z.object({
    transferRequestId: z.string(),
    otp: z.string().length(6, 'OTP must be 6 digits'),
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
        const result = confirmSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { transferRequestId, otp } = result.data;

        // Find OTP record
        const otpRecord = await prisma.transferOTP.findUnique({
            where: { id: transferRequestId },
        });

        if (!otpRecord) {
            return NextResponse.json(
                { error: 'Transfer request not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Verify ownership
        if (otpRecord.userId !== payload.userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        // Check if already used
        if (otpRecord.isUsed) {
            return NextResponse.json(
                { error: 'OTP already used' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Check if expired
        if (isOTPExpired(otpRecord.expiresAt) || otpRecord.isExpired) {
            await prisma.transferOTP.update({
                where: { id: otpRecord.id },
                data: { isExpired: true },
            });
            return NextResponse.json(
                { error: 'OTP expired. Please request a new one' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Check max attempts
        if (otpRecord.attempts >= otpRecord.maxAttempts) {
            return NextResponse.json(
                { error: 'Maximum attempts exceeded. Please request a new OTP' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Verify OTP
        const isValid = await verifyOTP(otp, otpRecord.otpHash);

        if (!isValid) {
            // Increment attempts
            await prisma.transferOTP.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } },
            });

            const remainingAttempts = otpRecord.maxAttempts - (otpRecord.attempts + 1);
            return NextResponse.json(
                {
                    error: 'Invalid OTP',
                    remainingAttempts,
                },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // OTP is valid - Process the transfer with the stored currency
        const currency = (otpRecord.currency || 'USD') as 'USD' | 'SYP';
        const transferResult = await processTransfer(
            payload.userId,
            otpRecord.recipientId,
            otpRecord.amount,
            otpRecord.note ?? undefined,
            currency
        );

        if (!transferResult.success) {
            return NextResponse.json(
                { error: transferResult.error },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Mark OTP as used
        await prisma.transferOTP.update({
            where: { id: otpRecord.id },
            data: { isUsed: true },
        });

        // Get sender and recipient info
        const [sender, recipient] = await Promise.all([
            prisma.user.findUnique({ where: { id: payload.userId } }),
            prisma.user.findUnique({ where: { id: otpRecord.recipientId } }),
        ]);

        // Format amount with correct currency
        const symbol = currency === 'SYP' ? 'ل.س' : '$';
        const formattedAmount = currency === 'SYP'
            ? Math.floor(otpRecord.amount).toLocaleString('ar-SY')
            : otpRecord.amount.toFixed(2);

        // Create notifications
        await prisma.notification.createMany({
            data: [
                {
                    userId: payload.userId,
                    type: 'TRANSACTION',
                    title: 'Transfer Sent',
                    titleAr: 'تم إرسال التحويل',
                    message: `You sent ${formattedAmount} ${symbol} to ${recipient?.fullName}`,
                    messageAr: `أرسلت ${formattedAmount}${symbol} إلى ${recipient?.fullNameAr || recipient?.fullName}`,
                    metadata: JSON.stringify({ transactionId: transferResult.transactionId }),
                },
                {
                    userId: otpRecord.recipientId,
                    type: 'TRANSACTION',
                    title: 'Transfer Received',
                    titleAr: 'تم استلام تحويل',
                    message: `You received ${formattedAmount} ${symbol}`,
                    messageAr: `استلمت ${formattedAmount}${symbol}`,
                    metadata: JSON.stringify({ transactionId: transferResult.transactionId }),
                },
            ],
        });

        // Send Push Notifications
        if (sender?.fcmToken) {
            sendPushNotification(
                sender.fcmToken,
                '💸 تم إرسال التحويل',
                `أرسلت ${formattedAmount}${symbol} إلى ${recipient?.fullNameAr || recipient?.fullName}`,
                {
                    type: 'TRANSFER',
                    transactionId: transferResult.transactionId || '',
                    amount: otpRecord.amount.toString(),
                    currency
                }
            ).catch(err => console.error('Push send error:', err));
        }

        if (recipient?.fcmToken) {
            sendPushNotification(
                recipient.fcmToken,
                '💰 تحويل وارد!',
                `استلمت ${formattedAmount}${symbol} من ${sender?.fullNameAr || sender?.fullName || 'مستخدم'}`,
                {
                    type: 'TRANSFER',
                    transactionId: transferResult.transactionId || '',
                    amount: otpRecord.amount.toString(),
                    currency
                }
            ).catch(err => console.error('Push receive error:', err));
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: payload.userId,
                action: 'TRANSFER_COMPLETED',
                entity: 'Transaction',
                entityId: transferResult.transactionId,
                newValue: JSON.stringify({ amount: otpRecord.amount, recipientId: otpRecord.recipientId }),
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
            },
        });

        return NextResponse.json(
            {
                success: true,
                transactionId: transferResult.transactionId,
                referenceNumber: transferResult.referenceNumber,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Confirm transfer error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
