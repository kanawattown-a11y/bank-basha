import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const updateContractSchema = z.object({
    title: z.string().optional(),
    titleAr: z.string().optional(),
    startDate: z.string().optional(),
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
    status: z.enum(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED']).optional(),
    signedByAdmin: z.boolean().optional(),
    signedByAgent: z.boolean().optional(),
    terminationReason: z.string().optional(),
    fileUrl: z.string().optional(),
});

// GET - Get contract details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        const contract = await prisma.contract.findUnique({
            where: { id },
            include: {
                agent: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                fullNameAr: true,
                                phone: true,
                                email: true,
                                city: true,
                            },
                        },
                    },
                },
            },
        });

        if (!contract) {
            return NextResponse.json(
                { error: 'Contract not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        return NextResponse.json(
            { contract },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get contract error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// PUT - Update contract
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        const existingContract = await prisma.contract.findUnique({
            where: { id },
        });

        if (!existingContract) {
            return NextResponse.json(
                { error: 'Contract not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const result = updateContractSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const data = result.data;

        // Build update data
        const updateData: any = {
            updatedBy: payload.userId,
        };

        if (data.title !== undefined) updateData.title = data.title;
        if (data.titleAr !== undefined) updateData.titleAr = data.titleAr;
        if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
        if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
        if (data.depositCommission !== undefined) updateData.depositCommission = data.depositCommission;
        if (data.withdrawCommission !== undefined) updateData.withdrawCommission = data.withdrawCommission;
        if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit;
        if (data.clauses !== undefined) updateData.clauses = JSON.stringify(data.clauses);
        if (data.customTerms !== undefined) updateData.customTerms = data.customTerms;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;

        // Status change
        if (data.status !== undefined) {
            updateData.status = data.status;

            if (data.status === 'TERMINATED' || data.status === 'CANCELLED') {
                updateData.terminatedAt = new Date();
                updateData.terminatedBy = payload.userId;
                if (data.terminationReason) {
                    updateData.terminationReason = data.terminationReason;
                }
            }
        }

        // Admin signature
        if (data.signedByAdmin !== undefined) {
            updateData.signedByAdmin = data.signedByAdmin;
            if (data.signedByAdmin) {
                updateData.adminSignedAt = new Date();
            }
        }

        // Agent signature (admin can mark as signed)
        if (data.signedByAgent !== undefined) {
            updateData.signedByAgent = data.signedByAgent;
            if (data.signedByAgent) {
                updateData.agentSignedAt = new Date();
            }
        }

        const contract = await prisma.contract.update({
            where: { id },
            data: updateData,
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
                action: 'CONTRACT_UPDATED',
                entity: 'Contract',
                entityId: contract.id,
                oldValue: JSON.stringify(existingContract),
                newValue: JSON.stringify(updateData),
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
            },
        });

        return NextResponse.json(
            { success: true, contract },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Update contract error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// DELETE - Delete contract
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        const contract = await prisma.contract.findUnique({
            where: { id },
        });

        if (!contract) {
            return NextResponse.json(
                { error: 'Contract not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Delete contract
        await prisma.contract.delete({
            where: { id },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: payload.userId,
                action: 'CONTRACT_DELETED',
                entity: 'Contract',
                entityId: id,
                oldValue: JSON.stringify(contract),
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
            },
        });

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Delete contract error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
