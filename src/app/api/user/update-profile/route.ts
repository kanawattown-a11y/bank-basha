import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const updateProfileSchema = z.object({
    fullName: z.string().min(2),
    fullNameAr: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    city: z.string().optional(),
    address: z.string().optional(),
    dateOfBirth: z.string().optional(),
});

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
                { error: 'Invalid token' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const validatedData = updateProfileSchema.parse(body);

        await prisma.user.update({
            where: { id: payload.userId },
            data: {
                fullName: validatedData.fullName,
                fullNameAr: validatedData.fullNameAr || null,
                email: validatedData.email || null,
                city: validatedData.city || null,
                address: validatedData.address || null,
                dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
            },
        });

        return NextResponse.json(
            { success: true, message: 'Profile updated successfully' },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid data', details: error.errors },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        console.error('Error updating profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
