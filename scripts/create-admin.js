const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestAccounts() {
    console.log('🏦 Creating Test Accounts...\n');

    const testUsers = [
        {
            phone: '+963999999999',
            password: 'admin123',
            fullName: 'System Admin',
            fullNameAr: 'مدير النظام',
            userType: 'ADMIN',
        },
        {
            phone: '+963988888888',
            password: 'agent123',
            fullName: 'Test Agent',
            fullNameAr: 'وكيل تجريبي',
            userType: 'AGENT',
        },
        {
            phone: '+963977777777',
            password: 'merchant123',
            fullName: 'Test Merchant',
            fullNameAr: 'تاجر تجريبي',
            userType: 'MERCHANT',
        },
        {
            phone: '+963966666666',
            password: 'user123',
            fullName: 'Test User',
            fullNameAr: 'مستخدم تجريبي',
            userType: 'USER',
        },
    ];

    for (const userData of testUsers) {
        try {
            // Check if user exists
            const existing = await prisma.user.findUnique({
                where: { phone: userData.phone }
            });

            if (existing) {
                console.log(`⏭️  ${userData.userType}: ${userData.phone} (already exists)`);
                continue;
            }

            // Create user
            const passwordHash = await bcrypt.hash(userData.password, 10);

            const user = await prisma.user.create({
                data: {
                    phone: userData.phone,
                    passwordHash,
                    fullName: userData.fullName,
                    fullNameAr: userData.fullNameAr,
                    userType: userData.userType,
                    status: 'ACTIVE',
                    kycStatus: 'APPROVED',
                    isActive: true,
                }
            });

            // Create wallet
            await prisma.wallet.create({
                data: {
                    userId: user.id,
                    balance: userData.userType === 'USER' ? 100 : 0,
                    walletType: 'PERSONAL',
                }
            });

            // Create agent profile if AGENT
            if (userData.userType === 'AGENT') {
                await prisma.agentProfile.create({
                    data: {
                        userId: user.id,
                        agentCode: 'AGT001',
                        businessName: 'Test Agency',
                        location: 'Damascus',
                        creditLimit: 10000,
                    }
                });
            }

            // Create merchant profile if MERCHANT
            if (userData.userType === 'MERCHANT') {
                await prisma.merchantProfile.create({
                    data: {
                        userId: user.id,
                        merchantCode: 'MRC001',
                        businessName: 'Test Store',
                        businessNameAr: 'متجر تجريبي',
                        businessType: 'RETAIL',
                        businessAddress: 'Damascus',
                        qrCode: 'QR-MRC001-' + Date.now(),
                    }
                });
            }

            console.log(`✅ ${userData.userType}: ${userData.phone} (created)`);

        } catch (error) {
            console.error(`❌ Error creating ${userData.userType}:`, error.message);
        }
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ Test Accounts Created!');
    console.log('═══════════════════════════════════════════\n');
    console.log('📋 Login Credentials:');
    console.log('─────────────────────────────────────────────');
    console.log('| Role     | Phone           | Password     |');
    console.log('─────────────────────────────────────────────');
    console.log('| Admin    | +963999999999   | admin123     |');
    console.log('| Agent    | +963988888888   | agent123     |');
    console.log('| Merchant | +963977777777   | merchant123  |');
    console.log('| User     | +963966666666   | user123      |');
    console.log('─────────────────────────────────────────────');
}

createTestAccounts()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
