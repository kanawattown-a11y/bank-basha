import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders, hashPassword } from '@/lib/auth/security';
import { z } from 'zod';

// Validation schema for reset password
const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

// GET - Verify token
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json(
                { valid: false, error: 'الرابط غير صالح' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Find password reset request
        const resetRequest = await prisma.passwordResetRequest.findFirst({
            where: {
                token,
                status: 'APPROVED',
                expiresAt: { gt: new Date() },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });

        if (!resetRequest) {
            return NextResponse.json(
                { valid: false, error: 'الرابط غير صالح أو منتهي الصلاحية' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        return NextResponse.json(
            {
                valid: true,
                user: {
                    name: resetRequest.user.fullName,
                    phone: resetRequest.user.phone,
                },
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Verify reset token error:', error);
        return NextResponse.json(
            { valid: false, error: 'حدث خطأ في الخادم' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST - Reset password
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = resetPasswordSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { token, password } = result.data;

        // Find and validate password reset request
        const resetRequest = await prisma.passwordResetRequest.findFirst({
            where: {
                token,
                status: 'APPROVED',
                expiresAt: { gt: new Date() },
            },
        });

        if (!resetRequest) {
            return NextResponse.json(
                { error: 'الرابط غير صالح أو منتهي الصلاحية' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Hash new password
        const hashedPassword = await hashPassword(password);

        // Update user password and mark reset request as used
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetRequest.userId },
                data: {
                    passwordHash: hashedPassword,
                    failedAttempts: 0,
                    lockedUntil: null,
                },
            }),
            prisma.passwordResetRequest.update({
                where: { id: resetRequest.id },
                data: {
                    status: 'USED',
                    usedAt: new Date(),
                },
            }),
            // Invalidate all existing sessions for security
            prisma.session.deleteMany({
                where: { userId: resetRequest.userId },
            }),
        ]);

        return NextResponse.json(
            {
                success: true,
                message: 'تم تغيير كلمة المرور بنجاح',
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ في الخادم' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
