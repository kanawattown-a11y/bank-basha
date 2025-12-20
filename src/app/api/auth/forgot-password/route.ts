import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders } from '@/lib/auth/security';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema
const forgotPasswordSchema = z.object({
    phone: z.string().min(9, 'رقم الهاتف غير صحيح'),
    message: z.string().optional(),
});

// Generate unique ticket number
function generateTicketNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PWD-${timestamp}${random}`;
}

// Generate reset token
function generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = forgotPasswordSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { phone, message } = result.data;

        // Find user by phone
        const user = await prisma.user.findFirst({
            where: {
                phone: phone,
                status: { not: 'DELETED' }
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'لم يتم العثور على حساب بهذا الرقم' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Check if there's already a pending password reset request
        const existingRequest = await prisma.passwordResetRequest.findFirst({
            where: {
                userId: user.id,
                status: 'PENDING',
                expiresAt: { gt: new Date() },
            },
        });

        if (existingRequest) {
            return NextResponse.json(
                {
                    error: 'يوجد طلب استعادة كلمة مرور معلق بالفعل',
                    ticketNumber: existingRequest.ticketNumber
                },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Generate reset token and ticket number
        const resetToken = generateResetToken();
        const ticketNumber = generateTicketNumber();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create password reset request
        const resetRequest = await prisma.passwordResetRequest.create({
            data: {
                userId: user.id,
                ticketNumber,
                token: resetToken,
                status: 'PENDING',
                message: message || 'طلب استعادة كلمة المرور',
                expiresAt,
            },
        });

        // Create a support ticket for admin to review
        const ticket = await prisma.ticket.create({
            data: {
                ticketNumber,
                userId: user.id,
                subject: `طلب استعادة كلمة المرور - ${user.fullName}`,
                description: `طلب استعادة كلمة المرور للمستخدم:
                
الاسم: ${user.fullName}
رقم الهاتف: ${user.phone}
البريد: ${user.email || 'غير محدد'}

ملاحظات المستخدم:
${message || 'لا يوجد'}

للموافقة على الطلب، قم بتفعيل رابط إعادة التعيين من لوحة التحكم.`,
                category: 'ACCOUNT_ISSUE',
                priority: 'HIGH',
                status: 'OPEN',
            },
        });

        return NextResponse.json(
            {
                success: true,
                ticketNumber,
                message: 'تم إرسال طلبك بنجاح. سيتم مراجعته من قبل فريق الدعم.',
            },
            { status: 201, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ في الخادم' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
