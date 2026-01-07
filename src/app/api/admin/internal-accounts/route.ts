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

        // Recalculate balances using optimized aggregation - USD
        const [userBalanceUSD, agentCreditUSD, merchantBalanceUSD, totalFeesUSD] = await Promise.all([
            prisma.wallet.aggregate({
                _sum: { balance: true },
                where: {
                    user: { userType: 'USER' },
                    currency: 'USD',
                    walletType: 'PERSONAL'
                }
            }),
            prisma.agentProfile.aggregate({
                _sum: { currentCredit: true }
            }),
            prisma.wallet.aggregate({
                _sum: { balance: true },
                where: {
                    user: { userType: 'MERCHANT' },
                    currency: 'USD',
                    walletType: 'BUSINESS'
                }
            }),
            prisma.transaction.aggregate({
                _sum: { platformFee: true },
                where: {
                    status: 'COMPLETED',
                    currency: 'USD'
                }
            })
        ]);

        // Recalculate SYP balances - Wallets and Fees
        const [userBalanceSYP, merchantBalanceSYP, totalFeesSYP] = await Promise.all([
            prisma.wallet.aggregate({
                _sum: { balance: true },
                where: {
                    user: { userType: 'USER' },
                    currency: 'SYP',
                    walletType: 'PERSONAL'
                }
            }),
            prisma.wallet.aggregate({
                _sum: { balance: true },
                where: {
                    user: { userType: 'MERCHANT' },
                    currency: 'SYP',
                    walletType: 'BUSINESS'
                }
            }),
            prisma.transaction.aggregate({
                _sum: { platformFee: true },
                where: {
                    status: 'COMPLETED',
                    currency: 'SYP'
                }
            })
        ]);

        // Get SYP agent credit using raw query to avoid type issues
        const agentCreditsSYP = await prisma.$queryRaw<{ total: number }[]>`
            SELECT COALESCE(SUM("currentCreditSYP"), 0) as total FROM "AgentProfile"
        `;

        // Extract USD values
        const actualUserBalanceUSD = userBalanceUSD._sum.balance || 0;
        const actualAgentCreditUSD = agentCreditUSD._sum.currentCredit || 0;
        const actualMerchantBalanceUSD = merchantBalanceUSD._sum.balance || 0;
        const actualFeesUSD = totalFeesUSD._sum.platformFee || 0;

        // Extract SYP values
        const actualUserBalanceSYP = userBalanceSYP._sum.balance || 0;
        const actualAgentCreditSYP = Number(agentCreditsSYP[0]?.total) || 0;
        const actualMerchantBalanceSYP = merchantBalanceSYP._sum.balance || 0;
        const actualFeesSYP = totalFeesSYP._sum.platformFee || 0;

        // Update internal accounts - USD
        await prisma.$transaction([
            prisma.internalAccount.upsert({
                where: { code: 'USR-LEDGER' },
                update: { balance: actualUserBalanceUSD },
                create: { code: 'USR-LEDGER', name: 'Users Ledger (USD)', nameAr: 'دفتر المستخدمين (دولار)', type: 'USERS_LEDGER', balance: actualUserBalanceUSD },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'AGT-LEDGER' },
                update: { balance: actualAgentCreditUSD },
                create: { code: 'AGT-LEDGER', name: 'Agents Ledger (USD)', nameAr: 'دفتر الوكلاء (دولار)', type: 'AGENTS_LEDGER', balance: actualAgentCreditUSD },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'MRC-LEDGER' },
                update: { balance: actualMerchantBalanceUSD },
                create: { code: 'MRC-LEDGER', name: 'Merchants Ledger (USD)', nameAr: 'دفتر التجار (دولار)', type: 'MERCHANTS_LEDGER', balance: actualMerchantBalanceUSD },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'FEES-COLLECTED' },
                update: { balance: actualFeesUSD },
                create: { code: 'FEES-COLLECTED', name: 'Fees Collected (USD)', nameAr: 'الرسوم المحصلة (دولار)', type: 'FEES', balance: actualFeesUSD },
            }),
            // SYP Accounts
            prisma.internalAccount.upsert({
                where: { code: 'USR-LEDGER-SYP' },
                update: { balance: actualUserBalanceSYP },
                create: { code: 'USR-LEDGER-SYP', name: 'Users Ledger (SYP)', nameAr: 'دفتر المستخدمين (ليرة)', type: 'USERS_LEDGER', balance: actualUserBalanceSYP },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'AGT-LEDGER-SYP' },
                update: { balance: actualAgentCreditSYP },
                create: { code: 'AGT-LEDGER-SYP', name: 'Agents Ledger (SYP)', nameAr: 'دفتر الوكلاء (ليرة)', type: 'AGENTS_LEDGER', balance: actualAgentCreditSYP },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'MRC-LEDGER-SYP' },
                update: { balance: actualMerchantBalanceSYP },
                create: { code: 'MRC-LEDGER-SYP', name: 'Merchants Ledger (SYP)', nameAr: 'دفتر التجار (ليرة)', type: 'MERCHANTS_LEDGER', balance: actualMerchantBalanceSYP },
            }),
            prisma.internalAccount.upsert({
                where: { code: 'FEES-COLLECTED-SYP' },
                update: { balance: actualFeesSYP },
                create: { code: 'FEES-COLLECTED-SYP', name: 'Fees Collected (SYP)', nameAr: 'الرسوم المحصلة (ليرة)', type: 'FEES', balance: actualFeesSYP },
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
                    USD: {
                        userBalance: actualUserBalanceUSD,
                        agentCredit: actualAgentCreditUSD,
                        merchantBalance: actualMerchantBalanceUSD,
                        fees: actualFeesUSD,
                    },
                    SYP: {
                        userBalance: actualUserBalanceSYP,
                        agentCredit: actualAgentCreditSYP,
                        merchantBalance: actualMerchantBalanceSYP,
                        fees: actualFeesSYP,
                    },
                    systemReserve: -totalOther,
                }),
            },
        });

        return NextResponse.json(
            {
                success: true,
                synced: {
                    USD: {
                        userBalance: actualUserBalanceUSD,
                        agentCredit: actualAgentCreditUSD,
                        merchantBalance: actualMerchantBalanceUSD,
                        fees: actualFeesUSD,
                    },
                    SYP: {
                        userBalance: actualUserBalanceSYP,
                        agentCredit: actualAgentCreditSYP,
                        merchantBalance: actualMerchantBalanceSYP,
                        fees: actualFeesSYP,
                    },
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
