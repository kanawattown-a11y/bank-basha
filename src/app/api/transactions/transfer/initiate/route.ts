import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, validateAmount, sanitizePhoneNumber } from '@/lib/auth/security';
import { generateOTP, hashOTP, getOTPExpiry } from '@/lib/otp/generator';
import { sendPushNotification } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { z } from 'zod';

const initiateSchema = z.object({
    recipientPhone: z.string().min(9, 'Invalid phone number'),
    amount: z.number().positive('Amount must be positive'),
    note: z.string().max(200).optional(),
});

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
                { error: 'Invalid token' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const result = initiateSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { recipientPhone, amount, note } = result.data;

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

        if (recipient.userType === 'AGENT') {
            return NextResponse.json(
                { error: 'Cannot transfer to agents' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Check balance
        const senderWallet = await prisma.wallet.findUnique({
            where: { userId: payload.userId },
        });

        if (!senderWallet || senderWallet.balance < amount) {
            return NextResponse.json(
                { error: 'Insufficient balance' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Check transaction risk and limits
        const { checkTransactionRisk } = await import('@/lib/financial/risk-engine');
        const riskCheck = await checkTransactionRisk({
            userId: payload.userId,
            amount,
            type: 'TRANSFER',
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        });

        if (!riskCheck.passed) {
            const limitAlert = riskCheck.alerts.find(a => a.type === 'LIMIT_EXCEEDED');
            if (limitAlert) {
                return NextResponse.json(
                    { error: limitAlert.reasonAr || limitAlert.reason },
                    { status: 400, headers: getSecurityHeaders() }
                );
            }
        }

        // Generate OTP
        const otp = generateOTP();
        const otpHash = await hashOTP(otp);
        const expiresAt = getOTPExpiry(5); // 5 minutes

        // Delete any existing unused OTPs for this user
        await prisma.transferOTP.deleteMany({
            where: {
                userId: payload.userId,
                isUsed: false,
            },
        });

        // Create OTP record
        const otpRecord = await prisma.transferOTP.create({
            data: {
                userId: payload.userId,
                otpHash,
                amount,
                recipientId: recipient.id,
                note,
                expiresAt,
            },
        });

        // Get sender info for push notification
        const sender = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        // Send OTP via Push Notification
        if (sender?.fcmToken) {
            // OTP sent via push notification - not logged for security
            await sendPushNotification(
                sender.fcmToken,
                '🔐 رمز تأكيد التحويل',
                `رمز التأكيد: ${otp}\nصالح لمدة 5 دقائق`,
                {
                    type: 'TRANSFER_OTP',
                    otp,
                    amount: amount.toString(),
                    recipientName: recipient.fullNameAr || recipient.fullName,
                }
            );
        }
        // If no FCM token, OTP is stored in DB - user can request resend

        return NextResponse.json(
            {
                success: true,
                transferRequestId: otpRecord.id,
                expiresIn: 300, // 5 minutes in seconds
                recipient: {
                    name: recipient.fullNameAr || recipient.fullName,
                    phone: recipient.phone,
                },
                // Development only - remove in production
                __dev_otp: process.env.NODE_ENV === 'development' ? otp : undefined,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Initiate transfer error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
