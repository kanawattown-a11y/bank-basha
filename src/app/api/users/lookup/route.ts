import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders } from '@/lib/auth/security';

// GET - Lookup user by phone for transfer
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone');

        if (!phone) {
            return NextResponse.json(
                { error: 'Phone number required' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Clean phone number
        let cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone.startsWith('+')) {
            if (cleanPhone.startsWith('00')) {
                cleanPhone = '+' + cleanPhone.slice(2);
            } else if (cleanPhone.startsWith('0')) {
                cleanPhone = '+218' + cleanPhone.slice(1);
            } else {
                cleanPhone = '+' + cleanPhone;
            }
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: cleanPhone },
                    { phone: phone },
                    { phone: { contains: phone.slice(-9) } },
                ],
                isActive: true,
            },
            select: {
                id: true,
                fullName: true,
                fullNameAr: true,
                phone: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        return NextResponse.json(
            { user },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('User lookup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
