/**
 * Currency Helper Functions for Dual Currency Support (USD + SYP)
 * 
 * This module provides utility functions for managing wallets across multiple currencies.
 */

import { prisma } from '@/lib/db/prisma';

// Types
export type Currency = 'USD' | 'SYP';
export type WalletType = 'PERSONAL' | 'BUSINESS';

export const CURRENCIES: Currency[] = ['USD', 'SYP'];
export const WALLET_TYPES: WalletType[] = ['PERSONAL', 'BUSINESS'];

// Currency display info
export const CURRENCY_INFO = {
    USD: {
        symbol: '$',
        name: 'دولار أمريكي',
        nameEn: 'US Dollar',
        icon: '💵',
        decimals: 2,
    },
    SYP: {
        symbol: 'ل.س',
        name: 'ليرة سورية',
        nameEn: 'Syrian Pound',
        icon: '🇸🇾',
        decimals: 0,
    },
} as const;

/**
 * Get a specific wallet for a user by currency and type
 */
export async function getUserWallet(
    userId: string,
    currency: Currency,
    walletType: WalletType = 'PERSONAL'
) {
    return prisma.wallet.findFirst({
        where: { userId, currency, walletType }
    });
}

/**
 * Get all wallets for a user
 */
export async function getAllUserWallets(userId: string) {
    return prisma.wallet.findMany({
        where: { userId },
        orderBy: [{ walletType: 'asc' }, { currency: 'asc' }]
    });
}

/**
 * Get user wallets grouped by type
 */
export async function getGroupedUserWallets(userId: string) {
    const wallets = await getAllUserWallets(userId);

    return {
        personal: {
            USD: wallets.find(w => w.walletType === 'PERSONAL' && w.currency === 'USD'),
            SYP: wallets.find(w => w.walletType === 'PERSONAL' && w.currency === 'SYP'),
        },
        business: {
            USD: wallets.find(w => w.walletType === 'BUSINESS' && w.currency === 'USD'),
            SYP: wallets.find(w => w.walletType === 'BUSINESS' && w.currency === 'SYP'),
        },
    };
}

/**
 * Create a single wallet
 */
export async function createWallet(
    userId: string,
    currency: Currency,
    walletType: WalletType = 'PERSONAL'
) {
    return prisma.wallet.create({
        data: {
            userId,
            currency,
            walletType,
            balance: 0,
            frozenBalance: 0,
        }
    });
}

/**
 * Create default wallets for a new user (2 personal: USD + SYP)
 */
export async function createDefaultWallets(userId: string) {
    const walletData = [
        { userId, currency: 'USD', walletType: 'PERSONAL', balance: 0, frozenBalance: 0 },
        { userId, currency: 'SYP', walletType: 'PERSONAL', balance: 0, frozenBalance: 0 },
    ];

    return prisma.wallet.createMany({ data: walletData });
}

/**
 * Create business wallets for a merchant (2 business: USD + SYP)
 */
export async function createBusinessWallets(userId: string) {
    const walletData = [
        { userId, currency: 'USD', walletType: 'BUSINESS', balance: 0, frozenBalance: 0 },
        { userId, currency: 'SYP', walletType: 'BUSINESS', balance: 0, frozenBalance: 0 },
    ];

    return prisma.wallet.createMany({ data: walletData });
}

/**
 * Get or create a wallet if it doesn't exist
 */
export async function getOrCreateWallet(
    userId: string,
    currency: Currency,
    walletType: WalletType = 'PERSONAL'
) {
    const existing = await getUserWallet(userId, currency, walletType);
    if (existing) return existing;

    return createWallet(userId, currency, walletType);
}

/**
 * Check if user has enough balance
 */
export async function hasEnoughBalance(
    userId: string,
    currency: Currency,
    amount: number,
    walletType: WalletType = 'PERSONAL'
): Promise<boolean> {
    const wallet = await getUserWallet(userId, currency, walletType);
    return wallet ? wallet.balance >= amount : false;
}

/**
 * Get user's balance for a specific currency
 */
export async function getBalance(
    userId: string,
    currency: Currency,
    walletType: WalletType = 'PERSONAL'
): Promise<number> {
    const wallet = await getUserWallet(userId, currency, walletType);
    return wallet?.balance ?? 0;
}

/**
 * Format amount according to currency
 */
export function formatCurrency(amount: number, currency: Currency): string {
    const info = CURRENCY_INFO[currency];

    if (currency === 'SYP') {
        return `${Math.round(amount).toLocaleString('ar-SY')} ${info.symbol}`;
    }

    return `${info.symbol}${amount.toFixed(info.decimals)}`;
}

/**
 * Format amount with currency icon
 */
export function formatCurrencyWithIcon(amount: number, currency: Currency): string {
    const info = CURRENCY_INFO[currency];
    return `${info.icon} ${formatCurrency(amount, currency)}`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
    return CURRENCY_INFO[currency].symbol;
}

/**
 * Get currency name in Arabic
 */
export function getCurrencyName(currency: Currency, lang: 'ar' | 'en' = 'ar'): string {
    return lang === 'ar' ? CURRENCY_INFO[currency].name : CURRENCY_INFO[currency].nameEn;
}

/**
 * Validate currency value
 */
export function isValidCurrency(value: string): value is Currency {
    return CURRENCIES.includes(value as Currency);
}

/**
 * Validate wallet type value
 */
export function isValidWalletType(value: string): value is WalletType {
    return WALLET_TYPES.includes(value as WalletType);
}

/**
 * Get total balances summary for a user
 */
export async function getUserBalancesSummary(userId: string) {
    const wallets = await getAllUserWallets(userId);

    return {
        personal: {
            USD: wallets.find(w => w.walletType === 'PERSONAL' && w.currency === 'USD')?.balance ?? 0,
            SYP: wallets.find(w => w.walletType === 'PERSONAL' && w.currency === 'SYP')?.balance ?? 0,
        },
        business: {
            USD: wallets.find(w => w.walletType === 'BUSINESS' && w.currency === 'USD')?.balance ?? 0,
            SYP: wallets.find(w => w.walletType === 'BUSINESS' && w.currency === 'SYP')?.balance ?? 0,
        },
    };
}
