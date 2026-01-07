/**
 * Platform Profits API
 * GET - Get profit statistics and history
 * POST - Withdraw profits
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, generateReferenceNumber } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const withdrawSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    currency: z.enum(['USD', 'SYP']),
    method: z.enum(['BANK_TRANSFER', 'CASH', 'CRYPTO']),
    notes: z.string().optional(),
    bankDetails: z.object({
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        iban: z.string().optional(),
    }).optional(),
});

// GET: Get profit statistics
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
        if (!payload || payload.userType !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'all'; // today, week, month, year, all

        // Get date range based on period
        const now = new Date();
        let startDate: Date | undefined;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
        }

        // Get fee accounts balances
        const [feesAccountUSD, feesAccountSYP] = await Promise.all([
            prisma.internalAccount.findUnique({ where: { code: 'FEES-COLLECTED' } }),
            prisma.internalAccount.findUnique({ where: { code: 'FEES-COLLECTED-SYP' } }),
        ]);

        // Get platform fees from transactions
        const transactionWhere: any = {
            status: 'COMPLETED',
            platformFee: { gt: 0 },
        };
        if (startDate) {
            transactionWhere.createdAt = { gte: startDate };
        }

        const [feesUSD, feesSYP] = await Promise.all([
            prisma.transaction.aggregate({
                _sum: { platformFee: true },
                _count: true,
                where: { ...transactionWhere, currency: 'USD' },
            }),
            prisma.transaction.aggregate({
                _sum: { platformFee: true },
                _count: true,
                where: { ...transactionWhere, currency: 'SYP' },
            }),
        ]);

        // Get fees by transaction type
        const feesByType = await prisma.transaction.groupBy({
            by: ['type', 'currency'],
            _sum: { platformFee: true },
            _count: true,
            where: transactionWhere,
        });

        // Get withdrawal history
        const withdrawals = await prisma.profitWithdrawal.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                admin: {
                    select: { fullName: true, fullNameAr: true },
                },
            },
        });

        // Get total withdrawn
        const [totalWithdrawnUSD, totalWithdrawnSYP] = await Promise.all([
            prisma.profitWithdrawal.aggregate({
                _sum: { amount: true },
                where: { currency: 'USD', status: 'COMPLETED' },
            }),
            prisma.profitWithdrawal.aggregate({
                _sum: { amount: true },
                where: { currency: 'SYP', status: 'COMPLETED' },
            }),
        ]);

        // Daily profit chart (last 30 days)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const dailyProfits = await prisma.transaction.groupBy({
            by: ['currency'],
            _sum: { platformFee: true },
            where: {
                status: 'COMPLETED',
                platformFee: { gt: 0 },
                createdAt: { gte: thirtyDaysAgo },
            },
        });

        return NextResponse.json({
            // Current balances
            availableBalance: {
                USD: feesAccountUSD?.balance || 0,
                SYP: feesAccountSYP?.balance || 0,
            },
            // Period stats
            periodStats: {
                feesUSD: feesUSD._sum.platformFee || 0,
                feesSYP: feesSYP._sum.platformFee || 0,
                transactionsUSD: feesUSD._count,
                transactionsSYP: feesSYP._count,
            },
            // Breakdown by type
            feesByType: feesByType.map(f => ({
                type: f.type,
                currency: f.currency,
                total: f._sum.platformFee || 0,
                count: f._count,
            })),
            // Withdrawal info
            totalWithdrawn: {
                USD: totalWithdrawnUSD._sum.amount || 0,
                SYP: totalWithdrawnSYP._sum.amount || 0,
            },
            withdrawals,
            // Chart data
            dailyProfits,
        }, { headers: getSecurityHeaders() });

    } catch (error) {
        console.error('Platform profits error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST: Withdraw profits
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
        const result = withdrawSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { amount, currency, method, notes, bankDetails } = result.data;

        // Get fees account
        const accountCode = currency === 'SYP' ? 'FEES-COLLECTED-SYP' : 'FEES-COLLECTED';
        const feesAccount = await prisma.internalAccount.findUnique({
            where: { code: accountCode },
        });

        if (!feesAccount || feesAccount.balance < amount) {
            return NextResponse.json(
                { error: 'رصيد الأرباح غير كافي' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Process withdrawal in transaction
        const referenceNumber = generateReferenceNumber('PWD');

        await prisma.$transaction(async (tx) => {
            // Deduct from fees account
            await tx.internalAccount.update({
                where: { code: accountCode },
                data: { balance: { decrement: amount } },
            });

            // Create withdrawal record
            await tx.profitWithdrawal.create({
                data: {
                    referenceNumber,
                    adminId: payload.userId,
                    amount,
                    currency,
                    method,
                    notes,
                    bankName: bankDetails?.bankName,
                    accountNumber: bankDetails?.accountNumber,
                    iban: bankDetails?.iban,
                    status: 'COMPLETED',
                    completedAt: new Date(),
                },
            });

            // Create ledger entry
            const { createLedgerEntry, INTERNAL_ACCOUNTS } = await import('@/lib/financial/core-ledger');
            await createLedgerEntry({
                description: `Profit Withdrawal: ${referenceNumber}`,
                descriptionAr: `سحب أرباح: ${referenceNumber}`,
                createdBy: payload.userId,
                currency,
                tx,
                lines: [
                    { accountCode: INTERNAL_ACCOUNTS.FEES, debit: amount, credit: 0 },
                    { accountCode: INTERNAL_ACCOUNTS.SYSTEM_RESERVE, debit: 0, credit: amount },
                ],
            });
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: payload.userId,
                action: 'PROFIT_WITHDRAWAL',
                entity: 'ProfitWithdrawal',
                entityId: referenceNumber,
                newValue: JSON.stringify({ amount, currency, method }),
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
            },
        });

        return NextResponse.json({
            success: true,
            referenceNumber,
        }, { headers: getSecurityHeaders() });

    } catch (error) {
        console.error('Profit withdrawal error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
