import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, hashPassword, verifyPassword } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const pinSchema = z.object({
    pin: z.string().length(6).regex(/^\d+$/, 'PIN must be 6 digits'),
    currentPin: z.string().optional(),
});

// GET - Check if app lock is set
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
        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { appLockPin: true },
        });

        return NextResponse.json(
            { hasAppLock: !!user?.appLockPin },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST - Set or change app lock PIN
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
        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const validatedData = pinSchema.parse(body);

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { appLockPin: true },
        });

        // If PIN already exists, verify current PIN
        if (user?.appLockPin && validatedData.currentPin) {
            const isValid = await verifyPassword(validatedData.currentPin, user.appLockPin);
            if (!isValid) {
                return NextResponse.json(
                    { error: 'الرمز الحالي غير صحيح' },
                    { status: 400, headers: getSecurityHeaders() }
                );
            }
        }

        // Hash and save new PIN
        const hashedPin = await hashPassword(validatedData.pin);
        await prisma.user.update({
            where: { id: payload.userId },
            data: { appLockPin: hashedPin },
        });

        return NextResponse.json(
            { success: true, message: 'تم تعيين رمز الفتح بنجاح' },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'الرمز يجب أن يكون 6 أرقام' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// PUT - Verify app lock PIN
export async function PUT(request: NextRequest) {
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
        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const { pin } = body;

        if (!pin || pin.length !== 6) {
            return NextResponse.json(
                { error: 'Invalid PIN' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { appLockPin: true },
        });

        if (!user?.appLockPin) {
            return NextResponse.json(
                { success: true }, // No PIN set, allow access
                { status: 200, headers: getSecurityHeaders() }
            );
        }

        const isValid = await verifyPassword(pin, user.appLockPin);
        if (!isValid) {
            return NextResponse.json(
                { error: 'رمز غير صحيح' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
