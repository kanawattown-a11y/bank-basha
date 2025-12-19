import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, generateReferenceNumber } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

// GET - List active and approved services (for users)
export async function GET() {
    try {
        const services = await prisma.service.findMany({
            where: {
                isActive: true,
                deletedAt: null, // Exclude soft-deleted services
                OR: [
                    { sellerId: null }, // Admin services (always approved)
                    { status: 'APPROVED' }, // User services that are approved
                ],
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            select: {
                id: true,
                name: true,
                nameAr: true,
                description: true,
                descriptionAr: true,
                category: true,
                categoryAr: true,
                price: true,
                isFlexiblePrice: true,
                minPrice: true,
                maxPrice: true,
                currency: true,
                iconUrl: true,
                imageUrl: true,
                metadata: true,
                requiredFields: true,
                sellerId: true,
                seller: {
                    select: { id: true, fullName: true, fullNameAr: true },
                },
            },
        });

        // Group by category
        const categories = services.reduce((acc, service) => {
            const cat = service.category;
            if (!acc[cat]) {
                acc[cat] = {
                    name: cat,
                    nameAr: service.categoryAr || cat,
                    services: [],
                };
            }
            acc[cat].services.push(service);
            return acc;
        }, {} as Record<string, { name: string; nameAr: string; services: typeof services }>);

        return NextResponse.json(
            { services, categories: Object.values(categories) },
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
