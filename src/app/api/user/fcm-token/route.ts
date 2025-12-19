import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// POST - Save FCM token
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;

        if (!accessToken) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const payload = verifyAccessToken(accessToken);
        if (!payload) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const { token: fcmToken } = await request.json();

        if (!fcmToken || typeof fcmToken !== 'string') {
            return NextResponse.json(
                { error: 'FCM token is required' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Save FCM token to user
        await prisma.user.update({
            where: { id: payload.userId },
            data: { fcmToken },
        });

        return NextResponse.json(
            { success: true, message: 'FCM token saved' },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Save FCM token error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// DELETE - Remove FCM token (on logout)
export async function DELETE() {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;

        if (!accessToken) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const payload = verifyAccessToken(accessToken);
        if (!payload) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        // Remove FCM token
        await prisma.user.update({
            where: { id: payload.userId },
            data: { fcmToken: null },
        });

        return NextResponse.json(
            { success: true, message: 'FCM token removed' },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Remove FCM token error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
