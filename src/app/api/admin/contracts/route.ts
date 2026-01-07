import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, generateReferenceNumber } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createContractSchema = z.object({
    agentId: z.string().min(1, 'Agent is required'),
    type: z.enum(['AGENT_AGREEMENT', 'NDA', 'SERVICE_AGREEMENT', 'AMENDMENT']),
    title: z.string().min(1, 'Title is required'),
    titleAr: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional().nullable(),
    depositCommission: z.number().optional().nullable(),
    withdrawCommission: z.number().optional().nullable(),
    creditLimit: z.number().optional().nullable(),
    clauses: z.array(z.object({
        title: z.string(),
        titleAr: z.string().optional(),
        content: z.string(),
        contentAr: z.string().optional(),
    })).optional(),
    customTerms: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE']).default('DRAFT'),
    fileUrl: z.string().optional().nullable(), // S3 URL for uploaded PDF
});

// GET - List all contracts
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

        const contracts = await prisma.contract.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                agent: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                fullNameAr: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(
            { contracts },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get contracts error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST - Create new contract
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
        const result = createContractSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const data = result.data;

        // Verify agent exists
        const agent = await prisma.agentProfile.findUnique({
            where: { id: data.agentId },
            include: { user: true },
        });

        if (!agent) {
            return NextResponse.json(
                { error: 'Agent not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Generate contract number
        const contractNumber = generateReferenceNumber('CTR');

        // Create contract
        const contract = await prisma.contract.create({
            data: {
                contractNumber,
                agentId: data.agentId,
                type: data.type,
                title: data.title,
                titleAr: data.titleAr || null,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
                depositCommission: data.depositCommission || null,
                withdrawCommission: data.withdrawCommission || null,
                creditLimit: data.creditLimit || null,
                clauses: data.clauses ? JSON.stringify(data.clauses) : null,
                customTerms: data.customTerms || null,
                notes: data.notes || null,
                status: data.status,
                fileUrl: data.fileUrl || null, // S3 URL for uploaded PDF
                createdBy: payload.userId,
                // Admin signs immediately if status is ACTIVE
                signedByAdmin: data.status === 'ACTIVE',
                adminSignedAt: data.status === 'ACTIVE' ? new Date() : null,
            },
            include: {
                agent: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                fullNameAr: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: payload.userId,
                action: 'CONTRACT_CREATED',
                entity: 'Contract',
                entityId: contract.id,
                newValue: JSON.stringify({
                    contractNumber,
                    agentId: data.agentId,
                    type: data.type,
                    status: data.status,
                }),
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
            },
        });

        // Notify agent
        await prisma.notification.create({
            data: {
                userId: agent.userId,
                type: 'SYSTEM',
                title: '📄 عقد جديد',
                titleAr: '📄 عقد جديد',
                message: `A new contract "${data.title}" has been created for you`,
                messageAr: `تم إنشاء عقد جديد "${data.titleAr || data.title}" لك`,
            },
        });

        return NextResponse.json(
            { success: true, contract },
            { status: 201, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Create contract error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
