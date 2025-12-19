import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { softDelete } from '@/lib/db/soft-delete';

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

        const agentId = params.id;

        // Get agent with full details
        const agent = await prisma.user.findUnique({
            where: { id: agentId, userType: 'AGENT' },
            include: {
                wallet: true,
                agentProfile: true,
            },
        });

        if (!agent || !agent.agentProfile) {
            return NextResponse.json(
                { error: 'Agent not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Get agent transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { senderId: agentId },
                    { receiverId: agentId },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                sender: {
                    select: { fullName: true },
                },
                receiver: {
                    select: { fullName: true },
                },
            },
        });

        // Get settlements
        const settlements = await prisma.settlement.findMany({
            where: { agentId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        return NextResponse.json(
            {
                agent: {
                    id: agent.id,
                    fullName: agent.fullName,
                    phone: agent.phone,
                    email: agent.email,
                    dateOfBirth: agent.dateOfBirth,
                    city: agent.city,
                    address: agent.address,
                    kycStatus: agent.kycStatus,
                    isActive: agent.isActive,
                    idPhotoUrl: agent.idPhotoUrl,
                    selfiePhotoUrl: agent.selfiePhotoUrl,
                    kycSubmittedAt: agent.kycSubmittedAt,
                    kycReviewedAt: agent.kycReviewedAt,
                    kycRejectionReason: agent.kycRejectionReason,
                    createdAt: agent.createdAt,
                    wallet: agent.wallet,
                    agentProfile: agent.agentProfile,
                },
                transactions: transactions.map(t => ({
                    ...t,
                    isOutgoing: t.senderId === agentId,
                    counterparty: t.senderId === agentId
                        ? t.receiver?.fullName || 'N/A'
                        : t.sender?.fullName || 'N/A',
                })),
                settlements,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get agent error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// DELETE - Soft delete an agent
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

        // Note: params.id is the user ID, not agent profile ID
        // Need to find the agent profile first
        const agent = await prisma.agentProfile.findUnique({
            where: { userId: params.id },
        });

        if (!agent) {
            return NextResponse.json(
                { error: 'Agent not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        await softDelete({
            model: 'agentProfile',
            id: agent.id,
            deletedBy: payload.userId,
            reason: 'Deleted by admin',
        });

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error deleting agent:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
