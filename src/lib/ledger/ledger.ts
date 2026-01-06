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
    currency?: 'USD' | 'SYP'; // Add currency for balance field selection
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

    // Update account balances - select field based on currency
    const balanceField = data.currency === 'SYP' ? 'balanceSYP' : 'balance';

    for (const line of data.lines) {
        await prisma.ledgerAccount.update({
            where: { code: line.accountCode },
            data: {
                [balanceField]: {
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
    type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'QR_PAYMENT' | 'SERVICE_PURCHASE',
    currency: 'USD' | 'SYP' = 'USD'
): Promise<{ platformFee: number; agentFee: number; totalFee: number; netAmount: number }> {
    const settings = await getSystemSettings();

    let feePercent = 0;
    let feeFixed = 0;
    let agentCommissionPercent = 0;

    // Select fee settings based on currency
    if (currency === 'SYP') {
        // SYP Settings - Admin controlled
        agentCommissionPercent = settings.agentCommissionPercentSYP || settings.agentCommissionPercent;

        switch (type) {
            case 'DEPOSIT':
                feePercent = settings.depositFeePercentSYP || settings.depositFeePercent;
                feeFixed = settings.depositFeeFixedSYP || settings.depositFeeFixed;
                break;
            case 'WITHDRAW':
                feePercent = settings.withdrawalFeePercentSYP || settings.withdrawalFeePercent;
                feeFixed = settings.withdrawalFeeFixedSYP || settings.withdrawalFeeFixed;
                break;
            case 'TRANSFER':
                feePercent = settings.transferFeePercentSYP || settings.transferFeePercent;
                feeFixed = settings.transferFeeFixedSYP || settings.transferFeeFixed;
                agentCommissionPercent = 0;
                break;
            case 'QR_PAYMENT':
                feePercent = settings.qrPaymentFeePercentSYP || settings.qrPaymentFeePercent;
                feeFixed = settings.qrPaymentFeeFixedSYP || settings.qrPaymentFeeFixed;
                agentCommissionPercent = 0;
                break;
            case 'SERVICE_PURCHASE':
                feePercent = settings.serviceFeePercentSYP || settings.serviceFeePercent;
                feeFixed = settings.serviceFeeFixedSYP || settings.serviceFeeFixed;
                agentCommissionPercent = 0;
                break;
        }
    } else {
        // USD Settings
        agentCommissionPercent = settings.agentCommissionPercent;

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
                agentCommissionPercent = 0;
                break;
            case 'QR_PAYMENT':
                feePercent = settings.qrPaymentFeePercent;
                feeFixed = settings.qrPaymentFeeFixed;
                agentCommissionPercent = 0;
                break;
            case 'SERVICE_PURCHASE':
                feePercent = settings.serviceFeePercent;
                feeFixed = settings.serviceFeeFixed;
                agentCommissionPercent = 0;
                break;
        }
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
 * Supports dual currency (USD / SYP)
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
    createdBy?: string,
    currency: 'USD' | 'SYP' = 'USD'
): Promise<TransactionResult> {
    try {
        // Validate amount
        if (amount <= 0) {
            return { success: false, error: 'Amount must be positive' };
        }

        // Get system settings for validation
        const settings = await getSystemSettings();

        // Validate against min/max limits (adjust for currency)
        const minAmount = currency === 'SYP' ? settings.minTransactionAmount * 15000 : settings.minTransactionAmount;
        const maxAmount = currency === 'SYP' ? settings.maxTransactionAmount * 15000 : settings.maxTransactionAmount;
        const currencySymbol = currency === 'SYP' ? 'ل.س' : '$';

        if (amount < minAmount) {
            return { success: false, error: `الحد الأدنى للمعاملة هو ${currencySymbol}${minAmount.toLocaleString()}` };
        }
        if (amount > maxAmount) {
            return { success: false, error: `الحد الأقصى للمعاملة هو ${currencySymbol}${maxAmount.toLocaleString()}` };
        }

        return await prisma.$transaction(async (tx) => {
            // Get user and agent with their wallets
            const user = await tx.user.findUnique({
                where: { id: userId },
                include: { wallets: true },
            });
            const agent = await tx.user.findUnique({
                where: { id: agentId },
                include: { wallets: true, agentProfile: true },
            });

            if (!user) {
                return { success: false, error: 'User not found' };
            }
            if (!agent || !agent.agentProfile) {
                return { success: false, error: 'Agent not found or not registered' };
            }

            // Get user's wallet for this currency
            const userWallet = user.wallets.find(
                (w: { currency: string; walletType: string }) => w.currency === currency && w.walletType === 'PERSONAL'
            );
            if (!userWallet) {
                return { success: false, error: `المستخدم ليس لديه محفظة بـ${currency === 'SYP' ? 'الليرة السورية' : 'الدولار'}` };
            }

            // Check agent has enough credit for this currency
            const agentCredit = currency === 'SYP'
                ? agent.agentProfile.currentCreditSYP
                : agent.agentProfile.currentCredit;

            if (agentCredit < amount) {
                return { success: false, error: `رصيد الائتمان غير كافي. المتاح: ${currencySymbol}${agentCredit.toLocaleString()}` };
            }

            // Calculate commission from system settings
            const { platformFee, agentFee, totalFee, netAmount } = await calculateCommission(amount, 'DEPOSIT', currency);

            // Create reference number
            const referenceNumber = generateReferenceNumber('DEP');

            // ═══════════════════════════════════════════════════════════════
            // DOUBLE-ENTRY ACCOUNTING
            // ═══════════════════════════════════════════════════════════════

            // 1. User wallet INCREASES (receives digital balance)
            await tx.wallet.update({
                where: { id: userWallet.id },
                data: { balance: { increment: netAmount } },
            });

            // 2. Agent credit DECREASES, cash INCREASES - based on currency
            if (currency === 'SYP') {
                await tx.agentProfile.update({
                    where: { id: agent.agentProfile.id },
                    data: {
                        currentCreditSYP: { decrement: amount },
                        cashCollectedSYP: { increment: amount },
                        totalDepositsSYP: { increment: amount },
                    },
                });
            } else {
                await tx.agentProfile.update({
                    where: { id: agent.agentProfile.id },
                    data: {
                        currentCredit: { decrement: amount },
                        cashCollected: { increment: amount },
                        totalDeposits: { increment: amount },
                    },
                });
            }

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
                    currency, // USD or SYP
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
 * Supports dual currency (USD / SYP)
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
    createdBy?: string,
    currency: 'USD' | 'SYP' = 'USD'
): Promise<TransactionResult> {
    try {
        // Validate amount
        if (amount <= 0) {
            return { success: false, error: 'Amount must be positive' };
        }

        // Get system settings for validation
        const settings = await getSystemSettings();

        // Validate against min/max limits (adjust for currency)
        const minAmount = currency === 'SYP' ? settings.minTransactionAmount * 15000 : settings.minTransactionAmount;
        const maxAmount = currency === 'SYP' ? settings.maxTransactionAmount * 15000 : settings.maxTransactionAmount;
        const currencySymbol = currency === 'SYP' ? 'ل.س' : '$';

        if (amount < minAmount) {
            return { success: false, error: `الحد الأدنى للمعاملة هو ${currencySymbol}${minAmount.toLocaleString()}` };
        }
        if (amount > maxAmount) {
            return { success: false, error: `الحد الأقصى للمعاملة هو ${currencySymbol}${maxAmount.toLocaleString()}` };
        }

        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                include: { wallets: true },
            });
            const agent = await tx.user.findUnique({
                where: { id: agentId },
                include: { wallets: true, agentProfile: true },
            });

            if (!user) {
                return { success: false, error: 'User not found' };
            }
            if (!agent || !agent.agentProfile) {
                return { success: false, error: 'Agent not found' };
            }

            // Get user's wallet for this currency
            const userWallet = user.wallets.find(
                (w: { currency: string; walletType: string }) => w.currency === currency && w.walletType === 'PERSONAL'
            );
            if (!userWallet) {
                return { success: false, error: `ليس لديك محفظة بـ${currency === 'SYP' ? 'الليرة السورية' : 'الدولار'}` };
            }

            // ═══════════════════════════════════════════════════════════════
            // VALIDATIONS - NO NEGATIVE BALANCES (ATOMIC)
            // ═══════════════════════════════════════════════════════════════

            // Check agent has sufficient cash to give (based on currency)
            const agentCash = currency === 'SYP'
                ? agent.agentProfile.cashCollectedSYP
                : agent.agentProfile.cashCollected;

            if (agentCash < amount) {
                return { success: false, error: `الوكيل ليس لديه نقد كافي. المتاح: ${currencySymbol}${agentCash.toLocaleString()}` };
            }

            // Calculate commission from system settings
            const { platformFee, agentFee, totalFee, netAmount } = await calculateCommission(amount, 'WITHDRAW', currency);

            const referenceNumber = generateReferenceNumber('WTH');

            // ═══════════════════════════════════════════════════════════════
            // ATOMIC BALANCE CHECK - Prevents Race Condition
            // ═══════════════════════════════════════════════════════════════

            // Atomic update with balance check
            const userUpdate = await tx.wallet.updateMany({
                where: {
                    id: userWallet.id,
                    balance: { gte: amount } // Only update if balance is sufficient
                },
                data: { balance: { decrement: amount } },
            });

            // If no rows updated, balance was insufficient
            if (userUpdate.count === 0) {
                return { success: false, error: `رصيد غير كافي. المتاح: ${currencySymbol}${userWallet.balance.toLocaleString()}` };
            }

            // 2. Agent credit INCREASES, cash DECREASES - based on currency
            if (currency === 'SYP') {
                await tx.agentProfile.update({
                    where: { id: agent.agentProfile.id },
                    data: {
                        currentCreditSYP: { increment: netAmount },
                        cashCollectedSYP: { decrement: amount },
                        totalWithdrawalsSYP: { increment: amount },
                    },
                });
            } else {
                await tx.agentProfile.update({
                    where: { id: agent.agentProfile.id },
                    data: {
                        currentCredit: { increment: netAmount },
                        cashCollected: { decrement: amount },
                        totalWithdrawals: { increment: amount },
                    },
                });
            }

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
                    currency, // USD or SYP
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
 * Process P2P transfer with dual currency support
 */
export async function processTransfer(
    senderId: string,
    receiverId: string,
    amount: number,
    note?: string,
    currency: 'USD' | 'SYP' = 'USD'
): Promise<TransactionResult> {
    try {
        return await prisma.$transaction(async (tx) => {
            // Get sender and receiver with their wallets
            const sender = await tx.user.findUnique({
                where: { id: senderId },
                include: { wallets: true },
            });
            const receiver = await tx.user.findUnique({
                where: { id: receiverId },
                include: { wallets: true },
            });

            if (!sender) {
                return { success: false, error: 'Sender not found' };
            }
            if (!receiver) {
                return { success: false, error: 'Receiver not found' };
            }
            if (senderId === receiverId) {
                return { success: false, error: 'Cannot transfer to yourself' };
            }

            // Get the correct wallet for the currency
            const senderWallet = sender.wallets.find(
                w => w.currency === currency && w.walletType === 'PERSONAL'
            );
            const receiverWallet = receiver.wallets.find(
                w => w.currency === currency && w.walletType === 'PERSONAL'
            );

            if (!senderWallet) {
                const currencyName = currency === 'SYP' ? 'الليرة السورية' : 'الدولار';
                return { success: false, error: `ليس لديك محفظة بـ${currencyName}` };
            }
            if (!receiverWallet) {
                const currencyName = currency === 'SYP' ? 'الليرة السورية' : 'الدولار';
                return { success: false, error: `المستلم ليس لديه محفظة بـ${currencyName}` };
            }

            const { platformFee, totalFee } = await calculateCommission(amount, 'TRANSFER', currency);

            // ═══════════════════════════════════════════════════════════════
            // ATOMIC BALANCE CHECK - Prevents Race Condition
            // ═══════════════════════════════════════════════════════════════
            const requiredBalance = amount + totalFee;
            const referenceNumber = generateReferenceNumber('TRF');

            // Atomic update with balance check - prevents negative balance
            const senderUpdate = await tx.wallet.updateMany({
                where: {
                    id: senderWallet.id,
                    balance: { gte: requiredBalance } // Only update if balance is sufficient
                },
                data: { balance: { decrement: amount + totalFee } },
            });

            // If no rows updated, balance was insufficient
            if (senderUpdate.count === 0) {
                const currencySymbol = currency === 'SYP' ? 'ل.س' : '$';
                return {
                    success: false,
                    error: `رصيد غير كافٍ. المتاح: ${currencySymbol}${senderWallet.balance.toLocaleString()}, المطلوب: ${currencySymbol}${requiredBalance.toLocaleString()}`
                };
            }

            // Add to receiver
            await tx.wallet.update({
                where: { id: receiverWallet.id },
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
                    currency, // USD or SYP
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
    note?: string,
    currency: 'USD' | 'SYP' = 'USD'
): Promise<TransactionResult> {
    try {
        return await prisma.$transaction(async (tx) => {
            const payer = await tx.user.findUnique({
                where: { id: payerId },
                include: { wallets: true },
            });
            const merchant = await tx.user.findUnique({
                where: { id: merchantId },
                include: { wallets: true, merchantProfile: true },
            });

            // Get wallets based on selected currency
            const payerWallet = (payer?.wallets as any[])?.find(
                (w: { walletType: string; currency: string }) => w.walletType === 'PERSONAL' && w.currency === currency
            );
            const merchantWallet = (merchant?.wallets as any[])?.find(
                (w: { walletType: string; currency: string }) => w.walletType === 'BUSINESS' && w.currency === currency
            );

            if (!payer || !payerWallet) {
                return { success: false, error: 'Payer not found' };
            }
            if (!merchant || !merchantWallet || !merchant.merchantProfile) {
                return { success: false, error: 'Merchant not found' };
            }

            const referenceNumber = generateReferenceNumber('QRP');

            // ═══════════════════════════════════════════════════════════════
            // ATOMIC BALANCE CHECK - Prevents Race Condition
            // ═══════════════════════════════════════════════════════════════

            // Atomic update with balance check
            const payerUpdate = await tx.wallet.updateMany({
                where: {
                    id: payerWallet.id,
                    balance: { gte: amount } // Only update if balance is sufficient
                },
                data: { balance: { decrement: amount } },
            });

            // If no rows updated, balance was insufficient
            if (payerUpdate.count === 0) {
                const currencySymbol = currency === 'SYP' ? 'ل.س' : '$';
                return { success: false, error: `Insufficient balance. Available: ${currencySymbol}${payerWallet.balance.toLocaleString()}` };
            }

            await tx.wallet.update({
                where: { id: merchantWallet.id },
                data: { balance: { increment: amount } },
            });

            // Update merchant stats based on currency
            if (currency === 'SYP') {
                await tx.merchantProfile.update({
                    where: { id: merchant.merchantProfile.id },
                    data: {
                        totalSalesSYP: { increment: amount },
                        totalTransactionsSYP: { increment: 1 },
                    },
                });
            } else {
                await tx.merchantProfile.update({
                    where: { id: merchant.merchantProfile.id },
                    data: {
                        totalSales: { increment: amount },
                        totalTransactions: { increment: 1 },
                    },
                });
            }

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
                    currency, // Use selected currency
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
