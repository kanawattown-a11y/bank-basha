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
    currency: z.enum(['USD', 'SYP']).default('USD'), // NEW: Currency validation
    price: z.number().min(0),
    imageUrl: z.string().optional(),
    providerLocation: z.string().optional(), // موقع مزود الخدمة
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

// GET - List my services (as seller)
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

        const services = await prisma.service.findMany({
            where: {
                sellerId: payload.userId,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
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

// POST - Submit new service for approval
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
                sellerId: payload.userId,
                name: validatedData.name,
                nameAr: validatedData.nameAr || null,
                description: validatedData.description,
                descriptionAr: validatedData.descriptionAr || null,
                category: validatedData.category,
                currency: validatedData.currency || 'USD', // NEW: Save currency
                price: validatedData.price,
                isFlexiblePrice: validatedData.isFlexiblePrice ?? false,
                minPrice: validatedData.minPrice ?? null,
                maxPrice: validatedData.maxPrice ?? null,
                imageUrl: validatedData.imageUrl || null,
                requiredFields,
                metadata: JSON.stringify({ providerLocation: validatedData.providerLocation || null }),
                status: 'PENDING',
                isActive: false, // Not active until approved
            },
        });

        // Notify admin
        const admins = await prisma.user.findMany({
            where: { userType: 'ADMIN' },
        });

        for (const admin of admins) {
            await prisma.notification.create({
                data: {
                    userId: admin.id,
                    type: 'ADMIN_ALERT',
                    title: 'طلب خدمة جديد',
                    titleAr: 'طلب خدمة جديد',
                    message: `New service submitted: ${service.name}`,
                    messageAr: `تم تقديم خدمة جديدة للمراجعة: ${service.nameAr || service.name}`,
                },
            });
        }

        return NextResponse.json(
            { success: true, service, message: 'تم تقديم الخدمة بنجاح! سيتم مراجعتها قريباً' },
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
