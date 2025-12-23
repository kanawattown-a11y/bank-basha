import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, generateReferenceNumber } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// GET: Get agent's settlements
export async function GET(request: NextRequest) {
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
        if (!payload || payload.userType !== 'AGENT') {
            return NextResponse.json(
                { error: 'Agent access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const agentProfile = await prisma.agentProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (!agentProfile) {
            return NextResponse.json(
                { error: 'Agent profile not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        const settlements = await prisma.settlement.findMany({
            where: { agentId: agentProfile.id },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        return NextResponse.json(
            { settlements },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get settlements error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST: Create new settlement request
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
        if (!payload || payload.userType !== 'AGENT') {
            return NextResponse.json(
                { error: 'Agent access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const agentProfile = await prisma.agentProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (!agentProfile) {
            return NextResponse.json(
                { error: 'Agent profile not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }


        // Check if there's any cash to settle
        if (agentProfile.cashCollected <= 0) {
            return NextResponse.json(
                { error: 'No cash available for settlement' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }


        // Check for pending settlement
        const pendingSettlement = await prisma.settlement.findFirst({
            where: {
                agentId: agentProfile.id,
                status: 'PENDING',
            },
        });

        if (pendingSettlement) {
            return NextResponse.json(
                { error: 'You already have a pending settlement request' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Fetch system settings for dynamic commission rates
        const settings = await prisma.systemSettings.findFirst();
        if (!settings) {
            return NextResponse.json(
                { error: 'System settings not configured' },
                { status: 500, headers: getSecurityHeaders() }
            );
        }

        // Get notes from request body
        let notes = '';
        try {
            const body = await request.json();
            notes = body.notes || '';
        } catch {
            // No body or invalid JSON, notes will be empty
        }

        // Calculate amounts using dynamic commission rates
        const cashCollected = agentProfile.cashCollected;
        const platformShare = cashCollected * (settings.settlementPlatformCommission / 100);
        const agentShare = cashCollected * (settings.settlementAgentCommission / 100);
        const amountDue = cashCollected - platformShare - agentShare;

        const settlement = await prisma.settlement.create({
            data: {
                settlementNumber: generateReferenceNumber('STL'),
                agentId: agentProfile.id,
                creditUsed: agentProfile.currentCredit,
                cashCollected,
                platformShare,
                agentShare,
                amountDue,
                status: 'PENDING',
                notes: notes || null,
            },
        });

        // Notify admins
        const admins = await prisma.user.findMany({
            where: { userType: 'ADMIN' },
            select: { id: true, fcmToken: true },
        });

        const notesText = notes ? `\nNote: ${notes}` : '';
        const notesTextAr = notes ? `\nملاحظة: ${notes}` : '';

        await prisma.notification.createMany({
            data: admins.map(admin => ({
                userId: admin.id,
                type: 'SYSTEM',
                title: 'New Settlement Request',
                titleAr: 'طلب تسوية جديد',
                message: `Agent ${agentProfile.businessName} requested a settlement of ${amountDue} $${notesText}`,
                messageAr: `طلب الوكيل ${agentProfile.businessNameAr || agentProfile.businessName} تسوية بقيمة ${amountDue} $${notesTextAr}`,
            })),
        });

        // Send push notifications to admins
        const { sendPushNotification } = await import('@/lib/firebase/admin');
        for (const admin of admins) {
            if (admin.fcmToken) {
                sendPushNotification(
                    admin.fcmToken,
                    '💰 طلب تسوية جديد',
                    `طلب الوكيل ${agentProfile.businessNameAr || agentProfile.businessName} تسوية بقيمة ${amountDue} $`,
                    { type: 'SETTLEMENT_REQUEST', url: '/admin/settlements' }
                ).catch(err => console.error('Push notification error:', err));
            }
        }

        return NextResponse.json(
            { success: true, settlement },
            { status: 201, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Create settlement error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
