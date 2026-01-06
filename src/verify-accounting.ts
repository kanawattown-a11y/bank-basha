
import { PrismaClient } from '@prisma/client';
import { verifySystemBalance } from './lib/financial/core-ledger';

const prisma = new PrismaClient();

async function main() {
    console.log('🦅 STARTING EXTREME ACCOUNTING VERIFICATION 🦅');
    console.log('================================================');

    try {
        // 1. Verify System Balance Integrity
        console.log('\n🔍 Verifying System Balance (Dual Currency)...');
        const balanceCheck = await verifySystemBalance();

        console.log('\n💵 USD LEDGER INTEGRITY:');
        console.log(`   System Reserve: ${balanceCheck.USD.systemReserve}`);
        console.log(`   User/Agent Balances: ${balanceCheck.USD.totalOther}`);
        console.log(`   Difference: ${balanceCheck.USD.difference}`);
        console.log(`   STATUS: ${balanceCheck.USD.isBalanced ? '✅ BALANCED' : '❌ IMBALANCED'}`);

        console.log('\n💷 SYP LEDGER INTEGRITY:');
        console.log(`   System Reserve: ${balanceCheck.SYP.systemReserve}`);
        console.log(`   User/Agent Balances: ${balanceCheck.SYP.totalOther}`);
        console.log(`   Difference: ${balanceCheck.SYP.difference}`);
        console.log(`   STATUS: ${balanceCheck.SYP.isBalanced ? '✅ BALANCED' : '❌ IMBALANCED'}`);

        if (balanceCheck.isBalanced) {
            console.log('\n✅✅ SYSTEM IS PERFECTLY BALANCED ✅✅');
        } else {
            console.error('\n❌❌ SYSTEM HAS ACCOUNTING ERRORS ❌❌');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
