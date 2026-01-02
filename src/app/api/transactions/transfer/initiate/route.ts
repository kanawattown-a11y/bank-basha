import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders, validateAmount, sanitizePhoneNumber } from '@/lib/auth/security';
import { verifyAuth, getAuthErrorMessage } from '@/lib/auth/verify-session';
import { generateOTP, hashOTP, getOTPExpiry } from '@/lib/otp/generator';
import { sendPushNotification } from '@/lib/firebase/admin';
import { getUserWallet, type Currency, isValidCurrency, formatCurrency } from '@/lib/wallet/currency';
import { z } from 'zod';

const initiateSchema = z.object({
    recipientPhone: z.string().min(9, 'Invalid phone number'),
    amount: z.number().positive('Amount must be positive'),
    currency: z.enum(['USD', 'SYP']).default('USD'),
    note: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
    try {
        // Full session verification (token + DB session + user status)
        const auth = await verifyAuth(request);

        if (!auth.success || !auth.user) {
            return NextResponse.json(
                { error: getAuthErrorMessage(auth.error || 'INVALID_TOKEN', 'ar') },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const userId = auth.user.id;

        const body = await request.json();
        const result = initiateSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { recipientPhone, amount, currency, note } = result.data;

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

        // Check sender's balance for the selected currency
        const senderWallet = await getUserWallet(userId, currency as Currency, 'PERSONAL');

        if (!senderWallet || senderWallet.balance < amount) {
            const currencyName = currency === 'SYP' ? 'الليرة السورية' : 'الدولار';
            return NextResponse.json(
                { error: `رصيدك غير كافي بـ${currencyName}` },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Check if recipient has a wallet for this currency
        const recipientWallet = await getUserWallet(recipient.id, currency as Currency, 'PERSONAL');
        if (!recipientWallet) {
            return NextResponse.json(
                { error: 'المستلم ليس لديه محفظة بهذه العملة' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Check transaction risk and limits
        const { checkTransactionRisk } = await import('@/lib/financial/risk-engine');
        const riskCheck = await checkTransactionRisk({
            userId: userId,
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
                userId: userId,
                isUsed: false,
            },
        });

        // Create OTP record
        const otpRecord = await prisma.transferOTP.create({
            data: {
                userId: userId,
                otpHash,
                amount,
                currency, // USD or SYP
                recipientId: recipient.id,
                note,
                expiresAt,
            },
        });

        // Get sender info for push notification
        const sender = await prisma.user.findUnique({
            where: { id: userId },
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
