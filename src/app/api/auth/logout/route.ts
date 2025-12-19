import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const refreshToken = cookieStore.get('refreshToken')?.value;

        // Delete session from database
        if (accessToken) {
            const session = await prisma.session.findUnique({
                where: { token: accessToken },
            });

            if (session) {
                await prisma.session.delete({
                    where: { id: session.id },
                });

                // Audit log
                await prisma.auditLog.create({
                    data: {
                        userId: session.userId,
                        action: 'LOGOUT',
                        entity: 'Session',
                        entityId: session.id,
                        ipAddress: request.headers.get('x-forwarded-for') || undefined,
                        userAgent: request.headers.get('user-agent') || undefined,
                    },
                });
            }
        }

        // Clear cookies
        const response = NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );

        response.cookies.set('accessToken', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
            path: '/',
        });

        response.cookies.set('refreshToken', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
