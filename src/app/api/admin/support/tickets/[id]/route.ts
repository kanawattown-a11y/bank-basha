import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const replySchema = z.object({
    message: z.string().min(1, 'Message cannot be empty'),
    updateStatus: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'WAITING_ADMIN', 'RESOLVED', 'CLOSED']).optional(),
    assignTo: z.string().optional(),
    attachments: z.array(z.string()).optional(),
});

// POST - Admin reply to ticket
export async function POST(
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
        const result = replySchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { message, updateStatus, assignTo, attachments } = result.data;

        // Verify ticket exists
        const ticket = await prisma.ticket.findUnique({
            where: { id: params.id },
        });

        if (!ticket) {
            return NextResponse.json(
                { error: 'Ticket not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Create admin message
        const ticketMessage = await prisma.ticketMessage.create({
            data: {
                ticketId: params.id,
                userId: payload.userId,
                message,
                isAdmin: true,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
        });

        // Add attachments if provided
        if (attachments && attachments.length > 0) {
            await prisma.ticketAttachment.createMany({
                data: attachments.map((url) => ({
                    ticketId: params.id,
                    messageId: ticketMessage.id,
                    fileName: url.split('/').pop() || 'attachment',
                    fileUrl: url,
                    fileSize: 0,
                    mimeType: 'image/png',
                    uploadedById: payload.userId,
                })),
            });
        }

        // Update ticket
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (updateStatus) {
            updateData.status = updateStatus;
            if (updateStatus === 'CLOSED') {
                updateData.closedAt = new Date();
                updateData.closedBy = payload.userId;
            }
        } else {
            // Default to WAITING_USER after admin reply
            updateData.status = 'WAITING_USER';
        }

        if (assignTo !== undefined) {
            updateData.assignedToId = assignTo || null;
        }

        await prisma.ticket.update({
            where: { id: params.id },
            data: updateData,
        });

        return NextResponse.json(
            {
                success: true,
                message: ticketMessage,
            },
            { status: 201, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Admin reply error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}


// GET - Admin get ticket details
export async function GET(
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

        const ticket = await prisma.ticket.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        email: true,
                        userType: true,
                        kycStatus: true,
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

        return NextResponse.json(
            { ticket },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get admin ticket error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
