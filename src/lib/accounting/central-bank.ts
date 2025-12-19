import { prisma } from '@/lib/db/prisma';

// Central Bank System Account
// This account is the source of all credit in the system
// It CAN have a negative balance (represents money owed TO users)

export const CENTRAL_BANK_CODE = 'CENTRAL_BANK';
export const CENTRAL_BANK_NAME = 'Bank Basha Central';

/**
 * Get or create Central Bank system account
 * The Central Bank is the only account allowed to have negative balance
 */
export async function getCentralBankAccount() {
    // Try to find existing central bank user
    let centralBank = await prisma.user.findFirst({
        where: { phone: CENTRAL_BANK_CODE },
        include: { wallet: true },
    });

    // Create if doesn't exist
    if (!centralBank) {
        centralBank = await prisma.user.create({
            data: {
                phone: CENTRAL_BANK_CODE,
                fullName: CENTRAL_BANK_NAME,
                fullNameAr: 'البنك المركزي',
                passwordHash: 'SYSTEM_ACCOUNT_NO_LOGIN',
                userType: 'ADMIN',
                isActive: true,
                kycStatus: 'APPROVED',
                wallet: {
                    create: {
                        balance: 0,
                        currency: 'USD',
                    },
                },
            },
            include: { wallet: true },
        });
    }

    return centralBank;
}

/**
 * Get Central Bank balance (can be negative)
 * Negative = money distributed to users/agents
 * Positive = money held
 */
export async function getCentralBankBalance(): Promise<number> {
    const centralBank = await getCentralBankAccount();
    return centralBank.wallet?.balance || 0;
}

/**
 * Debit Central Bank (when giving credit to agent)
 * This will make the balance more negative
 */
export async function debitCentralBank(amount: number, description: string) {
    const centralBank = await getCentralBankAccount();

    if (!centralBank.wallet) {
        throw new Error('Central Bank wallet not found');
    }

    // Decrease balance (can go negative)
    await prisma.wallet.update({
        where: { id: centralBank.wallet.id },
        data: { balance: { decrement: amount } },
    });

    // Create audit log
    await prisma.auditLog.create({
        data: {
            userId: centralBank.id,
            action: 'CENTRAL_BANK_DEBIT',
            entity: 'Wallet',
            entityId: centralBank.wallet.id,
            newValue: JSON.stringify({ amount, description }),
        },
    });

    return true;
}

/**
 * Credit Central Bank (when agent settles)
 * This will make the balance less negative (towards zero)
 */
export async function creditCentralBank(amount: number, description: string) {
    const centralBank = await getCentralBankAccount();

    if (!centralBank.wallet) {
        throw new Error('Central Bank wallet not found');
    }

    // Increase balance (towards zero)
    await prisma.wallet.update({
        where: { id: centralBank.wallet.id },
        data: { balance: { increment: amount } },
    });

    // Create audit log
    await prisma.auditLog.create({
        data: {
            userId: centralBank.id,
            action: 'CENTRAL_BANK_CREDIT',
            entity: 'Wallet',
            entityId: centralBank.wallet.id,
            newValue: JSON.stringify({ amount, description }),
        },
    });

    return true;
}

/**
 * Get system financial summary
 */
export async function getSystemFinancialSummary() {
    const centralBank = await getCentralBankAccount();

    // Sum of all user wallets
    const userWallets = await prisma.wallet.aggregate({
        _sum: { balance: true },
        where: {
            user: {
                userType: { in: ['USER', 'MERCHANT'] },
            },
        },
    });

    // Sum of all agent credits
    const agentCredits = await prisma.agentProfile.aggregate({
        _sum: { currentCredit: true, cashCollected: true },
    });

    return {
        centralBankBalance: centralBank.wallet?.balance || 0,
        totalUserBalances: userWallets._sum.balance || 0,
        totalAgentCredit: agentCredits._sum.currentCredit || 0,
        totalAgentCash: agentCredits._sum.cashCollected || 0,
        // Should always equal zero if perfectly balanced
        systemBalance: (centralBank.wallet?.balance || 0)
            + (userWallets._sum.balance || 0)
            + (agentCredits._sum.currentCredit || 0),
    };
}
