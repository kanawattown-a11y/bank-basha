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

        // Recalculate balances using optimized aggregation (no memory overflow)
        const [userBalanceUSD, agentCreditUSD, merchantBalanceUSD, totalFeesUSD] = await Promise.all([
            // User balances (USD)
            prisma.wallet.aggregate({
                _sum: { balance: true },
                where: {
                    user: { userType: 'USER' },
                    currency: 'USD',
                    walletType: 'PERSONAL'
                }
            }),
            // Agent credit (USD)
            prisma.agentProfile.aggregate({
                _sum: { currentCredit: true }
            }),
            // Merchant balances (USD)
            prisma.wallet.aggregate({
                _sum: { balance: true },
                where: {
                    user: { userType: 'MERCHANT' },
                    currency: 'USD',
                    walletType: 'BUSINESS'
                }
            }),
            // Platform fees (USD only for now)
            prisma.transaction.aggregate({
                _sum: { platformFee: true },
                where: {
                    status: 'COMPLETED',
                    currency: 'USD'
                }
            })
        ]);

        // Extract values
        const actualUserBalance = userBalanceUSD._sum.balance || 0;
        const actualAgentCredit = agentCreditUSD._sum.currentCredit || 0;
        const actualMerchantBalance = merchantBalanceUSD._sum.balance || 0;
        const actualFees = totalFeesUSD._sum.platformFee || 0;

        // Update internal accounts
        await prisma.$transaction([
            prisma.internalAccount.upsert({
                where: { code: 'USR-LEDGER' },
                update: { balance: actualUserBalance },
                create: { code: 'USR-LEDGER', name: 'Users Ledger', nameAr: 'دفتر المستخدمين', type: 'USERS_LEDGER', balance: actualUserBalance },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'AGT-LEDGER' },
                update: { balance: actualAgentCredit },
                create: { code: 'AGT-LEDGER', name: 'Agents Ledger', nameAr: 'دفتر الوكلاء', type: 'AGENTS_LEDGER', balance: actualAgentCredit },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'MRC-LEDGER' },
                update: { balance: actualMerchantBalance },
                create: { code: 'MRC-LEDGER', name: 'Merchants Ledger', nameAr: 'دفتر التجار', type: 'MERCHANTS_LEDGER', balance: actualMerchantBalance },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'FEES-COLLECTED' },
                update: { balance: actualFees },
                create: { code: 'FEES-COLLECTED', name: 'Fees Collected', nameAr: 'الرسوم المحصلة', type: 'FEES', balance: actualFees },
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
                    fees: actualFees,
                    systemReserve: -totalOther,
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
                    fees: actualFees,
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
