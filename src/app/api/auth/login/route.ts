import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
    verifyPassword,
    generateAccessToken,
    generateRefreshToken,
    generateSessionId,
    sanitizePhoneNumber,
    checkRateLimit,
    getSecurityHeaders
} from '@/lib/auth/security';
import { z } from 'zod';

// Validation schema
const loginSchema = z.object({
    phone: z.string().min(9, 'Invalid phone number'),
    password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const rateLimit = checkRateLimit(`login:${clientIp}`, 5, 60000); // 5 attempts per minute

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        ...getSecurityHeaders(),
                        'Retry-After': Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString(),
                    }
                }
            );
        }

        const body = await request.json();

        // Validate input
        const result = loginSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { phone, password } = result.data;
        const sanitizedPhone = sanitizePhoneNumber(phone);

        // Find user
        const user = await prisma.user.findUnique({
            where: { phone: sanitizedPhone },
            include: { wallets: true },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid phone number or password' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        // Check if user is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            return NextResponse.json(
                { error: `Account locked. Try again in ${remainingTime} minutes.` },
                { status: 423, headers: getSecurityHeaders() }
            );
        }

        // Check if account is suspended (isActive = false)
        if (!user.isActive) {
            return NextResponse.json(
                {
                    error: 'تم تعليق حسابك. تواصل مع الدعم الفني.',
                    errorEn: 'Your account has been suspended. Contact support.'
                },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        // Check if user is suspended or blocked
        if (user.status === 'SUSPENDED' || user.status === 'BLOCKED') {
            return NextResponse.json(
                { error: 'Your account has been suspended. Contact support.' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.passwordHash);

        if (!isValidPassword) {
            // Increment failed attempts
            const failedAttempts = user.failedAttempts + 1;
            const updateData: any = { failedAttempts };

            // Lock account after 5 failed attempts
            if (failedAttempts >= 5) {
                updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                updateData.failedAttempts = 0;
            }

            await prisma.user.update({
                where: { id: user.id },
                data: updateData,
            });

            // Log failed attempt
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'LOGIN_FAILED',
                    entity: 'Session',
                    ipAddress: clientIp,
                    userAgent: request.headers.get('user-agent') || undefined,
                },
            });

            return NextResponse.json(
                { error: 'Invalid phone number or password' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        // Reset failed attempts on successful login
        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
                lastLoginIp: clientIp,
            },
        });

        // Invalidate old sessions (optional: keep last 5)
        const oldSessions = await prisma.session.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            skip: 5,
        });

        if (oldSessions.length > 0) {
            await prisma.session.deleteMany({
                where: { id: { in: oldSessions.map(s => s.id) } },
            });
        }

        // Create new session
        const sessionId = generateSessionId();
        const tokenPayload = {
            userId: user.id,
            userType: user.userType,
            sessionId,
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        await prisma.session.create({
            data: {
                userId: user.id,
                token: accessToken,
                refreshToken,
                userAgent: request.headers.get('user-agent') || undefined,
                ipAddress: clientIp,
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days for WebView
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN_SUCCESS',
                entity: 'Session',
                ipAddress: clientIp,
                userAgent: request.headers.get('user-agent') || undefined,
            },
        });

        // Response
        const response = NextResponse.json(
            {
                success: true,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    phone: user.phone,
                    email: user.email,
                    userType: user.userType,
                    status: user.status,
                    kycStatus: user.kycStatus,
                    balance: user.wallets?.find((w: { currency: string; walletType: string }) => w.currency === 'USD' && w.walletType === 'PERSONAL')?.balance || 0,
                },
            },
            { status: 200, headers: getSecurityHeaders() }
        );

        // Set secure cookies - Extended session (90 days)
        response.cookies.set('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax', // Lax is better for mobile persistence
            maxAge: 90 * 24 * 60 * 60, // 90 days
            path: '/',
        });

        response.cookies.set('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 90 * 24 * 60 * 60, // 90 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
