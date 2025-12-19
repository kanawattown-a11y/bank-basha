/**
 * API: Daily Snapshots Management
 * GET - Get snapshot history
 * POST - Trigger manual snapshot
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

// GET: Get snapshot history
export async function GET(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '30');

        const snapshots = await prisma.dailySnapshot.findMany({
            orderBy: { snapshotDate: 'desc' },
            take: limit,
        });

        // Calculate integrity status
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const completedSnapshots = snapshots.filter(
            (s) => s.status === 'COMPLETED' && new Date(s.snapshotDate) >= thirtyDaysAgo
        );

        return NextResponse.json(
            {
                snapshots,
                stats: {
                    total: snapshots.length,
                    completedLast30Days: completedSnapshots.length,
                    lastSnapshot: snapshots[0]?.snapshotDate || null,
                },
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get snapshots error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST: Trigger manual snapshot (local only, no S3)
export async function POST(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const snapshotDate = new Date();
        snapshotDate.setHours(0, 0, 0, 0);

        // Check if snapshot already exists for today
        const existing = await prisma.dailySnapshot.findUnique({
            where: { snapshotDate },
        });

        if (existing && existing.status === 'COMPLETED') {
            return NextResponse.json(
                { error: 'Snapshot already exists for today', snapshot: existing },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Collect statistics
        const [users, agents, merchants, wallets, transactions] = await Promise.all([
            prisma.user.count({ where: { userType: 'USER' } }),
            prisma.agentProfile.count(),
            prisma.merchantProfile.count(),
            prisma.wallet.findMany(),
            prisma.transaction.findMany({ where: { status: 'COMPLETED' } }),
        ]);

        const totalUserBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
        const agentProfiles = await prisma.agentProfile.findMany();
        const totalAgentCredit = agentProfiles.reduce((sum, a) => sum + a.currentCredit, 0);
        const totalAgentCash = agentProfiles.reduce((sum, a) => sum + a.cashCollected, 0);
        const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

        // Get internal accounts
        const systemReserve = await prisma.internalAccount.findUnique({
            where: { code: 'SYS-RESERVE' },
        });
        const feesAccount = await prisma.internalAccount.findUnique({
            where: { code: 'FEES-COLLECTED' },
        });

        // Create or update snapshot
        const snapshot = await prisma.dailySnapshot.upsert({
            where: { snapshotDate },
            create: {
                snapshotDate,
                status: 'COMPLETED',
                completedAt: new Date(),
                totalUsers: users,
                totalAgents: agents,
                totalMerchants: merchants,
                totalUserBalance,
                totalAgentCredit,
                totalAgentCash,
                totalMerchantBalance: 0,
                systemReserve: systemReserve?.balance || 0,
                feesCollected: feesAccount?.balance || 0,
                totalTransactions: transactions.length,
                totalVolume,
            },
            update: {
                status: 'COMPLETED',
                completedAt: new Date(),
                totalUsers: users,
                totalAgents: agents,
                totalMerchants: merchants,
                totalUserBalance,
                totalAgentCredit,
                totalAgentCash,
                totalMerchantBalance: 0,
                systemReserve: systemReserve?.balance || 0,
                feesCollected: feesAccount?.balance || 0,
                totalTransactions: transactions.length,
                totalVolume,
            },
        });

        return NextResponse.json(
            { success: true, snapshot },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Create snapshot error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
