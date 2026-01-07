/**
 * Core Financial System - Double Entry Ledger
 * Bank Basha - Financial Stability Engine
 * 
 * IMMUTABLE LEDGER: No modifications allowed, only reversals
 * DOUBLE ENTRY: Every transaction has equal debits and credits
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export interface LedgerLine {
    accountCode: string;
    debit: number;
    credit: number;
    description?: string;
}

export interface LedgerEntryInput {
    description: string;
    descriptionAr?: string;
    transactionId?: string;
    lines: LedgerLine[];
    createdBy?: string;
    currency?: 'USD' | 'SYP';  // Currency for balance field selection
}

export interface TransactionContext {
    userId: string;
    amount: number;
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
}

// ============================================
// INTERNAL ACCOUNT CODES
// ============================================

export const INTERNAL_ACCOUNTS = {
    SYSTEM_RESERVE: 'SYS-RESERVE',      // البنك المركزي - مصدر الأموال
    USERS_LEDGER: 'USR-LEDGER',          // حساب المستخدمين
    MERCHANTS_LEDGER: 'MRC-LEDGER',      // حساب التجار
    AGENTS_LEDGER: 'AGT-LEDGER',         // حساب الوكلاء
    SETTLEMENTS: 'SETTLEMENTS',           // حساب التسويات
    FEES: 'FEES-COLLECTED',               // حساب العمولات
    SUSPENSE: 'SUSPENSE',                 // حساب معلق للمعاملات المجمدة
} as const;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize LedgerAccount table (required for double-entry ledger)
 * This MUST be run before any transactions - these are the GL accounts
 */
export async function initializeLedgerAccounts(): Promise<void> {
    const accounts = [
        { code: INTERNAL_ACCOUNTS.SYSTEM_RESERVE, name: 'System Reserve', nameAr: 'احتياطي النظام', type: 'LIABILITY' },
        { code: INTERNAL_ACCOUNTS.USERS_LEDGER, name: 'Users Ledger', nameAr: 'سجل المستخدمين', type: 'LIABILITY' },
        { code: INTERNAL_ACCOUNTS.MERCHANTS_LEDGER, name: 'Merchants Ledger', nameAr: 'سجل التجار', type: 'LIABILITY' },
        { code: INTERNAL_ACCOUNTS.AGENTS_LEDGER, name: 'Agents Ledger', nameAr: 'سجل الوكلاء', type: 'LIABILITY' },
        { code: INTERNAL_ACCOUNTS.SETTLEMENTS, name: 'Settlements', nameAr: 'التسويات', type: 'LIABILITY' },
        { code: INTERNAL_ACCOUNTS.FEES, name: 'Fees Collected', nameAr: 'الرسوم', type: 'REVENUE' },
        { code: INTERNAL_ACCOUNTS.SUSPENSE, name: 'Suspense', nameAr: 'معلق', type: 'LIABILITY' },
    ];

    for (const acc of accounts) {
        await prisma.ledgerAccount.upsert({
            where: { code: acc.code },
            update: {},
            create: { ...acc, balance: 0, balanceSYP: 0, isSystem: true },
        });
    }
    console.log('✅ LedgerAccount table initialized');
}

/**
 * Initialize internal accounts (run once at setup)
 */
export async function initializeInternalAccounts(): Promise<void> {
    const accounts = [
        {
            code: INTERNAL_ACCOUNTS.SYSTEM_RESERVE,
            name: 'System Reserve',
            nameAr: 'احتياطي النظام',
            type: 'SYSTEM_RESERVE',
            description: 'Central bank reserve - source of all credit',
        },
        {
            code: INTERNAL_ACCOUNTS.USERS_LEDGER,
            name: 'Users Ledger',
            nameAr: 'سجل المستخدمين',
            type: 'USERS_LEDGER',
            description: 'Aggregate of all user balances',
        },
        {
            code: INTERNAL_ACCOUNTS.MERCHANTS_LEDGER,
            name: 'Merchants Ledger',
            nameAr: 'سجل التجار',
            type: 'MERCHANTS_LEDGER',
            description: 'Aggregate of all merchant balances',
        },
        {
            code: INTERNAL_ACCOUNTS.AGENTS_LEDGER,
            name: 'Agents Ledger',
            nameAr: 'سجل الوكلاء',
            type: 'AGENTS_LEDGER',
            description: 'Aggregate of all agent credit balances',
        },
        {
            code: INTERNAL_ACCOUNTS.SETTLEMENTS,
            name: 'Settlements Account',
            nameAr: 'حساب التسويات',
            type: 'SETTLEMENTS',
            description: 'Pending settlements between agents and platform',
        },
        {
            code: INTERNAL_ACCOUNTS.FEES,
            name: 'Fees Collected',
            nameAr: 'العمولات المحصلة',
            type: 'FEES',
            description: 'All platform fees collected',
        },
        {
            code: INTERNAL_ACCOUNTS.SUSPENSE,
            name: 'Suspense Account',
            nameAr: 'حساب معلق',
            type: 'SUSPENSE',
            description: 'Frozen/held transactions pending review',
        },
    ];

    for (const account of accounts) {
        await prisma.internalAccount.upsert({
            where: { code: account.code },
            update: {},
            create: account,
        });
    }

    console.log('✅ InternalAccount table initialized');
}

/**
 * Initialize ALL required accounts (call this at app startup)
 */
export async function initializeAllAccounts(): Promise<void> {
    await initializeLedgerAccounts();
    await initializeInternalAccounts();
    console.log('✅ All financial accounts ready');
}

// ============================================
// DOUBLE ENTRY LEDGER
// ============================================

/**
 * Generate SHA-256 hash for ledger entry
 */
function generateEntryHash(data: object, previousHash?: string): string {
    const content = JSON.stringify({
        ...data,
        previousHash: previousHash || 'GENESIS',
        timestamp: new Date().toISOString(),
    });
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate unique entry number
 */
function generateEntryNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LE-${timestamp}-${random}`;
}

/**
 * Create immutable double-entry ledger entry
 * THROWS if debits !== credits
 */
export async function createLedgerEntry(input: LedgerEntryInput): Promise<string> {
    // Validate double entry
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of input.lines) {
        totalDebit += line.debit || 0;
        totalCredit += line.credit || 0;
    }

    // Must balance within 0.01 tolerance
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(
            `Ledger entry not balanced! Debit: ${totalDebit}, Credit: ${totalCredit}`
        );
    }

    // Get previous entry hash for blockchain-like integrity
    const lastEntry = await prisma.ledgerEntry.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { hash: true },
    });

    const entryNumber = generateEntryNumber();
    const hash = generateEntryHash(
        { entryNumber, description: input.description, lines: input.lines },
        lastEntry?.hash || undefined
    );

    // Create entry with lines in transaction
    const entry = await prisma.$transaction(async (tx) => {
        // Create ledger entry
        const ledgerEntry = await tx.ledgerEntry.create({
            data: {
                entryNumber,
                description: input.description,
                descriptionAr: input.descriptionAr,
                totalDebit,
                totalCredit,
                hash,
                previousHash: lastEntry?.hash || 'GENESIS',
                createdBy: input.createdBy,
            },
        });

        // Create entry lines
        for (const line of input.lines) {
            // Find or error if account doesn't exist
            const account = await tx.ledgerAccount.findUnique({
                where: { code: line.accountCode },
            });

            if (!account) {
                throw new Error(`Ledger account not found: ${line.accountCode}`);
            }

            // Create line
            await tx.ledgerEntryLine.create({
                data: {
                    entryId: ledgerEntry.id,
                    accountId: account.id,
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                },
            });

            // Update account balance
            // Debits increase ASSET/EXPENSE, decrease LIABILITY/EQUITY/REVENUE
            // Credits decrease ASSET/EXPENSE, increase LIABILITY/EQUITY/REVENUE
            const balanceChange =
                account.type === 'ASSET' || account.type === 'EXPENSE'
                    ? (line.debit || 0) - (line.credit || 0)
                    : (line.credit || 0) - (line.debit || 0);

            // Select balance field based on currency
            const balanceField = input.currency === 'SYP' ? 'balanceSYP' : 'balance';

            await tx.ledgerAccount.update({
                where: { id: account.id },
                data: { [balanceField]: { increment: balanceChange } },
            });
        }

        // Link transaction if provided
        if (input.transactionId) {
            await tx.transaction.update({
                where: { id: input.transactionId },
                data: { ledgerEntryId: ledgerEntry.id },
            });
        }

        return ledgerEntry;
    });

    return entry.id;
}

/**
 * Create reversal for an existing transaction (IMMUTABLE - never modify!)
 */
export async function createReversalEntry(
    originalTransactionId: string,
    reason: string,
    reasonAr: string,
    reversedBy: string
): Promise<{ reversalTransactionId: string; ledgerEntryId: string }> {
    const originalTx = await prisma.transaction.findUnique({
        where: { id: originalTransactionId },
        include: { ledgerEntry: { include: { lines: true } } },
    });

    if (!originalTx) {
        throw new Error('Original transaction not found');
    }

    if (originalTx.status === 'REVERSED') {
        throw new Error('Transaction already reversed');
    }

    // Create reversal transaction (opposite of original)
    const referenceNumber = `REV-${originalTx.referenceNumber}`;

    return await prisma.$transaction(async (tx) => {
        // Create reversal transaction record
        const reversalTx = await tx.transaction.create({
            data: {
                referenceNumber,
                type: 'REFUND',
                status: 'COMPLETED',
                senderId: originalTx.receiverId,
                receiverId: originalTx.senderId,
                amount: originalTx.amount,
                fee: 0,
                platformFee: 0,
                agentFee: 0,
                netAmount: originalTx.amount,
                description: `Reversal: ${reason}`,
                descriptionAr: `إلغاء: ${reasonAr}`,
                completedAt: new Date(),
            },
        });

        // Create reversed ledger entry (swap debits and credits)
        let ledgerEntryId: string | undefined;
        if (originalTx.ledgerEntry) {
            const reversedLines = originalTx.ledgerEntry.lines.map((line) => ({
                accountCode: '', // Will be filled below
                debit: line.credit, // Swap
                credit: line.debit, // Swap
            }));

            // Get account codes
            for (let i = 0; i < reversedLines.length; i++) {
                const account = await tx.ledgerAccount.findUnique({
                    where: { id: originalTx.ledgerEntry.lines[i].accountId },
                });
                reversedLines[i].accountCode = account?.code || '';
            }

            ledgerEntryId = await createLedgerEntry({
                description: `Reversal of ${originalTx.referenceNumber}: ${reason}`,
                descriptionAr: `إلغاء ${originalTx.referenceNumber}: ${reasonAr}`,
                transactionId: reversalTx.id,
                lines: reversedLines,
                createdBy: reversedBy,
            });
        }

        // Mark original as reversed
        await tx.transaction.update({
            where: { id: originalTransactionId },
            data: { status: 'REVERSED' },
        });

        // Record reversal link
        await tx.reversalTransaction.create({
            data: {
                originalTransactionId,
                reversalTransactionId: reversalTx.id,
                reason,
                reasonAr,
                reversedBy,
            },
        });

        return {
            reversalTransactionId: reversalTx.id,
            ledgerEntryId: ledgerEntryId || '',
        };
    });
}

// ============================================
// INTERNAL ACCOUNT OPERATIONS
// ============================================

/**
 * Update internal account balance (Currency-Aware)
 */
export async function updateInternalAccount(
    accountCode: string,
    amount: number,
    operation: 'INCREMENT' | 'DECREMENT',
    currency: 'USD' | 'SYP' = 'USD'
): Promise<void> {
    const balanceField = currency === 'SYP' ? 'balanceSYP' : 'balance';

    await prisma.internalAccount.update({
        where: { code: accountCode },
        data: {
            [balanceField]: operation === 'INCREMENT'
                ? { increment: amount }
                : { decrement: amount },
        },
    });
}

/**
 * Get all internal account balances (Dual Currency)
 */
export async function getInternalAccountBalances(): Promise<Record<string, { USD: number; SYP: number }>> {
    const accounts = await prisma.internalAccount.findMany();
    const balances: Record<string, { USD: number; SYP: number }> = {};

    for (const acc of accounts) {
        balances[acc.code] = {
            USD: acc.balance,
            SYP: acc.balanceSYP,
        };
    }

    return balances;
}

/**
 * Verify system balance integrity (Dual Currency)
 * Checks USD and SYP separately - no cross-currency mixing
 */
export async function verifySystemBalance(): Promise<{
    isBalanced: boolean;
    USD: { systemReserve: number; totalOther: number; difference: number; isBalanced: boolean };
    SYP: { systemReserve: number; totalOther: number; difference: number; isBalanced: boolean };
}> {
    const balances = await getInternalAccountBalances();

    // USD Check
    const systemReserveUSD = balances[INTERNAL_ACCOUNTS.SYSTEM_RESERVE]?.USD || 0;
    const totalOtherUSD = Object.entries(balances)
        .filter(([code]) => code !== INTERNAL_ACCOUNTS.SYSTEM_RESERVE)
        .reduce((sum, [, bal]) => sum + bal.USD, 0);
    const differenceUSD = systemReserveUSD + totalOtherUSD;
    const isBalancedUSD = Math.abs(differenceUSD) < 0.01;

    // SYP Check
    const systemReserveSYP = balances[INTERNAL_ACCOUNTS.SYSTEM_RESERVE]?.SYP || 0;
    const totalOtherSYP = Object.entries(balances)
        .filter(([code]) => code !== INTERNAL_ACCOUNTS.SYSTEM_RESERVE)
        .reduce((sum, [, bal]) => sum + bal.SYP, 0);
    const differenceSYP = systemReserveSYP + totalOtherSYP;
    const isBalancedSYP = Math.abs(differenceSYP) < 0.01;

    return {
        isBalanced: isBalancedUSD && isBalancedSYP,
        USD: {
            systemReserve: systemReserveUSD,
            totalOther: totalOtherUSD,
            difference: differenceUSD,
            isBalanced: isBalancedUSD,
        },
        SYP: {
            systemReserve: systemReserveSYP,
            totalOther: totalOtherSYP,
            difference: differenceSYP,
            isBalanced: isBalancedSYP,
        },
    };
}

const coreLedger = {
    initializeInternalAccounts,
    createLedgerEntry,
    createReversalEntry,
    updateInternalAccount,
    getInternalAccountBalances,
    verifySystemBalance,
    INTERNAL_ACCOUNTS,
};

export default coreLedger;

