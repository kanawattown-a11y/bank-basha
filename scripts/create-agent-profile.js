/**
 * Create agent profile for Test Agent
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userId = 'd13a3ad6-a71f-401f-aba9-e9ff05655dfc';

    console.log('🔧 Creating agentProfile for Test Agent...\n');

    // Check if profile already exists
    const existing = await prisma.agentProfile.findFirst({
        where: { userId },
    });

    if (existing) {
        console.log('✅ AgentProfile already exists!');
        console.log(`  - Agent Code: ${existing.agentCode}`);
        return;
    }

    // Create agent profile
    const agentProfile = await prisma.agentProfile.create({
        data: {
            userId: userId,
            agentCode: 'AG001',
            businessName: 'Test Agent Office',
            businessNameAr: 'مكتب الوكيل التجريبي',
            businessAddress: 'Damascus, Syria',
            latitude: 33.5138,
            longitude: 36.2765,
            cashCollected: 0,
            currentCredit: 0,
            creditLimit: 10000,
        },
    });

    console.log('✅ AgentProfile created successfully!');
    console.log(`  - ID: ${agentProfile.id}`);
    console.log(`  - Agent Code: ${agentProfile.agentCode}`);
    console.log(`  - Business: ${agentProfile.businessName}`);
    console.log('');
    console.log('🎉 You can now access /agent page!');
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
