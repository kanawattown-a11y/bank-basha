import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { permanentDelete } from '@/lib/db/soft-delete';

// DELETE - Permanently delete an item
export async function DELETE(request: NextRequest) {
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
        const { itemType, itemId } = body;

        if (!itemType || !itemId) {
            return NextResponse.json(
                { error: 'itemType and itemId are required' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Map itemType to model name
        const modelMap: any = {
            'USER': 'user',
            'SERVICE': 'service',
            'AGENT': 'agentProfile',
            'MERCHANT': 'merchantProfile',
        };

        const model = modelMap[itemType];
        if (!model) {
            return NextResponse.json(
                { error: 'Invalid item type' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        await permanentDelete({ model, id: itemId });

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error permanently deleting item:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
