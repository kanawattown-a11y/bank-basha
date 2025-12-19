const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeSystemSettings() {
    try {
        console.log('Checking for existing system settings...');

        // Check if settings already exist
        let settings = await prisma.systemSettings.findFirst();

        if (settings) {
            console.log('✓ System settings already exist:', settings);
        } else {
            console.log('Creating default system settings...');
            settings = await prisma.systemSettings.create({
                data: {
                    depositFeePercent: 1.0,
                    withdrawalFeePercent: 1.5,
                    transferFeePercent: 0.5,
                    qrPaymentFeePercent: 0.5,
                    agentCommissionPercent: 50.0,
                    settlementPlatformCommission: 0.5,
                    settlementAgentCommission: 0.5,
                    dailyTransactionLimit: 10000.0,
                    weeklyTransactionLimit: 50000.0,
                    monthlyTransactionLimit: 200000.0,
                    minTransactionAmount: 1.0,
                    maxTransactionAmount: 50000.0,
                },
            });
            console.log('✓ Default system settings created successfully!');
        }

        console.log('\nCurrent Settings:');
        console.log('- Deposit Fee: ' + settings.depositFeePercent + '%');
        console.log('- Withdrawal Fee: ' + settings.withdrawalFeePercent + '%');
        console.log('- Transfer Fee: ' + settings.transferFeePercent + '%');
        console.log('- QR Payment Fee: ' + settings.qrPaymentFeePercent + '%');
        console.log('- Agent Commission: ' + settings.agentCommissionPercent + '%');
        console.log('- Settlement Platform Commission: ' + settings.settlementPlatformCommission + '%');
        console.log('- Settlement Agent Commission: ' + settings.settlementAgentCommission + '%');
        console.log('- Min Transaction: $' + settings.minTransactionAmount);
        console.log('- Max Transaction: $' + settings.maxTransactionAmount);
        console.log('- Daily Limit: $' + settings.dailyTransactionLimit);
        console.log('- Weekly Limit: $' + settings.weeklyTransactionLimit);
        console.log('- Monthly Limit: $' + settings.monthlyTransactionLimit);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

initializeSystemSettings();
