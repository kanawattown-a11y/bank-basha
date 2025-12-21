import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders, sanitizePhoneNumber } from '@/lib/auth/security';
import { verifyAuth } from '@/lib/auth/verify-session';

// GET - Search for a user by phone number
export async function GET(request: NextRequest) {
    try {
        const auth = await verifyAuth(request);
        if (!auth.success || !auth.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone');

        if (!phone) {
            return NextResponse.json(
                { error: 'Phone number required' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const sanitizedPhone = sanitizePhoneNumber(phone);

        const user = await prisma.user.findFirst({
            where: {
                phone: {
                    contains: sanitizedPhone,
                },
                status: 'ACTIVE',
                userType: { not: 'ADMIN' }, // Don't return admins
            },
            select: {
                id: true,
                fullName: true,
                fullNameAr: true,
                phone: true,
                userType: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { user: null },
                { status: 200, headers: getSecurityHeaders() }
            );
        }

        return NextResponse.json(
            {
                user: {
                    id: user.id,
                    fullName: user.fullNameAr || user.fullName,
                    phone: user.phone,
                    isAgent: user.userType === 'AGENT',
                }
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('User search error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
