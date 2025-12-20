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
        const body = await request.json();
        const { reason } = body;

        // Find the password reset request
        const resetRequest = await prisma.passwordResetRequest.findUnique({
            where: { id },
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

        // Reject the request
        await prisma.passwordResetRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                message: reason ? `سبب الرفض: ${reason}` : resetRequest.message,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: 'تم رفض الطلب',
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Reject password request error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ في الخادم' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
