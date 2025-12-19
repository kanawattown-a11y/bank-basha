/**
 * Check agent account status
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phone = '+963988888888';

    console.log(`🔍 Checking agent account: ${phone}\n`);

    const user = await prisma.user.findUnique({
        where: { phone },
        include: {
            wallet: true,
            agentProfile: true,
        },
    });

    if (!user) {
        console.log('❌ User not found!');
        return;
    }

    console.log('📋 User Details:');
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Name: ${user.fullName}`);
    console.log(`  - Phone: ${user.phone}`);
    console.log(`  - userType: ${user.userType}`);
    console.log(`  - KYC: ${user.kycStatus}`);
    console.log(`  - Active: ${user.isActive}`);
    console.log('');

    if (user.wallet) {
        console.log('💰 Wallet:');
        console.log(`  - Balance: $${user.wallet.balance}`);
    } else {
        console.log('❌ No wallet found!');
    }
    console.log('');

    if (user.agentProfile) {
        console.log('✅ Agent Profile:');
        console.log(`  - Agent Code: ${user.agentProfile.agentCode}`);
        console.log(`  - Business: ${user.agentProfile.businessName}`);
        console.log(`  - Status: ${user.agentProfile.status}`);
    } else {
        console.log('❌ No agentProfile found! This is why you get 404.');
        console.log('');
        console.log('🔧 To fix, you need to create an agentProfile for this user.');
    }
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
