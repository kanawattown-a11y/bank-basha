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

        // Clean phone number for search - remove non-digits and handle different formats
        let searchPhone = phone.replace(/\D/g, '');

        // Try multiple search patterns for flexibility
        // 1. Exact match with the cleaned number
        // 2. Match with + prefix
        // 3. Match containing the last 9 digits (for Syrian numbers)
        const searchPatterns = [
            `+${searchPhone}`,
            searchPhone,
        ];

        // For Syrian numbers, also search with +963 prefix
        if (searchPhone.startsWith('0') && searchPhone.length === 10) {
            searchPatterns.push(`+963${searchPhone.substring(1)}`);
        }
        if (searchPhone.length === 9 && searchPhone.startsWith('9')) {
            searchPatterns.push(`+963${searchPhone}`);
        }
        if (searchPhone.startsWith('963')) {
            searchPatterns.push(`+${searchPhone}`);
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: searchPatterns.map(pattern => ({
                    phone: {
                        contains: pattern,
                    },
                })),
                isActive: true,
                userType: { not: 'ADMIN' },
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
