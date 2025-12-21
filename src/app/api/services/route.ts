import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, generateReferenceNumber } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getSignedUrlFromFullUrl } from '@/lib/storage/s3';

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

        // Generate presigned URLs for S3 images (valid for 24 hours) and extract providerLocation
        const servicesWithSignedUrls = await Promise.all(
            services.map(async (service) => {
                // Extract providerLocation from metadata
                let providerLocation = null;
                try {
                    if (service.metadata) {
                        const meta = typeof service.metadata === 'string'
                            ? JSON.parse(service.metadata)
                            : service.metadata;
                        providerLocation = meta.providerLocation || null;
                    }
                } catch { }

                let imageUrl = service.imageUrl;
                if (service.imageUrl && service.imageUrl.includes('.s3.')) {
                    try {
                        const signedUrl = await getSignedUrlFromFullUrl(service.imageUrl, 86400);
                        imageUrl = signedUrl || service.imageUrl;
                    } catch { }
                }

                return { ...service, imageUrl, providerLocation };
            })
        );

        // Group by category
        const categories = servicesWithSignedUrls.reduce((acc, service) => {
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
        }, {} as Record<string, { name: string; nameAr: string; services: typeof servicesWithSignedUrls }>);

        return NextResponse.json(
            { services: servicesWithSignedUrls, categories: Object.values(categories) },
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
