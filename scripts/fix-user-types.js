/**
 * Script to fix user types in database
 * - Changes MERCHANT userType to USER with hasMerchantAccount = true
 * - Run with: node scripts/fix-user-types.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Fixing user types...\n');

    // Find all users with userType = MERCHANT
    const merchantUsers = await prisma.user.findMany({
        where: { userType: 'MERCHANT' },
        select: { id: true, fullName: true, phone: true, hasMerchantAccount: true },
    });

    console.log(`Found ${merchantUsers.length} users with userType = MERCHANT\n`);

    for (const user of merchantUsers) {
        console.log(`- Fixing: ${user.fullName} (${user.phone})`);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                userType: 'USER',
                hasMerchantAccount: true,
            },
        });

        console.log(`  ✅ Changed to USER with hasMerchantAccount = true`);
    }

    console.log('\n✅ Done! User types fixed successfully.');
    console.log('\n📊 Summary:');
    console.log('  - USER: Regular user accounts');
    console.log('  - USER + hasMerchantAccount: Business account holders');
    console.log('  - AGENT: Agent accounts');
    console.log('  - ADMIN: Admin accounts');
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
