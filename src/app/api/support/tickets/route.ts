import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schema
const createTicketSchema = z.object({
    subject: z.string().min(1, 'Subject is required'),
    description: z.string().min(1, 'Description is required'),
    category: z.enum([
        'ACCOUNT_ISSUE',
        'PAYMENT_ISSUE',
        'TECHNICAL_ISSUE',
        'KYC_VERIFICATION',
        'SUSPENSION_APPEAL',
        'FEATURE_REQUEST',
        'OTHER'
    ]),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    attachments: z.array(z.string()).optional(),
});

// Generate unique ticket number
function generateTicketNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${timestamp}${random}`;
}

// POST - Create new ticket
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('accessToken')?.value;

        let userId: string | undefined;
        if (token) {
            const payload = verifyAccessToken(token);
            userId = payload?.userId;
        }

        const body = await request.json();
        const result = createTicketSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { subject, description, category, priority, contactName, contactPhone, contactEmail, attachments } = result.data;

        // For public tickets, require contact info
        if (!userId && (!contactName || !contactPhone)) {
            return NextResponse.json(
                { error: 'Contact name and phone are required for public tickets' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Create ticket
        const ticket = await prisma.ticket.create({
            data: {
                ticketNumber: generateTicketNumber(),
                userId,
                contactName: contactName || null,
                contactPhone: contactPhone || null,
                contactEmail: contactEmail || null,
                subject,
                description,
                category,
                priority: priority || 'MEDIUM',
                status: 'OPEN',
            },
        });

        // Create initial system message
        await prisma.ticketMessage.create({
            data: {
                ticketId: ticket.id,
                message: description,
                userId,
                isSystem: true,
            },
        });

        // Create attachments if provided
        if (attachments && attachments.length > 0) {
            await prisma.ticketAttachment.createMany({
                data: attachments.map((url) => ({
                    ticketId: ticket.id,
                    fileName: url.split('/').pop() || 'attachment',
                    fileUrl: url,
                    fileSize: 0, // Will be updated by S3
                    mimeType: 'image/png',
                    uploadedById: userId,
                })),
            });
        }

        return NextResponse.json(
            {
                success: true,
                ticket: {
                    id: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    status: ticket.status,
                },
            },
            { status: 201, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Create ticket error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// GET - List user's tickets
export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const where: any = { userId: payload.userId };
        if (status) {
            where.status = status;
        }

        const [tickets, total] = await Promise.all([
            prisma.ticket.findMany({
                where,
                include: {
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                    _count: {
                        select: {
                            messages: true,
                            attachments: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.ticket.count({ where }),
        ]);

        return NextResponse.json(
            {
                tickets,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get tickets error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
