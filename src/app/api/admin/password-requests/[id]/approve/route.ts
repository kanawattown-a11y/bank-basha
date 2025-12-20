import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

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
        if (!payload || payload.userType !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const { id } = await params;

        // Find the password reset request
        const resetRequest = await prisma.passwordResetRequest.findUnique({
            where: { id },
            include: {
                user: true,
            },
        });

        if (!resetRequest) {
            return NextResponse.json(
                { error: 'الطلب غير موجود' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        if (resetRequest.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'تم معالجة هذا الطلب بالفعل' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Approve the request and activate user
        const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        await prisma.$transaction([
            // Update password reset request status
            prisma.passwordResetRequest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    approvedBy: payload.userId,
                    approvedAt: new Date(),
                    expiresAt: newExpiresAt, // Extend expiry
                },
            }),
            // Activate user if suspended
            prisma.user.update({
                where: { id: resetRequest.userId },
                data: {
                    status: 'ACTIVE',
                    failedAttempts: 0,
                    lockedUntil: null,
                },
            }),
        ]);

        // Generate reset link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bankbasha.com';
        const resetLink = `${baseUrl}/reset-password?token=${resetRequest.token}`;

        return NextResponse.json(
            {
                success: true,
                message: 'تمت الموافقة على الطلب وتفعيل الحساب',
                resetLink,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Approve password request error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ في الخادم' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
