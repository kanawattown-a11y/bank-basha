import { PrismaClient } from '@prisma/client';
import { hashPassword, generateAgentCode, generateMerchantCode, generateQRCode } from '../src/lib/auth/security';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create Admin User
    const adminPassword = await hashPassword('admin123');
    const admin = await prisma.user.upsert({
        where: { phone: '+963999999999' },
        update: {},
        create: {
            phone: '+963999999999',
            email: 'admin@bankbasha.com',
            passwordHash: adminPassword,
            fullName: 'System Admin',
            fullNameAr: 'مدير النظام',
            userType: 'ADMIN',
            status: 'ACTIVE',
            kycStatus: 'APPROVED',
            wallets: {
                create: [
                    { balance: 0, currency: 'USD', walletType: 'PERSONAL' },
                    { balance: 0, currency: 'SYP', walletType: 'PERSONAL' },
                ],
            },
        },
    });
    console.log('✅ Admin user created:', admin.phone);

    // Create Test Agent
    const agentPassword = await hashPassword('agent123');
    const agent = await prisma.user.upsert({
        where: { phone: '+963988888888' },
        update: {},
        create: {
            phone: '+963988888888',
            email: 'agent@bankbasha.com',
            passwordHash: agentPassword,
            fullName: 'Test Agent',
            fullNameAr: 'وكيل تجريبي',
            userType: 'AGENT',
            status: 'ACTIVE',
            kycStatus: 'APPROVED',
            wallets: {
                create: [
                    { balance: 1000000, currency: 'USD', walletType: 'PERSONAL' },
                    { balance: 50000000, currency: 'SYP', walletType: 'PERSONAL' },
                ],
            },
            agentProfile: {
                create: {
                    agentCode: generateAgentCode(),
                    businessName: 'Test Agent Shop',
                    businessNameAr: 'متجر الوكيل التجريبي',
                    businessAddress: 'Sweida City Center',
                    creditLimit: 1000000,
                    currentCredit: 1000000,
                    currentCreditSYP: 50000000,
                    cashCollected: 0,
                    cashCollectedSYP: 0,
                },
            },
        },
    });
    console.log('✅ Agent user created:', agent.phone);

    // Create Test Merchant
    const merchantPassword = await hashPassword('merchant123');
    const merchant = await prisma.user.upsert({
        where: { phone: '+963977777777' },
        update: {},
        create: {
            phone: '+963977777777',
            email: 'merchant@bankbasha.com',
            passwordHash: merchantPassword,
            fullName: 'Test Merchant',
            fullNameAr: 'تاجر تجريبي',
            userType: 'MERCHANT',
            status: 'ACTIVE',
            kycStatus: 'APPROVED',
            hasMerchantAccount: true,
            wallets: {
                create: [
                    { balance: 0, currency: 'USD', walletType: 'PERSONAL' },
                    { balance: 0, currency: 'SYP', walletType: 'PERSONAL' },
                    { balance: 0, currency: 'USD', walletType: 'BUSINESS' },
                    { balance: 0, currency: 'SYP', walletType: 'BUSINESS' },
                ],
            },
            merchantProfile: {
                create: {
                    merchantCode: generateMerchantCode(),
                    businessName: 'Test Shop',
                    businessNameAr: 'المتجر التجريبي',
                    businessType: 'Retail',
                    businessAddress: 'Sweida Main Street',
                    qrCode: generateQRCode(),
                },
            },
        },
    });
    console.log('✅ Merchant user created:', merchant.phone);

    // Create Test Regular User
    const userPassword = await hashPassword('user123');
    const user = await prisma.user.upsert({
        where: { phone: '+963966666666' },
        update: {},
        create: {
            phone: '+963966666666',
            email: 'user@bankbasha.com',
            passwordHash: userPassword,
            fullName: 'Test User',
            fullNameAr: 'مستخدم تجريبي',
            userType: 'USER',
            status: 'ACTIVE',
            kycStatus: 'APPROVED',
            wallets: {
                create: [
                    { balance: 50000, currency: 'USD', walletType: 'PERSONAL' },
                    { balance: 2500000, currency: 'SYP', walletType: 'PERSONAL' },
                ],
            },
        },
    });
    console.log('✅ Regular user created:', user.phone);

    // Create Ledger System Accounts
    const systemAccounts = [
        { code: 'A-1001', name: 'Platform Cash', nameAr: 'النقد في الصندوق', type: 'ASSET' },
        { code: 'A-1002', name: 'Platform Bank', nameAr: 'الحساب البنكي', type: 'ASSET' },
        { code: 'A-1100', name: 'Agent Receivables', nameAr: 'ذمم الوكلاء', type: 'ASSET' },
        { code: 'L-2001', name: 'User Wallets', nameAr: 'محافظ المستخدمين', type: 'LIABILITY' },
        { code: 'L-2002', name: 'Agent Wallets', nameAr: 'محافظ الوكلاء', type: 'LIABILITY' },
        { code: 'L-2003', name: 'Merchant Wallets', nameAr: 'محافظ التجار', type: 'LIABILITY' },
        { code: 'R-4001', name: 'Deposit Fees', nameAr: 'رسوم الإيداع', type: 'REVENUE' },
        { code: 'R-4002', name: 'Withdrawal Fees', nameAr: 'رسوم السحب', type: 'REVENUE' },
        { code: 'R-4003', name: 'Transfer Fees', nameAr: 'رسوم التحويل', type: 'REVENUE' },
        { code: 'E-5001', name: 'Agent Commissions', nameAr: 'عمولات الوكلاء', type: 'EXPENSE' },
    ];

    for (const account of systemAccounts) {
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
    console.log('✅ Ledger accounts created');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📋 Test Accounts:');
    console.log('   Admin:    +963999999999 / admin123');
    console.log('   Agent:    +963988888888 / agent123');
    console.log('   Merchant: +963977777777 / merchant123');
    console.log('   User:     +963966666666 / user123');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
