import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders } from '@/lib/auth/security';

// GET - Lookup merchant by code
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json(
                { error: 'Merchant code required' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const merchant = await prisma.merchantProfile.findFirst({
            where: {
                OR: [
                    { merchantCode: code.toUpperCase() },
                    { qrCode: code },
                    { qrCode: code.toUpperCase() }
                ]
            },
            select: {
                id: true,
                userId: true,
                businessName: true,
                businessNameAr: true,
                merchantCode: true,
            },
        });

        if (!merchant) {
            return NextResponse.json(
                { error: 'Merchant not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        return NextResponse.json(
            { merchant },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Merchant lookup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
