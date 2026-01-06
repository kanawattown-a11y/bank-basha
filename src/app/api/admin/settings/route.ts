import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const settingsSchema = z.object({
    // USD Fee Settings
    depositFeePercent: z.number().min(0).max(100).optional(),
    depositFeeFixed: z.number().min(0).optional(),
    withdrawalFeePercent: z.number().min(0).max(100).optional(),
    withdrawalFeeFixed: z.number().min(0).optional(),
    transferFeePercent: z.number().min(0).max(100).optional(),
    transferFeeFixed: z.number().min(0).optional(),
    qrPaymentFeePercent: z.number().min(0).max(100).optional(),
    qrPaymentFeeFixed: z.number().min(0).optional(),
    serviceFeePercent: z.number().min(0).max(100).optional(),
    serviceFeeFixed: z.number().min(0).optional(),
    agentCommissionPercent: z.number().min(0).max(100).optional(),
    // SYP Fee Settings
    depositFeePercentSYP: z.number().min(0).max(100).optional(),
    depositFeeFixedSYP: z.number().min(0).optional(),
    withdrawalFeePercentSYP: z.number().min(0).max(100).optional(),
    withdrawalFeeFixedSYP: z.number().min(0).optional(),
    transferFeePercentSYP: z.number().min(0).max(100).optional(),
    transferFeeFixedSYP: z.number().min(0).optional(),
    qrPaymentFeePercentSYP: z.number().min(0).max(100).optional(),
    qrPaymentFeeFixedSYP: z.number().min(0).optional(),
    serviceFeePercentSYP: z.number().min(0).max(100).optional(),
    serviceFeeFixedSYP: z.number().min(0).optional(),
    agentCommissionPercentSYP: z.number().min(0).max(100).optional(),
    // Settlement & Limits
    settlementPlatformCommission: z.number().min(0).max(100).optional(),
    settlementAgentCommission: z.number().min(0).max(100).optional(),
    dailyTransactionLimit: z.number().positive().optional(),
    weeklyTransactionLimit: z.number().positive().optional(),
    monthlyTransactionLimit: z.number().positive().optional(),
    minTransactionAmount: z.number().positive().optional(),
    maxTransactionAmount: z.number().positive().optional(),
});

export async function GET() {
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

        // Get or create settings
        let settings = await prisma.systemSettings.findFirst();

        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: {},
            });
        }

        return NextResponse.json(
            { settings },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

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
        const result = settingsSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Get existing settings or create new
        let settings = await prisma.systemSettings.findFirst();

        if (settings) {
            // Update existing
            settings = await prisma.systemSettings.update({
                where: { id: settings.id },
                data: {
                    ...result.data,
                    updatedBy: payload.userId,
                },
            });
        } else {
            // Create new
            settings = await prisma.systemSettings.create({
                data: {
                    ...result.data,
                    updatedBy: payload.userId,
                },
            });
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: payload.userId,
                action: 'UPDATE_SYSTEM_SETTINGS',
                entity: 'SystemSettings',
                entityId: settings.id,
                newValue: JSON.stringify(result.data),
            },
        });

        return NextResponse.json(
            { settings, message: 'Settings updated successfully' },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Update settings error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
