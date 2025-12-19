import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const serviceSchema = z.object({
    name: z.string().min(1),
    nameAr: z.string().optional(),
    description: z.string().min(1),
    descriptionAr: z.string().optional(),
    category: z.string(),
    categoryAr: z.string().optional(),
    price: z.number().min(0),
    iconUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    isActive: z.boolean().optional(),
    metadata: z.string().optional(),
    // Flexible pricing
    isFlexiblePrice: z.boolean().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    // Required fields from buyer (individual booleans)
    requirePhone: z.boolean().optional(),
    requireEmail: z.boolean().optional(),
    requireUsername: z.boolean().optional(),
    requireNote: z.boolean().optional(),
    customFieldLabel: z.string().optional(),
});

// GET - List all services (for admin)
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
        if (!payload || payload.userType !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const services = await prisma.service.findMany({
            where: {
                deletedAt: null, // Exclude soft-deleted services
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            include: {
                _count: {
                    select: { purchases: true },
                },
            },
        });

        return NextResponse.json(
            { services },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error fetching services:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST - Create new service
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
        if (!payload || payload.userType !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const validatedData = serviceSchema.parse(body);

        // Build requiredFields JSON from individual booleans
        const requiredFields = JSON.stringify({
            requirePhone: validatedData.requirePhone ?? true,
            requireEmail: validatedData.requireEmail ?? false,
            requireUsername: validatedData.requireUsername ?? false,
            requireNote: validatedData.requireNote ?? false,
            customFieldLabel: validatedData.customFieldLabel || null,
        });

        const service = await prisma.service.create({
            data: {
                name: validatedData.name,
                nameAr: validatedData.nameAr || null,
                description: validatedData.description,
                descriptionAr: validatedData.descriptionAr || null,
                category: validatedData.category,
                categoryAr: validatedData.categoryAr || null,
                price: validatedData.price,
                iconUrl: validatedData.iconUrl || null,
                imageUrl: validatedData.imageUrl || null,
                isActive: validatedData.isActive ?? true,
                metadata: validatedData.metadata || null,
                isFlexiblePrice: validatedData.isFlexiblePrice ?? false,
                minPrice: validatedData.minPrice ?? null,
                maxPrice: validatedData.maxPrice ?? null,
                requiredFields,
            },
        });

        return NextResponse.json(
            { success: true, service },
            { status: 201, headers: getSecurityHeaders() }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid data', details: error.errors },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        console.error('Error creating service:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
