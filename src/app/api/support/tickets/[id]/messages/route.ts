import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const messageSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty'),
    attachments: z.array(z.string()).optional(),
});

// POST - Add message to ticket
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
        if (!payload) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const result = messageSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { message, attachments } = result.data;

        // Verify ticket exists and user owns it
        const ticket = await prisma.ticket.findUnique({
            where: { id: params.id },
        });

        if (!ticket) {
            return NextResponse.json(
                { error: 'Ticket not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        if (ticket.userId !== payload.userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        // Create message
        const ticketMessage = await prisma.ticketMessage.create({
            data: {
                ticketId: params.id,
                userId: payload.userId,
                message,
                isAdmin: false,
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

        // Update ticket status to WAITING_ADMIN
        await prisma.ticket.update({
            where: { id: params.id },
            data: {
                status: 'WAITING_ADMIN',
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: ticketMessage,
            },
            { status: 201, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Add message error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
