/**
 * API: Held Transactions Management
 * GET - Get held transactions
 * POST - Release or cancel held transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// Verify admin access
async function verifyAdmin(request: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) {
        return null;
    }

    const payload = verifyAccessToken(token);
    if (!payload || payload.userType !== 'ADMIN') {
        return null;
    }

    return payload;
}

// GET: Get held transactions
export async function GET(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const held = await prisma.heldTransaction.findMany({
            where: { status: 'HELD' },
            orderBy: { createdAt: 'desc' },
        });

        // Get transaction details
        const heldWithDetails = await Promise.all(
            held.map(async (h) => {
                const transaction = await prisma.transaction.findUnique({
                    where: { id: h.transactionId },
                    include: {
                        sender: { select: { fullName: true, phone: true } },
                        receiver: { select: { fullName: true, phone: true } },
                    },
                });
                return { ...h, transaction };
            })
        );

        return NextResponse.json(
            { heldTransactions: heldWithDetails },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Held transactions error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST: Release or cancel held transaction
export async function POST(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const { heldId, action, notes } = body;

        if (!heldId || !action) {
            return NextResponse.json(
                { error: 'Missing heldId or action' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        if (!['RELEASE', 'CANCEL'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be RELEASE or CANCEL' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const held = await prisma.heldTransaction.findUnique({
            where: { id: heldId },
        });

        if (!held || held.status !== 'HELD') {
            return NextResponse.json(
                { error: 'Transaction not found or already processed' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        if (action === 'RELEASE') {
            // Release the transaction
            await prisma.$transaction([
                prisma.heldTransaction.update({
                    where: { id: heldId },
                    data: {
                        status: 'RELEASED',
                        releasedBy: admin.userId,
                        releasedAt: new Date(),
                        releaseNotes: notes,
                    },
                }),
                prisma.transaction.update({
                    where: { id: held.transactionId },
                    data: { status: 'COMPLETED', completedAt: new Date() },
                }),
            ]);
        } else {
            // Cancel the transaction
            await prisma.$transaction([
                prisma.heldTransaction.update({
                    where: { id: heldId },
                    data: {
                        status: 'CANCELLED',
                        releasedBy: admin.userId,
                        releasedAt: new Date(),
                        releaseNotes: notes,
                    },
                }),
                prisma.transaction.update({
                    where: { id: held.transactionId },
                    data: { status: 'CANCELLED' },
                }),
            ]);

            // TODO: Refund sender if money was already deducted
        }

        return NextResponse.json(
            { success: true, action },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Held transaction action error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
