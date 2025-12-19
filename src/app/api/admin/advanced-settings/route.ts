/**
 * API: Advanced Settings Management
 * GET - Get current settings
 * PUT - Update settings
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

// GET: Get advanced settings
export async function GET(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        let settings = await prisma.advancedSettings.findFirst();

        if (!settings) {
            // Create default settings
            settings = await prisma.advancedSettings.create({
                data: {},
            });
        }

        return NextResponse.json(
            { settings },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get advanced settings error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// PUT: Update advanced settings
export async function PUT(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();

        let settings = await prisma.advancedSettings.findFirst();

        if (!settings) {
            settings = await prisma.advancedSettings.create({
                data: {
                    ...body,
                    updatedBy: admin.userId,
                },
            });
        } else {
            settings = await prisma.advancedSettings.update({
                where: { id: settings.id },
                data: {
                    ...body,
                    updatedBy: admin.userId,
                },
            });
        }

        // Log the change
        await prisma.auditLog.create({
            data: {
                userId: admin.userId,
                action: 'UPDATE_ADVANCED_SETTINGS',
                entity: 'AdvancedSettings',
                entityId: settings.id,
                newValue: JSON.stringify(body),
            },
        });

        return NextResponse.json(
            { success: true, settings },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Update advanced settings error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
