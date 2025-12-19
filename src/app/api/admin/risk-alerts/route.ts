/**
 * API: Risk Alerts Management
 * GET - Get pending risk alerts
 * POST - Resolve a risk alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// Verify admin access
async function verifyAdmin(request: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) {
        return null;
    }

    const payload = verifyAccessToken(token);
    if (!payload || payload.userType !== 'ADMIN') {
        return null;
    }

    return payload;
}

// GET: Get pending risk alerts
export async function GET(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'PENDING';
        const limit = parseInt(searchParams.get('limit') || '50');

        const alerts = await prisma.riskAlert.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // Get user info for each alert
        const alertsWithUsers = await Promise.all(
            alerts.map(async (alert) => {
                const user = await prisma.user.findUnique({
                    where: { id: alert.userId },
                    select: { fullName: true, phone: true, userType: true },
                });
                return { ...alert, user };
            })
        );

        return NextResponse.json(
            { alerts: alertsWithUsers },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Risk alerts error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST: Resolve a risk alert
export async function POST(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const { alertId, resolution, notes } = body;

        if (!alertId || !resolution) {
            return NextResponse.json(
                { error: 'Missing alertId or resolution' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Valid resolutions: APPROVED, BLOCKED, DISMISSED
        if (!['APPROVED', 'BLOCKED', 'DISMISSED'].includes(resolution)) {
            return NextResponse.json(
                { error: 'Invalid resolution. Must be APPROVED, BLOCKED, or DISMISSED' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const alert = await prisma.riskAlert.update({
            where: { id: alertId },
            data: {
                status: resolution,
                reviewedBy: admin.userId,
                reviewedAt: new Date(),
                resolution,
                resolutionNotes: notes,
            },
        });

        return NextResponse.json(
            { success: true, alert },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Risk alert resolution error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
