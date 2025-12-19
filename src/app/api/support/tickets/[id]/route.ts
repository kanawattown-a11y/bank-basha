import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// GET - Get ticket details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('accessToken')?.value;

        let userId: string | undefined;
        if (token) {
            const payload = verifyAccessToken(token);
            userId = payload?.userId;
        }

        const ticket = await prisma.ticket.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        email: true,
                    },
                },
                messages: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                userType: true,
                            },
                        },
                        attachments: true,
                    },
                    orderBy: { createdAt: 'asc' },
                },
                attachments: true,
                assignedTo: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
        });

        if (!ticket) {
            return NextResponse.json(
                { error: 'Ticket not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Check authorization
        if (userId && ticket.userId !== userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        return NextResponse.json(
            { ticket },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get ticket error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
