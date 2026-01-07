import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
    var ledgerInitialized: boolean | undefined;
}

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

// ============================================
// AUTO-INITIALIZE LEDGER ACCOUNTS
// ============================================
// This runs ONCE when the app starts to ensure
// all required ledger accounts exist in the database

async function autoInitializeLedger() {
    if (globalThis.ledgerInitialized) return;

    try {
        // Check if accounts already exist
        const count = await prisma.ledgerAccount.count();
        if (count >= 7) {
            globalThis.ledgerInitialized = true;
            return;
        }

        console.log('🔧 Auto-initializing ledger accounts...');

        const accounts = [
            { code: 'SYS-RESERVE', name: 'System Reserve', nameAr: 'احتياطي النظام', type: 'LIABILITY' },
            { code: 'USR-LEDGER', name: 'Users Ledger', nameAr: 'سجل المستخدمين', type: 'LIABILITY' },
            { code: 'MRC-LEDGER', name: 'Merchants Ledger', nameAr: 'سجل التجار', type: 'LIABILITY' },
            { code: 'AGT-LEDGER', name: 'Agents Ledger', nameAr: 'سجل الوكلاء', type: 'LIABILITY' },
            { code: 'SETTLEMENTS', name: 'Settlements', nameAr: 'التسويات', type: 'LIABILITY' },
            { code: 'FEES-COLLECTED', name: 'Fees Collected', nameAr: 'الرسوم', type: 'REVENUE' },
            { code: 'SUSPENSE', name: 'Suspense', nameAr: 'معلق', type: 'LIABILITY' },
        ];

        for (const acc of accounts) {
            await prisma.ledgerAccount.upsert({
                where: { code: acc.code },
                update: {},
                create: { ...acc, balance: 0, isSystem: true } as any,
            });
        }

        // Also create InternalAccount records
        const internalAccounts = [
            { code: 'SYS-RESERVE', name: 'System Reserve', nameAr: 'احتياطي النظام', type: 'SYSTEM_RESERVE' },
            { code: 'USR-LEDGER', name: 'Users Ledger', nameAr: 'سجل المستخدمين', type: 'USERS_LEDGER' },
            { code: 'MRC-LEDGER', name: 'Merchants Ledger', nameAr: 'سجل التجار', type: 'MERCHANTS_LEDGER' },
            { code: 'AGT-LEDGER', name: 'Agents Ledger', nameAr: 'سجل الوكلاء', type: 'AGENTS_LEDGER' },
            { code: 'SETTLEMENTS', name: 'Settlements Account', nameAr: 'حساب التسويات', type: 'SETTLEMENTS' },
            { code: 'FEES-COLLECTED', name: 'Fees Collected', nameAr: 'العمولات المحصلة', type: 'FEES' },
            { code: 'SUSPENSE', name: 'Suspense Account', nameAr: 'حساب معلق', type: 'SUSPENSE' },
        ];

        for (const acc of internalAccounts) {
            await prisma.internalAccount.upsert({
                where: { code: acc.code },
                update: {},
                create: acc as any,
            });
        }

        console.log('✅ Ledger accounts initialized automatically');
        globalThis.ledgerInitialized = true;
    } catch (error) {
        console.error('⚠️ Failed to auto-initialize ledger (will retry):', error);
    }
}

// Run initialization on first import
autoInitializeLedger();

export default prisma;

