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

        // Parse request body
        const body = await request.json();
        const { type, amount, notes } = body;

        // Validate settlement type
        if (!['CASH_TO_CREDIT', 'CREDIT_REQUEST', 'CASH_REQUEST'].includes(type)) {
            return NextResponse.json(
                { error: 'Invalid settlement type' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Validate amount
        if (!amount || amount < 10) {
            return NextResponse.json(
                { error: 'Minimum settlement amount is $10' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Type-specific validations
        if (type === 'CASH_TO_CREDIT') {
            if (amount > agentProfile.cashCollected) {
                return NextResponse.json(
                    { error: `Insufficient cash balance. Available: $${agentProfile.cashCollected}` },
                    { status: 400, headers: getSecurityHeaders() }
                );
            }
        } else if (type === 'CREDIT_REQUEST') {
            const availableCredit = agentProfile.creditLimit - agentProfile.currentCredit - agentProfile.pendingDebt;
            if (amount > availableCredit) {
                return NextResponse.json(
                    { error: `Insufficient credit limit. Available: $${availableCredit}` },
                    { status: 400, headers: getSecurityHeaders() }
                );
            }
        } else if (type === 'CASH_REQUEST') {
            if (amount > agentProfile.currentCredit) {
                return NextResponse.json(
                    { error: `Insufficient digital credit. Available: $${agentProfile.currentCredit}` },
                    { status: 400, headers: getSecurityHeaders() }
                );
            }
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

        // Fetch system settings for commission rates
        const settings = await prisma.systemSettings.findFirst();
        if (!settings) {
            return NextResponse.json(
                { error: 'System settings not configured' },
                { status: 500, headers: getSecurityHeaders() }
            );
        }

        // Prepare settlement data based on type
        let settlementData: any = {
            settlementNumber: generateReferenceNumber('STL'),
            agentId: agentProfile.id,
            type,
            requestedAmount: amount,
            status: 'PENDING',
            notes: notes || null,
        };

        // Type-specific calculations
        if (type === 'CASH_TO_CREDIT') {
            const platformShare = amount * (settings.settlementPlatformCommission / 100);
            const agentShare = amount * (settings.settlementAgentCommission / 100);
            const amountDue = amount - platformShare - agentShare;

            settlementData = {
                ...settlementData,
                cashCollected: amount,
                platformShare,
                agentShare,
                amountDue,
                creditUsed: agentProfile.currentCredit,
            };
        } else if (type === 'CREDIT_REQUEST') {
            settlementData = {
                ...settlementData,
                creditGiven: amount,
            };
        } else if (type === 'CASH_REQUEST') {
            settlementData = {
                ...settlementData,
                cashToReceive: amount,
                creditDeducted: amount,
                deliveryStatus: 'PENDING',
            };
        }

        const settlement = await prisma.settlement.create({
            data: settlementData,
        });

        // Notify admins
        const admins = await prisma.user.findMany({
            where: { userType: 'ADMIN' },
            select: { id: true, fcmToken: true },
        });

        const typeLabels: Record<string, { en: string; ar: string }> = {
            CASH_TO_CREDIT: { en: 'Cash to Credit', ar: 'نقد إلى رصيد' },
            CREDIT_REQUEST: { en: 'Credit Request', ar: 'طلب رصيد' },
            CASH_REQUEST: { en: 'Cash Request', ar: 'طلب نقد' },
        };

        const typeLabel = typeLabels[type];
        const notesText = notes ? `\nNote: ${notes}` : '';
        const notesTextAr = notes ? `\nملاحظة: ${notes}` : '';

        await prisma.notification.createMany({
            data: admins.map(admin => ({
                userId: admin.id,
                type: 'SYSTEM',
                title: `New ${typeLabel.en} Request`,
                titleAr: `طلب ${typeLabel.ar} جديد`,
                message: `Agent ${agentProfile.businessName} requested ${typeLabel.en.toLowerCase()} of $${amount}${notesText}`,
                messageAr: `طلب الوكيل ${agentProfile.businessNameAr || agentProfile.businessName} ${typeLabel.ar} بقيمة $${amount}${notesTextAr}`,
            })),
        });

        // Send push notifications
        const { sendPushNotification } = await import('@/lib/firebase/admin');
        for (const admin of admins) {
            if (admin.fcmToken) {
                sendPushNotification(
                    admin.fcmToken,
                    `💰 طلب ${typeLabel.ar} جديد`,
                    `طلب الوكيل ${agentProfile.businessNameAr || agentProfile.businessName} ${typeLabel.ar} بقيمة $${amount}`,
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
