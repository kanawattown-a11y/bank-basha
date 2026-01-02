/**
 * API: Internal Accounts (Ledger Separation)
 * GET - Get all internal account balances
 * POST - Verify system balance
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

// GET: Get all internal accounts
export async function GET(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const accounts = await prisma.internalAccount.findMany({
            orderBy: { code: 'asc' },
        });

        // Calculate totals
        const systemReserve = accounts.find(a => a.code === 'SYS-RESERVE')?.balance || 0;
        const otherTotal = accounts
            .filter(a => a.code !== 'SYS-RESERVE')
            .reduce((sum, a) => sum + a.balance, 0);

        const isBalanced = Math.abs(systemReserve + otherTotal) < 0.01;

        return NextResponse.json(
            {
                accounts,
                summary: {
                    systemReserve,
                    otherTotal,
                    difference: systemReserve + otherTotal,
                    isBalanced,
                },
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get internal accounts error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST: Verify and sync balances
export async function POST(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        // Recalculate balances from actual data
        const [allWallets, agentProfiles] = await Promise.all([
            prisma.wallet.findMany({
                where: { userId: { not: undefined } },
                include: { user: { select: { userType: true } } },
            }),
            prisma.agentProfile.findMany(),
        ]);

        // Calculate actual totals
        const actualUserBalance = allWallets
            .filter(w => w.user?.userType === 'USER')
            .reduce((sum, w) => sum + w.balance, 0);

        const actualAgentCredit = agentProfiles.reduce((sum, a) => sum + a.currentCredit, 0);

        const actualMerchantBalance = allWallets
            .filter(w => w.user?.userType === 'MERCHANT')
            .reduce((sum, w) => sum + w.balance, 0);

        // Get fees from completed transactions
        const totalFees = await prisma.transaction.aggregate({
            _sum: { platformFee: true },
            where: { status: 'COMPLETED' },
        });

        // Update internal accounts
        await prisma.$transaction([
            prisma.internalAccount.upsert({
                where: { code: 'USR-LEDGER' },
                update: { balance: actualUserBalance },
                create: { code: 'USR-LEDGER', name: 'Users Ledger', type: 'USERS_LEDGER', balance: actualUserBalance },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'AGT-LEDGER' },
                update: { balance: actualAgentCredit },
                create: { code: 'AGT-LEDGER', name: 'Agents Ledger', type: 'AGENTS_LEDGER', balance: actualAgentCredit },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'MRC-LEDGER' },
                update: { balance: actualMerchantBalance },
                create: { code: 'MRC-LEDGER', name: 'Merchants Ledger', type: 'MERCHANTS_LEDGER', balance: actualMerchantBalance },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'FEES-COLLECTED' },
                update: { balance: totalFees._sum.platformFee || 0 },
                create: { code: 'FEES-COLLECTED', name: 'Fees Collected', type: 'FEES', balance: totalFees._sum.platformFee || 0 },
            }),
        ]);

        // Update system reserve to balance everything
        const allAccounts = await prisma.internalAccount.findMany({
            where: { code: { not: 'SYS-RESERVE' } },
        });
        const totalOther = allAccounts.reduce((sum, a) => sum + a.balance, 0);

        await prisma.internalAccount.upsert({
            where: { code: 'SYS-RESERVE' },
            update: { balance: -totalOther },
            create: { code: 'SYS-RESERVE', name: 'System Reserve', type: 'SYSTEM_RESERVE', balance: -totalOther },
        });

        // Log the sync
        await prisma.auditLog.create({
            data: {
                userId: admin.userId,
                action: 'SYNC_INTERNAL_ACCOUNTS',
                entity: 'InternalAccount',
                newValue: JSON.stringify({
                    userBalance: actualUserBalance,
                    agentCredit: actualAgentCredit,
                    merchantBalance: actualMerchantBalance,
                    fees: totalFees._sum.platformFee,
                }),
            },
        });

        return NextResponse.json(
            {
                success: true,
                synced: {
                    userBalance: actualUserBalance,
                    agentCredit: actualAgentCredit,
                    merchantBalance: actualMerchantBalance,
                    fees: totalFees._sum.platformFee || 0,
                    systemReserve: -totalOther,
                },
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Sync internal accounts error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
