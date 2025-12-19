const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetAllValues() {
    console.log('🔄 Starting system reset...\n');

    try {
        // 1. Delete all settlements
        const deletedSettlements = await prisma.settlement.deleteMany({});
        console.log(`✅ Deleted ${deletedSettlements.count} settlements`);

        // 2. Delete all transactions
        const deletedTransactions = await prisma.transaction.deleteMany({});
        console.log(`✅ Deleted ${deletedTransactions.count} transactions`);

        // 3. Delete all notifications
        const deletedNotifications = await prisma.notification.deleteMany({});
        console.log(`✅ Deleted ${deletedNotifications.count} notifications`);

        // 4. Reset all wallets to zero
        const resetWallets = await prisma.wallet.updateMany({
            data: {
                balance: 0,
                frozenBalance: 0,
            }
        });
        console.log(`✅ Reset ${resetWallets.count} wallets to zero`);

        // 5. Reset all agent profiles
        const resetAgents = await prisma.agentProfile.updateMany({
            data: {
                currentCredit: 0,
                cashCollected: 0,
                totalDeposits: 0,
                totalWithdrawals: 0,
            }
        });
        console.log(`✅ Reset ${resetAgents.count} agent profiles`);

        // 6. Reset all merchant profiles
        const resetMerchants = await prisma.merchantProfile.updateMany({
            data: {
                totalSales: 0,
                totalTransactions: 0,
            }
        });
        console.log(`✅ Reset ${resetMerchants.count} merchant profiles`);

        // 7. Delete ledger entries (if any)
        try {
            const deletedLedgerLines = await prisma.ledgerEntryLine.deleteMany({});
            console.log(`✅ Deleted ${deletedLedgerLines.count} ledger entry lines`);

            const deletedLedgerEntries = await prisma.ledgerEntry.deleteMany({});
            console.log(`✅ Deleted ${deletedLedgerEntries.count} ledger entries`);
        } catch (e) {
            console.log('⚠️ No ledger entries to delete');
        }

        console.log('\n✅ System reset complete!');
        console.log('─────────────────────────────');
        console.log('📊 All values are now ZERO');
        console.log('📊 All transactions deleted');
        console.log('📊 Ready for fresh testing');

    } catch (error) {
        console.error('❌ Error during reset:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAllValues();
