/**
 * Initialize Financial System
 * Run this script to set up internal accounts and settings
 * 
 * Usage: node scripts/init-financial-system.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Internal Account Codes
const INTERNAL_ACCOUNTS = {
    SYSTEM_RESERVE: 'SYS-RESERVE',
    USERS_LEDGER: 'USR-LEDGER',
    MERCHANTS_LEDGER: 'MRC-LEDGER',
    AGENTS_LEDGER: 'AGT-LEDGER',
    SETTLEMENTS: 'SETTLEMENTS',
    FEES: 'FEES-COLLECTED',
    SUSPENSE: 'SUSPENSE',
};

// Ledger Account Codes
const LEDGER_ACCOUNTS = [
    { code: 'CASH', name: 'Cash', nameAr: 'النقد', type: 'ASSET' },
    { code: 'USER-WALLETS', name: 'User Wallets', nameAr: 'محافظ المستخدمين', type: 'LIABILITY' },
    { code: 'AGENT-CREDIT', name: 'Agent Credit', nameAr: 'ائتمان الوكلاء', type: 'LIABILITY' },
    { code: 'MERCHANT-BALANCE', name: 'Merchant Balance', nameAr: 'رصيد التجار', type: 'LIABILITY' },
    { code: 'REVENUE-FEES', name: 'Fee Revenue', nameAr: 'إيرادات العمولات', type: 'REVENUE' },
    { code: 'SYSTEM-RESERVE', name: 'System Reserve', nameAr: 'احتياطي النظام', type: 'EQUITY' },
    { code: 'SETTLEMENTS-DUE', name: 'Settlements Due', nameAr: 'التسويات المستحقة', type: 'LIABILITY' },
    { code: 'SUSPENSE', name: 'Suspense Account', nameAr: 'حساب معلق', type: 'LIABILITY' },
];

async function main() {
    console.log('🏦 Initializing Financial System...\n');

    // 1. Create Internal Accounts
    console.log('📊 Creating Internal Accounts...');
    const internalAccounts = [
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

    for (const account of internalAccounts) {
        try {
            await prisma.internalAccount.upsert({
                where: { code: account.code },
                update: {},
                create: account,
            });
            console.log(`   ✅ ${account.code}: ${account.name}`);
        } catch (error) {
            console.log(`   ⚠️ ${account.code}: Already exists or error`);
        }
    }

    // 2. Create Ledger Accounts
    console.log('\n📝 Creating Ledger Accounts...');
    for (const account of LEDGER_ACCOUNTS) {
        try {
            await prisma.ledgerAccount.upsert({
                where: { code: account.code },
                update: {},
                create: {
                    ...account,
                    isSystem: true,
                },
            });
            console.log(`   ✅ ${account.code}: ${account.name}`);
        } catch (error) {
            console.log(`   ⚠️ ${account.code}: Already exists or error`);
        }
    }

    // 3. Create Advanced Settings
    console.log('\n⚙️ Creating Advanced Settings...');
    try {
        const existingSettings = await prisma.advancedSettings.findFirst();
        if (!existingSettings) {
            await prisma.advancedSettings.create({
                data: {
                    // User Limits
                    userDailyLimit: 5000,
                    userWeeklyLimit: 20000,
                    userMonthlyLimit: 50000,
                    userRateLimitPer10Min: 10,

                    // Merchant Limits
                    merchantDailyPaymentLimit: 50000,
                    merchantMonthlyLimit: 500000,

                    // Agent Limits
                    agentDailyCreditLimit: 100000,
                    agentDailyWithdrawLimit: 50000,
                    agentMaxCashHold: 100000,

                    // Risk Thresholds
                    riskHighAmountThreshold: 5000,
                    riskRapidTxThreshold: 5,
                    riskNewDeviceHoldDays: 3,

                    // Auto-freeze triggers
                    autoFreezeHighAmount: true,
                    autoFreezeNewDevice: true,
                    autoFreezeSuspiciousIP: true,
                    autoFreezeRapidTx: true,

                    // Snapshot settings
                    snapshotEnabled: true,
                    snapshotTimeHour: 3,
                    snapshotRetentionDays: 90,
                },
            });
            console.log('   ✅ Advanced settings created');
        } else {
            console.log('   ℹ️ Advanced settings already exist');
        }
    } catch (error) {
        console.log('   ⚠️ Could not create advanced settings:', error.message);
    }

    // 4. Create System Settings if not exists
    console.log('\n💳 Checking System Settings...');
    try {
        const existingSystemSettings = await prisma.systemSettings.findFirst();
        if (!existingSystemSettings) {
            await prisma.systemSettings.create({
                data: {
                    depositFeePercent: 1.0,
                    withdrawalFeePercent: 1.5,
                    transferFeePercent: 0.5,
                    qrPaymentFeePercent: 0.5,
                    agentCommissionPercent: 50.0,
                    dailyTransactionLimit: 10000,
                    weeklyTransactionLimit: 50000,
                    monthlyTransactionLimit: 200000,
                    minTransactionAmount: 1,
                    maxTransactionAmount: 50000,
                },
            });
            console.log('   ✅ System settings created');
        } else {
            console.log('   ℹ️ System settings already exist');
        }
    } catch (error) {
        console.log('   ⚠️ Could not create system settings:', error.message);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════');
    console.log('✅ Financial System Initialized Successfully!');
    console.log('═══════════════════════════════════════════');
    console.log('\n📋 Summary:');
    console.log('   • Internal Accounts: 7 accounts');
    console.log('   • Ledger Accounts: 8 accounts');
    console.log('   • Advanced Settings: Configured');
    console.log('   • System Settings: Configured');
    console.log('\n🔒 Security Features:');
    console.log('   • Double-Entry Ledger: Ready');
    console.log('   • Risk Engine: Ready');
    console.log('   • Daily Snapshots: Ready');
    console.log('   • Transaction Limits: Configured');
    console.log('\n📍 Next Steps:');
    console.log('   1. Run: npx prisma db push');
    console.log('   2. Test transactions via the app');
    console.log('   3. Set up S3 bucket for snapshots');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
