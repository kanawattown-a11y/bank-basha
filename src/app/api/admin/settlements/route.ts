import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const settlementActionSchema = z.object({
    settlementId: z.string(),
    action: z.enum(['approve', 'reject']),
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
        const result = settlementActionSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { settlementId, action } = result.data;

        const settlement = await prisma.settlement.findUnique({
            where: { id: settlementId },
            include: { agent: { include: { user: true } } },
        });

        if (!settlement) {
            return NextResponse.json(
                { error: 'Settlement not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        if (action === 'approve') {
            // Update settlement status
            await prisma.settlement.update({
                where: { id: settlementId },
                data: {
                    status: 'COMPLETED',
                    reviewedBy: payload.userId,
                    reviewedAt: new Date(),
                    completedAt: new Date(),
                },
            });

            // Reset agent's cash collected
            await prisma.agentProfile.update({
                where: { id: settlement.agentId },
                data: { cashCollected: 0 },
            });
        } else {
            await prisma.settlement.update({
                where: { id: settlementId },
                data: {
                    status: 'REJECTED',
                    reviewedBy: payload.userId,
                    reviewedAt: new Date(),
                },
            });
        }

        // Notify agent
        await prisma.notification.create({
            data: {
                userId: settlement.agent.userId,
                type: 'SYSTEM',
                title: action === 'approve' ? 'Settlement Approved' : 'Settlement Rejected',
                titleAr: action === 'approve' ? 'تمت الموافقة على التسوية' : 'تم رفض التسوية',
                message: action === 'approve'
                    ? `Your settlement request for ${settlement.amountDue} $ has been approved`
                    : 'Your settlement request was rejected',
                messageAr: action === 'approve'
                    ? `تمت الموافقة على طلب التسوية بقيمة ${settlement.amountDue} $`
                    : 'تم رفض طلب التسوية',
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: payload.userId,
                action: `SETTLEMENT_${action.toUpperCase()}`,
                entity: 'Settlement',
                entityId: settlementId,
            },
        });

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Settlement action error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
