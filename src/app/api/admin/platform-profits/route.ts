/**
 * Platform Profits API
 * GET - Get profit statistics and history
 * POST - Withdraw profits (to bank/cash OR to user wallet)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, generateReferenceNumber, sanitizePhoneNumber } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const withdrawSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    currency: z.enum(['USD', 'SYP']),
    method: z.enum(['BANK_TRANSFER', 'CASH', 'CRYPTO', 'USER_WALLET']),
    notes: z.string().optional(),
    // For bank transfer
    bankDetails: z.object({
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        iban: z.string().optional(),
    }).optional(),
    // For user wallet transfer
    phone: z.string().optional(),
    walletType: z.enum(['PERSONAL', 'BUSINESS']).optional(),
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
        const period = searchParams.get('period') || 'all';

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

        const [feesAccountUSD, feesAccountSYP] = await Promise.all([
            prisma.internalAccount.findUnique({ where: { code: 'FEES-COLLECTED' } }),
            prisma.internalAccount.findUnique({ where: { code: 'FEES-COLLECTED-SYP' } }),
        ]);

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

        const feesByType = await prisma.transaction.groupBy({
            by: ['type', 'currency'],
            _sum: { platformFee: true },
            _count: true,
            where: transactionWhere,
        });

        const withdrawals = await prisma.profitWithdrawal.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                admin: {
                    select: { fullName: true, fullNameAr: true },
                },
            },
        });

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
            availableBalance: {
                USD: feesAccountUSD?.balance || 0,
                SYP: feesAccountSYP?.balance || 0,
            },
            periodStats: {
                feesUSD: feesUSD._sum.platformFee || 0,
                feesSYP: feesSYP._sum.platformFee || 0,
                transactionsUSD: feesUSD._count,
                transactionsSYP: feesSYP._count,
            },
            feesByType: feesByType.map(f => ({
                type: f.type,
                currency: f.currency,
                total: f._sum.platformFee || 0,
                count: f._count,
            })),
            totalWithdrawn: {
                USD: totalWithdrawnUSD._sum.amount || 0,
                SYP: totalWithdrawnSYP._sum.amount || 0,
            },
            withdrawals,
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

        const { amount, currency, method, notes, bankDetails, phone, walletType } = result.data;

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

        const referenceNumber = generateReferenceNumber('PWD');
        let recipientName = '';

        // ═══════════════════════════════════════════════════════════════
        // WITHDRAW TO USER WALLET
        // ═══════════════════════════════════════════════════════════════
        if (method === 'USER_WALLET') {
            if (!phone) {
                return NextResponse.json(
                    { error: 'رقم الهاتف مطلوب للتحويل إلى المحفظة' },
                    { status: 400, headers: getSecurityHeaders() }
                );
            }

            const sanitizedPhone = sanitizePhoneNumber(phone);

            // Find user by phone
            const targetUser = await prisma.user.findUnique({
                where: { phone: sanitizedPhone },
                include: {
                    wallets: true,
                },
            });

            if (!targetUser) {
                return NextResponse.json(
                    { error: 'لم يتم العثور على مستخدم بهذا الرقم' },
                    { status: 404, headers: getSecurityHeaders() }
                );
            }

            // Find the correct wallet
            const targetWalletType = walletType || 'PERSONAL';
            const targetWallet = targetUser.wallets.find(
                w => w.currency === currency && w.walletType === targetWalletType
            );

            if (!targetWallet) {
                return NextResponse.json(
                    { error: `لا توجد محفظة ${currency} للمستخدم` },
                    { status: 404, headers: getSecurityHeaders() }
                );
            }

            recipientName = targetUser.fullNameAr || targetUser.fullName;

            // Process in transaction
            await prisma.$transaction(async (tx) => {
                // 1. Deduct from fees account
                await tx.internalAccount.update({
                    where: { code: accountCode },
                    data: { balance: { decrement: amount } },
                });

                // 2. Add to user wallet
                await tx.wallet.update({
                    where: { id: targetWallet.id },
                    data: { balance: { increment: amount } },
                });

                // 3. Create transaction record
                await tx.transaction.create({
                    data: {
                        referenceNumber,
                        type: 'DEPOSIT',
                        amount,
                        netAmount: amount,
                        currency,
                        status: 'COMPLETED',
                        receiverId: targetUser.id,
                        description: `Platform profit distribution`,
                        descriptionAr: `توزيع أرباح المنصة`,
                        completedAt: new Date(),
                    },
                });

                // 4. Create withdrawal record
                await tx.profitWithdrawal.create({
                    data: {
                        referenceNumber,
                        adminId: payload.userId,
                        amount,
                        currency,
                        method: 'USER_WALLET',
                        notes: notes || `تحويل إلى ${recipientName}`,
                        accountNumber: sanitizedPhone,
                        status: 'COMPLETED',
                        completedAt: new Date(),
                    },
                });

                // 5. Create ledger entry
                const { createLedgerEntry, INTERNAL_ACCOUNTS } = await import('@/lib/financial/core-ledger');
                await createLedgerEntry({
                    description: `Profit Distribution to ${sanitizedPhone}: ${referenceNumber}`,
                    descriptionAr: `توزيع أرباح إلى ${recipientName}: ${referenceNumber}`,
                    createdBy: payload.userId,
                    currency,
                    tx,
                    lines: [
                        { accountCode: INTERNAL_ACCOUNTS.FEES, debit: amount, credit: 0 },
                        { accountCode: INTERNAL_ACCOUNTS.USERS_LEDGER, debit: 0, credit: amount },
                    ],
                });
            });

            // Send notification to user
            await prisma.notification.create({
                data: {
                    userId: targetUser.id,
                    type: 'TRANSACTION',
                    title: 'Profit Distribution Received',
                    titleAr: 'استلام أرباح',
                    message: `You received ${currency === 'SYP' ? `${amount.toLocaleString()} SYP` : `$${amount.toFixed(2)}`} from platform profits`,
                    messageAr: `استلمت ${currency === 'SYP' ? `${amount.toLocaleString()} ل.س` : `$${amount.toFixed(2)}`} من أرباح المنصة`,
                },
            });

        } else {
            // ═══════════════════════════════════════════════════════════════
            // EXTERNAL WITHDRAWAL (Bank, Cash, Crypto)
            // ═══════════════════════════════════════════════════════════════
            await prisma.$transaction(async (tx) => {
                await tx.internalAccount.update({
                    where: { code: accountCode },
                    data: { balance: { decrement: amount } },
                });

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
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: payload.userId,
                action: 'PROFIT_WITHDRAWAL',
                entity: 'ProfitWithdrawal',
                entityId: referenceNumber,
                newValue: JSON.stringify({ amount, currency, method, phone, recipientName }),
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
            },
        });

        return NextResponse.json({
            success: true,
            referenceNumber,
            recipientName: recipientName || undefined,
        }, { headers: getSecurityHeaders() });

    } catch (error) {
        console.error('Profit withdrawal error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
