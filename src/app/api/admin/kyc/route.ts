import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { sendKYCStatusEmail } from '@/lib/email/email';
import { cookies } from 'next/headers';
import { z } from 'zod';

const kycActionSchema = z.object({
    userId: z.string(),
    action: z.enum(['approve', 'reject']),
    reason: z.string().optional(),
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
        if (!payload || payload.userType !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const result = kycActionSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { userId, action, reason } = result.data;

        const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

        await prisma.user.update({
            where: { id: userId },
            data: { kycStatus: newStatus },
        });

        // Update KYC documents if any
        await prisma.kYCDocument.updateMany({
            where: { userId },
            data: {
                status: newStatus,
                reviewedBy: payload.userId,
                reviewedAt: new Date(),
                rejectionReason: action === 'reject' ? reason : null,
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: payload.userId,
                action: `KYC_${action.toUpperCase()}`,
                entity: 'User',
                entityId: userId,
                newValue: JSON.stringify({ status: newStatus, reason }),
            },
        });

        // Notify user
        await prisma.notification.create({
            data: {
                userId,
                type: 'SECURITY',
                title: action === 'approve' ? 'KYC Approved' : 'KYC Rejected',
                titleAr: action === 'approve' ? 'تم قبول التحقق' : 'تم رفض التحقق',
                message: action === 'approve'
                    ? 'Your KYC verification has been approved'
                    : `Your KYC verification was rejected: ${reason || 'No reason provided'}`,
                messageAr: action === 'approve'
                    ? 'تم قبول طلب التحقق من هويتك'
                    : `تم رفض طلب التحقق: ${reason || 'لم يتم تحديد السبب'}`,
            },
        });

        // Send email notification
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, fullName: true, fullNameAr: true },
        });

        if (user?.email) {
            await sendKYCStatusEmail({
                to: user.email,
                userName: user.fullNameAr || user.fullName,
                status: action === 'approve' ? 'approved' : 'rejected',
                rejectionReason: reason,
            }).catch(err => console.error('Email send error:', err));
        }

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('KYC action error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
