import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// PUT - Update service
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const service = await prisma.service.update({
            where: { id: params.id },
            data: {
                name: body.name,
                nameAr: body.nameAr || null,
                description: body.description,
                descriptionAr: body.descriptionAr || null,
                category: body.category,
                categoryAr: body.categoryAr || null,
                price: body.price,
                iconUrl: body.iconUrl || null,
                imageUrl: body.imageUrl || null,
                isActive: body.isActive,
                metadata: body.metadata || null,
            },
        });

        return NextResponse.json(
            { success: true, service },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error updating service:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// DELETE - Delete service
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        // Import soft delete
        const { softDelete } = await import('@/lib/db/soft-delete');

        await softDelete({
            model: 'service',
            id: params.id,
            deletedBy: payload.userId,
            reason: 'Deleted by admin',
        });

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error deleting service:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
