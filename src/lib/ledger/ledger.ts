import { prisma } from '@/lib/db/prisma';
import { generateLedgerHash, generateReferenceNumber } from '@/lib/auth/security';

/**
 * Get system settings from database
 * Returns default values if not found
 */
async function getSystemSettings() {
    let settings = await prisma.systemSettings.findFirst();

    if (!settings) {
        // Create default settings if not exists
        settings = await prisma.systemSettings.create({
            data: {},
        });
    }

    return settings;
}

export interface LedgerEntryData {
    description: string;
    descriptionAr?: string;
    lines: Array<{
        accountCode: string;
        debit?: number;
        credit?: number;
    }>;
    createdBy?: string;
}

export interface TransactionResult {
    success: boolean;
    transactionId?: string;
    referenceNumber?: string;
    ledgerEntryId?: string;
    error?: string;
}

// System account codes
export const SYSTEM_ACCOUNTS = {
    // Assets
    PLATFORM_CASH: 'A-1001',
    PLATFORM_BANK: 'A-1002',
    AGENT_RECEIVABLES: 'A-1100',

    // Liabilities
    USER_WALLETS: 'L-2001',
    AGENT_WALLETS: 'L-2002',
    MERCHANT_WALLETS: 'L-2003',

    // Revenue
    DEPOSIT_FEES: 'R-4001',
    WITHDRAW_FEES: 'R-4002',
    TRANSFER_FEES: 'R-4003',

    // Expense
    AGENT_COMMISSIONS: 'E-5001',
};

/**
 * Create a double-entry ledger entry
 * Ensures debits = credits
 */
export async function createLedgerEntry(data: LedgerEntryData): Promise<string> {
    // Validate that debits equal credits
    let totalDebits = 0;
    let totalCredits = 0;

    for (const line of data.lines) {
        totalDebits += line.debit || 0;
        totalCredits += line.credit || 0;
    }

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
        throw new Error(`Ledger entry not balanced: Debits ${totalDebits} != Credits ${totalCredits}`);
    }

    // Get the last entry hash for blockchain-like integrity
    const lastEntry = await prisma.ledgerEntry.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { hash: true },
    });

    // Create entry number
    const entryNumber = generateReferenceNumber('LE');

    // Create hash of this entry
    const hashData = JSON.stringify({
        entryNumber,
        description: data.description,
        lines: data.lines,
        timestamp: new Date().toISOString(),
    });
    const hash = generateLedgerHash(hashData, lastEntry?.hash || undefined);

    // Create ledger entry with lines
    const entry = await prisma.ledgerEntry.create({
        data: {
            entryNumber,
            description: data.description,
            descriptionAr: data.descriptionAr,
            hash,
            previousHash: lastEntry?.hash,
            createdBy: data.createdBy,
            lines: {
                create: await Promise.all(
                    data.lines.map(async (line) => {
                        const account = await prisma.ledgerAccount.findUnique({
                            where: { code: line.accountCode },
                        });
                        if (!account) {
                            throw new Error(`Account not found: ${line.accountCode}`);
                        }
                        return {
                            accountId: account.id,
                            debit: line.debit || 0,
                            credit: line.credit || 0,
                        };
                    })
                ),
            },
        },
    });

    // Update account balances
    for (const line of data.lines) {
        await prisma.ledgerAccount.update({
            where: { code: line.accountCode },
            data: {
                balance: {
                    increment: (line.debit || 0) - (line.credit || 0),
                },
            },
        });
    }

    return entry.id;
}

/**
 * Calculate commission for a transaction based on system settings
 */
export async function calculateCommission(
    amount: number,
    type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'QR_PAYMENT' | 'SERVICE_PURCHASE'
): Promise<{ platformFee: number; agentFee: number; totalFee: number; netAmount: number }> {
    const settings = await getSystemSettings();

    let feePercent = 0;
    let feeFixed = 0;
    let agentCommissionPercent = settings.agentCommissionPercent;

    switch (type) {
        case 'DEPOSIT':
            feePercent = settings.depositFeePercent;
            feeFixed = settings.depositFeeFixed;
            break;
        case 'WITHDRAW':
            feePercent = settings.withdrawalFeePercent;
            feeFixed = settings.withdrawalFeeFixed;
            break;
        case 'TRANSFER':
            feePercent = settings.transferFeePercent;
            feeFixed = settings.transferFeeFixed;
            agentCommissionPercent = 0; // No agent commission for transfers
            break;
        case 'QR_PAYMENT':
            feePercent = settings.qrPaymentFeePercent;
            feeFixed = settings.qrPaymentFeeFixed;
            agentCommissionPercent = 0; // No agent commission for QR payments
            break;
        case 'SERVICE_PURCHASE':
            feePercent = settings.serviceFeePercent;
            feeFixed = settings.serviceFeeFixed;
            agentCommissionPercent = 0; // Usually 0 for services, or could be configured
            break;
    }

    const percentageFee = Math.round(amount * (feePercent / 100) * 100) / 100;
    const totalFee = parseFloat((percentageFee + feeFixed).toFixed(2));
    const agentFee = Math.round(totalFee * (agentCommissionPercent / 100) * 100) / 100;
    const platformFee = parseFloat((totalFee - agentFee).toFixed(2));
    const netAmount = parseFloat((amount - totalFee).toFixed(2));

    return { platformFee, agentFee, totalFee, netAmount };
}

/**
 * Process a deposit (User receives digital balance from Agent)
 * 
 * Accounting:
 * - User wallet: +netAmount (receives digital money)
 * - Agent credit: -amount (gives from credit balance)
 * - Agent cashCollected: +amount (collects physical cash)
 */
export async function processDeposit(
    userId: string,
    agentId: string,
    amount: number,
    createdBy?: string
): Promise<TransactionResult> {
    try {
        // Validate amount
        if (amount <= 0) {
            return { success: false, error: 'Amount must be positive' };
        }

        // Get system settings for validation
        const settings = await getSystemSettings();

        // Validate against min/max limits
        if (amount < settings.minTransactionAmount) {
            return { success: false, error: `Minimum transaction amount is $${settings.minTransactionAmount}` };
        }
        if (amount > settings.maxTransactionAmount) {
            return { success: false, error: `Maximum transaction amount is $${settings.maxTransactionAmount}` };
        }

        return await prisma.$transaction(async (tx) => {
            // Get user and agent
            const user = await tx.user.findUnique({
                where: { id: userId },
                include: { wallet: true },
            });
            const agent = await tx.user.findUnique({
                where: { id: agentId },
                include: { wallet: true, agentProfile: true },
            });

            if (!user || !user.wallet) {
                return { success: false, error: 'User not found or wallet not created' };
            }
            if (!agent || !agent.agentProfile) {
                return { success: false, error: 'Agent not found or not registered' };
            }

            // Check agent has enough credit
            if (agent.agentProfile.currentCredit < amount) {
                return { success: false, error: `Insufficient credit. Available: $${agent.agentProfile.currentCredit.toFixed(2)}` };
            }

            // Calculate commission from system settings
            const { platformFee, agentFee, totalFee, netAmount } = await calculateCommission(amount, 'DEPOSIT');

            // Create reference number
            const referenceNumber = generateReferenceNumber('DEP');

            // ═══════════════════════════════════════════════════════════════
            // DOUBLE-ENTRY ACCOUNTING
            // ═══════════════════════════════════════════════════════════════

            // 1. User wallet INCREASES (receives digital balance)
            await tx.wallet.update({
                where: { id: user.wallet.id },
                data: { balance: { increment: netAmount } },
            });

            // 2. Agent credit DECREASES (gives money), cash INCREASES (collects cash)
            await tx.agentProfile.update({
                where: { id: agent.agentProfile.id },
                data: {
                    currentCredit: { decrement: amount }, // Uses credit
                    cashCollected: { increment: amount }, // Collects cash
                    totalDeposits: { increment: amount },
                },
            });

            // 3. Create transaction record
            const transaction = await tx.transaction.create({
                data: {
                    referenceNumber,
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    senderId: agentId,
                    receiverId: userId,
                    agentId: agentId,
                    amount,
                    fee: totalFee,
                    platformFee,
                    agentFee,
                    netAmount,
                    description: `Deposit from ${agent.agentProfile.businessName}`,
                    descriptionAr: `إيداع من ${agent.agentProfile.businessNameAr || agent.agentProfile.businessName}`,
                    completedAt: new Date(),
                },
            });

            return {
                success: true,
                transactionId: transaction.id,
                referenceNumber,
            };
        });
    } catch (error) {
        console.error('Deposit error:', error);
        return { success: false, error: 'Failed to process deposit' };
    }
}

/**
 * Process a withdrawal (User receives cash from Agent)
 * 
 * Accounting:
 * - User wallet: -amount (gives up digital balance)
 * - Agent credit: +netAmount (receives credit back)
 * - Agent cashCollected: -amount (gives physical cash)
 * 
 * Validations:
 * - User balance must be >= amount (cannot go negative)
 * - Agent cashCollected must be >= amount (cannot give more cash than they have)
 */
export async function processWithdrawal(
    userId: string,
    agentId: string,
    amount: number,
    createdBy?: string
): Promise<TransactionResult> {
    try {
        // Validate amount
        if (amount <= 0) {
            return { success: false, error: 'Amount must be positive' };
        }

        // Get system settings for validation
        const settings = await getSystemSettings();

        // Validate against min/max limits
        if (amount < settings.minTransactionAmount) {
            return { success: false, error: `Minimum transaction amount is $${settings.minTransactionAmount}` };
        }
        if (amount > settings.maxTransactionAmount) {
            return { success: false, error: `Maximum transaction amount is $${settings.maxTransactionAmount}` };
        }

        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                include: { wallet: true },
            });
            const agent = await tx.user.findUnique({
                where: { id: agentId },
                include: { wallet: true, agentProfile: true },
            });

            if (!user || !user.wallet) {
                return { success: false, error: 'User not found' };
            }
            if (!agent || !agent.agentProfile) {
                return { success: false, error: 'Agent not found' };
            }

            // ═══════════════════════════════════════════════════════════════
            // VALIDATIONS - NO NEGATIVE BALANCES
            // ═══════════════════════════════════════════════════════════════

            // 1. User must have sufficient balance
            if (user.wallet.balance < amount) {
                return { success: false, error: `Insufficient balance. Available: $${user.wallet.balance.toFixed(2)}` };
            }

            // 2. Agent must have sufficient cash to give
            if (agent.agentProfile.cashCollected < amount) {
                return { success: false, error: `Agent has insufficient cash. Available: $${agent.agentProfile.cashCollected.toFixed(2)}` };
            }

            // Calculate commission from system settings
            const { platformFee, agentFee, totalFee, netAmount } = await calculateCommission(amount, 'WITHDRAW');

            const referenceNumber = generateReferenceNumber('WTH');

            // ═══════════════════════════════════════════════════════════════
            // DOUBLE-ENTRY ACCOUNTING
            // ═══════════════════════════════════════════════════════════════

            // 1. User wallet DECREASES (gives up digital balance)
            await tx.wallet.update({
                where: { id: user.wallet.id },
                data: { balance: { decrement: amount } },
            });

            // 2. Agent credit INCREASES (receives balance back), cash DECREASES (gives cash)
            await tx.agentProfile.update({
                where: { id: agent.agentProfile.id },
                data: {
                    currentCredit: { increment: netAmount }, // Gets credit back
                    cashCollected: { decrement: amount }, // Gives cash to user
                    totalWithdrawals: { increment: amount }, // Track stats
                },
            });

            // 3. Create transaction record
            const transaction = await tx.transaction.create({
                data: {
                    referenceNumber,
                    type: 'WITHDRAW',
                    status: 'COMPLETED',
                    senderId: userId,
                    receiverId: agentId,
                    agentId: agentId,
                    amount,
                    fee: totalFee,
                    platformFee,
                    agentFee,
                    netAmount,
                    description: `Withdrawal at ${agent.agentProfile.businessName}`,
                    descriptionAr: `سحب من ${agent.agentProfile.businessNameAr || agent.agentProfile.businessName}`,
                    completedAt: new Date(),
                },
            });

            return {
                success: true,
                transactionId: transaction.id,
                referenceNumber,
            };
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        return { success: false, error: 'Failed to process withdrawal' };
    }
}

/**
 * Process P2P transfer
 */
export async function processTransfer(
    senderId: string,
    receiverId: string,
    amount: number,
    note?: string
): Promise<TransactionResult> {
    try {
        return await prisma.$transaction(async (tx) => {
            const sender = await tx.user.findUnique({
                where: { id: senderId },
                include: { wallet: true },
            });
            const receiver = await tx.user.findUnique({
                where: { id: receiverId },
                include: { wallet: true },
            });

            if (!sender || !sender.wallet) {
                return { success: false, error: 'Sender not found' };
            }
            if (!receiver || !receiver.wallet) {
                return { success: false, error: 'Receiver not found' };
            }
            if (senderId === receiverId) {
                return { success: false, error: 'Cannot transfer to yourself' };
            }

            const { platformFee, totalFee, netAmount } = await calculateCommission(amount, 'TRANSFER');

            // Validation: Sender cannot go negative
            const requiredBalance = amount + totalFee;
            if (sender.wallet.balance < requiredBalance) {
                return { success: false, error: `Insufficient balance. Available: $${sender.wallet.balance.toFixed(2)}, Required: $${requiredBalance.toFixed(2)}` };
            }

            const referenceNumber = generateReferenceNumber('TRF');

            // Deduct from sender (amount + fee)
            await tx.wallet.update({
                where: { id: sender.wallet.id },
                data: { balance: { decrement: amount + totalFee } },
            });

            // Add to receiver
            await tx.wallet.update({
                where: { id: receiver.wallet.id },
                data: { balance: { increment: amount } },
            });

            const transaction = await tx.transaction.create({
                data: {
                    referenceNumber,
                    type: 'TRANSFER',
                    status: 'COMPLETED',
                    senderId,
                    receiverId,
                    amount,
                    fee: totalFee,
                    platformFee,
                    agentFee: 0,
                    netAmount: amount,
                    description: note || `Transfer to ${receiver.fullName}`,
                    descriptionAr: note || `تحويل إلى ${receiver.fullNameAr || receiver.fullName}`,
                    completedAt: new Date(),
                },
            });

            return {
                success: true,
                transactionId: transaction.id,
                referenceNumber,
            };
        });
    } catch (error) {
        console.error('Transfer error:', error);
        return { success: false, error: 'Failed to process transfer' };
    }
}

/**
 * Process QR Payment to merchant
 */
export async function processQRPayment(
    payerId: string,
    merchantId: string,
    amount: number,
    note?: string
): Promise<TransactionResult> {
    try {
        return await prisma.$transaction(async (tx) => {
            const payer = await tx.user.findUnique({
                where: { id: payerId },
                include: { wallet: true },
            });
            const merchant = await tx.user.findUnique({
                where: { id: merchantId },
                include: { wallet: true, merchantProfile: true },
            });

            if (!payer || !payer.wallet) {
                return { success: false, error: 'Payer not found' };
            }
            if (!merchant || !merchant.wallet || !merchant.merchantProfile) {
                return { success: false, error: 'Merchant not found' };
            }

            // Validation: Payer cannot go negative
            if (payer.wallet.balance < amount) {
                return { success: false, error: `Insufficient balance. Available: $${payer.wallet.balance.toFixed(2)}` };
            }

            const referenceNumber = generateReferenceNumber('QRP');

            // QR payments have no fee (can be configured)
            await tx.wallet.update({
                where: { id: payer.wallet.id },
                data: { balance: { decrement: amount } },
            });

            await tx.wallet.update({
                where: { id: merchant.wallet.id },
                data: { balance: { increment: amount } },
            });

            // Update merchant stats
            await tx.merchantProfile.update({
                where: { id: merchant.merchantProfile.id },
                data: {
                    totalSales: { increment: amount },
                    totalTransactions: { increment: 1 },
                },
            });

            const transaction = await tx.transaction.create({
                data: {
                    referenceNumber,
                    type: 'QR_PAYMENT',
                    status: 'COMPLETED',
                    senderId: payerId,
                    receiverId: merchantId,
                    amount,
                    fee: 0,
                    platformFee: 0,
                    agentFee: 0,
                    netAmount: amount,
                    description: note || `Payment to ${merchant.merchantProfile.businessName}`,
                    descriptionAr: note || `دفع إلى ${merchant.merchantProfile.businessNameAr || merchant.merchantProfile.businessName}`,
                    completedAt: new Date(),
                },
            });

            return {
                success: true,
                transactionId: transaction.id,
                referenceNumber,
            };
        });
    } catch (error) {
        console.error('QR Payment error:', error);
        return { success: false, error: 'Failed to process payment' };
    }
}

/**
 * Initialize system ledger accounts
 */
export async function initializeSystemAccounts(): Promise<void> {
    const accounts = [
        { code: SYSTEM_ACCOUNTS.PLATFORM_CASH, name: 'Platform Cash', nameAr: 'النقد في الصندوق', type: 'ASSET' },
        { code: SYSTEM_ACCOUNTS.PLATFORM_BANK, name: 'Platform Bank', nameAr: 'الحساب البنكي', type: 'ASSET' },
        { code: SYSTEM_ACCOUNTS.AGENT_RECEIVABLES, name: 'Agent Receivables', nameAr: 'ذمم الوكلاء', type: 'ASSET' },
        { code: SYSTEM_ACCOUNTS.USER_WALLETS, name: 'User Wallets', nameAr: 'محافظ المستخدمين', type: 'LIABILITY' },
        { code: SYSTEM_ACCOUNTS.AGENT_WALLETS, name: 'Agent Wallets', nameAr: 'محافظ الوكلاء', type: 'LIABILITY' },
        { code: SYSTEM_ACCOUNTS.MERCHANT_WALLETS, name: 'Merchant Wallets', nameAr: 'محافظ التجار', type: 'LIABILITY' },
        { code: SYSTEM_ACCOUNTS.DEPOSIT_FEES, name: 'Deposit Fees', nameAr: 'رسوم الإيداع', type: 'REVENUE' },
        { code: SYSTEM_ACCOUNTS.WITHDRAW_FEES, name: 'Withdrawal Fees', nameAr: 'رسوم السحب', type: 'REVENUE' },
        { code: SYSTEM_ACCOUNTS.TRANSFER_FEES, name: 'Transfer Fees', nameAr: 'رسوم التحويل', type: 'REVENUE' },
        { code: SYSTEM_ACCOUNTS.AGENT_COMMISSIONS, name: 'Agent Commissions', nameAr: 'عمولات الوكلاء', type: 'EXPENSE' },
    ];

    for (const account of accounts) {
        await prisma.ledgerAccount.upsert({
            where: { code: account.code },
            update: {},
            create: {
                code: account.code,
                name: account.name,
                nameAr: account.nameAr,
                type: account.type as any,
                isSystem: true,
            },
        });
    }
}
