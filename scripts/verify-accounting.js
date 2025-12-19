const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyAccountingIntegrity() {
    try {
        console.log('🔍 فحص النظام المحاسبي...\n');

        // 1. Get Central Bank balance
        const centralBank = await prisma.user.findFirst({
            where: { phone: 'CENTRAL_BANK' },
            include: { wallet: true },
        });

        const centralBankBalance = centralBank?.wallet?.balance || 0;
        console.log('🏦 البنك المركزي:');
        console.log(`   الرصيد: $${centralBankBalance.toFixed(2)}`);
        console.log(`   ${centralBankBalance < 0 ? '✓ سالب (صحيح - مصدر الائتمان)' : '⚠️ موجب (يجب أن يكون سالب)'}\n`);

        // 2. Get all user wallets
        const users = await prisma.user.findMany({
            where: {
                phone: { not: 'CENTRAL_BANK' },
            },
            include: {
                wallet: true,
                agentProfile: true,
            },
        });

        let totalUserBalances = 0;
        let totalAgentCredit = 0;
        let totalAgentCash = 0;
        let userCount = 0;
        let agentCount = 0;

        users.forEach(user => {
            if (user.wallet) {
                totalUserBalances += user.wallet.balance;
                userCount++;
            }
            if (user.agentProfile) {
                totalAgentCredit += user.agentProfile.currentCredit;
                totalAgentCash += user.agentProfile.cashCollected;
                agentCount++;
            }
        });

        console.log('👥 المستخدمون:');
        console.log(`   عدد المستخدمين: ${userCount}`);
        console.log(`   إجمالي أرصدة المحافظ: $${totalUserBalances.toFixed(2)}\n`);

        console.log('🏪 الوكلاء:');
        console.log(`   عدد الوكلاء: ${agentCount}`);
        console.log(`   إجمالي الائتمان الرقمي: $${totalAgentCredit.toFixed(2)}`);
        console.log(`   إجمالي النقد المجموع: $${totalAgentCash.toFixed(2)}\n`);

        // 3. Verify double-entry bookkeeping
        const systemTotal = centralBankBalance + totalUserBalances;

        console.log('📊 التوازن المحاسبي:');
        console.log(`   البنك المركزي: $${centralBankBalance.toFixed(2)}`);
        console.log(`   + أرصدة المستخدمين: $${totalUserBalances.toFixed(2)}`);
        console.log(`   ────────────────────────────────`);
        console.log(`   = المجموع: $${systemTotal.toFixed(2)}`);

        if (Math.abs(systemTotal) < 0.01) {
            console.log(`   ✓ النظام متوازن! (Double-Entry Bookkeeping)\n`);
        } else {
            console.log(`   ⚠️ النظام غير متوازن! الفرق: $${systemTotal.toFixed(2)}\n`);
        }

        // 4. Check transactions
        const transactions = await prisma.transaction.findMany({
            where: { status: 'COMPLETED' },
        });

        let totalAmount = 0;
        let totalFees = 0;
        let totalPlatformFees = 0;
        let totalAgentFees = 0;

        transactions.forEach(tx => {
            totalAmount += tx.amount;
            totalFees += tx.fee;
            totalPlatformFees += tx.platformFee;
            totalAgentFees += tx.agentFee;
        });

        console.log('💰 إحصائيات المعاملات:');
        console.log(`   عدد المعاملات المكتملة: ${transactions.length}`);
        console.log(`   إجمالي المبالغ: $${totalAmount.toFixed(2)}`);
        console.log(`   إجمالي الرسوم: $${totalFees.toFixed(2)}`);
        console.log(`   رسوم المنصة: $${totalPlatformFees.toFixed(2)}`);
        console.log(`   عمولات الوكلاء: $${totalAgentFees.toFixed(2)}\n`);

        // 5. Summary
        console.log('═══════════════════════════════════════════');
        console.log('📋 ملخص:');

        const checks = [];

        if (centralBankBalance < 0) {
            checks.push('✓ البنك المركزي سالب');
        } else {
            checks.push('✗ البنك المركزي يجب أن يكون سالب');
        }

        if (Math.abs(systemTotal) < 0.01) {
            checks.push('✓ النظام متوازن محاسبياً');
        } else {
            checks.push('✗ النظام غير متوازن');
        }

        if (transactions.length > 0) {
            checks.push('✓ يوجد معاملات');
        } else {
            checks.push('⚠️ لا توجد معاملات');
        }

        checks.forEach(check => console.log(`   ${check}`));
        console.log('═══════════════════════════════════════════');

    } catch (error) {
        console.error('❌ خطأ:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyAccountingIntegrity();
