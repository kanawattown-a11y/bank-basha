/**
 * Risk Engine - Internal Risk Management
 * Bank Basha - Financial Stability Engine
 * 
 * Detects and flags suspicious transactions for manual review
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export interface RiskCheckResult {
    passed: boolean;
    riskScore: number;
    alerts: RiskAlertData[];
    shouldHold: boolean;
}

export interface RiskAlertData {
    type: string;
    score: number;
    reason: string;
    reasonAr: string;
}

export interface TransactionRiskContext {
    userId: string;
    amount: number;
    type: string;
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
}

// ============================================
// SETTINGS
// ============================================

async function getAdvancedSettings() {
    const settings = await prisma.advancedSettings.findFirst();
    if (settings) return settings;

    // Create default settings if not exists
    return prisma.advancedSettings.create({
        data: {},
    });
}

// ============================================
// RISK CHECKS
// ============================================

/**
 * Check if amount exceeds threshold
 */
async function checkHighAmount(
    amount: number,
    settings: Awaited<ReturnType<typeof getAdvancedSettings>>
): Promise<RiskAlertData | null> {
    if (amount >= settings.riskHighAmountThreshold) {
        return {
            type: 'HIGH_AMOUNT',
            score: Math.min(100, (amount / settings.riskHighAmountThreshold) * 30),
            reason: `Transaction amount $${amount} exceeds threshold $${settings.riskHighAmountThreshold}`,
            reasonAr: `مبلغ المعاملة $${amount} يتجاوز الحد $${settings.riskHighAmountThreshold}`,
        };
    }
    return null;
}

/**
 * Check for rapid transactions (too many in short time)
 */
async function checkRapidTransactions(
    userId: string,
    settings: Awaited<ReturnType<typeof getAdvancedSettings>>
): Promise<RiskAlertData | null> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const recentCount = await prisma.transaction.count({
        where: {
            senderId: userId,
            createdAt: { gte: tenMinutesAgo },
        },
    });

    if (recentCount >= settings.riskRapidTxThreshold) {
        return {
            type: 'RAPID_TRANSACTIONS',
            score: Math.min(100, (recentCount / settings.riskRapidTxThreshold) * 40),
            reason: `${recentCount} transactions in last 10 minutes (threshold: ${settings.riskRapidTxThreshold})`,
            reasonAr: `${recentCount} معاملة في آخر 10 دقائق (الحد: ${settings.riskRapidTxThreshold})`,
        };
    }
    return null;
}

/**
 * Check for new/unknown device
 */
async function checkNewDevice(
    userId: string,
    deviceId: string | undefined,
    settings: Awaited<ReturnType<typeof getAdvancedSettings>>
): Promise<RiskAlertData | null> {
    if (!deviceId) return null;

    const device = await prisma.userDevice.findUnique({
        where: { userId_deviceId: { userId, deviceId } },
    });

    if (!device) {
        // New device - register it
        await prisma.userDevice.create({
            data: {
                userId,
                deviceId,
                isTrusted: false,
            },
        });

        return {
            type: 'DEVICE_CHANGE',
            score: 50,
            reason: 'Transaction from new/unrecognized device',
            reasonAr: 'معاملة من جهاز جديد/غير معروف',
        };
    }

    if (!device.isTrusted) {
        const daysSinceCreation = (Date.now() - device.createdAt.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceCreation < settings.riskNewDeviceHoldDays) {
            return {
                type: 'DEVICE_CHANGE',
                score: 30,
                reason: `Device not yet trusted (${Math.floor(daysSinceCreation)} of ${settings.riskNewDeviceHoldDays} days)`,
                reasonAr: `الجهاز غير موثوق بعد (${Math.floor(daysSinceCreation)} من ${settings.riskNewDeviceHoldDays} أيام)`,
            };
        } else {
            // Trust the device after threshold days
            await prisma.userDevice.update({
                where: { id: device.id },
                data: { isTrusted: true, trustExpiresAt: null },
            });
        }
    }

    // Update last used
    await prisma.userDevice.update({
        where: { id: device.id },
        data: { lastUsedAt: new Date() },
    });

    return null;
}

/**
 * Check for suspicious IP patterns
 */
async function checkSuspiciousIP(
    userId: string,
    ipAddress: string | undefined
): Promise<RiskAlertData | null> {
    if (!ipAddress) return null;

    // Get user's typical IPs
    const recentSessions = await prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { ipAddress: true },
    });

    const knownIPs = new Set(recentSessions.map((s) => s.ipAddress).filter(Boolean));

    // If user has history but this IP is new
    if (knownIPs.size > 0 && !knownIPs.has(ipAddress)) {
        return {
            type: 'SUSPICIOUS_IP',
            score: 25,
            reason: `Transaction from new IP address: ${ipAddress}`,
            reasonAr: `معاملة من عنوان IP جديد: ${ipAddress}`,
        };
    }

    return null;
}

/**
 * Check daily/weekly/monthly limits
 */
async function checkTransactionLimits(
    userId: string,
    amount: number,
    settings: Awaited<ReturnType<typeof getAdvancedSettings>>
): Promise<RiskAlertData | null> {
    // Get or create user limits record
    let limits = await prisma.userTransactionLimit.findUnique({
        where: { userId },
    });

    const now = new Date();

    if (!limits) {
        limits = await prisma.userTransactionLimit.create({
            data: { userId },
        });
    }

    // Reset counters if needed
    const dailyReset = new Date(limits.dailyResetAt);
    const weeklyReset = new Date(limits.weeklyResetAt);
    const monthlyReset = new Date(limits.monthlyResetAt);

    const updates: any = {};

    if (now.getTime() - dailyReset.getTime() > 24 * 60 * 60 * 1000) {
        updates.dailySpent = amount;
        updates.dailyCount = 1;
        updates.dailyResetAt = now;
    } else {
        if (limits.dailySpent + amount > settings.userDailyLimit) {
            return {
                type: 'LIMIT_EXCEEDED',
                score: 60,
                reason: `Daily limit exceeded: $${limits.dailySpent + amount} > $${settings.userDailyLimit}`,
                reasonAr: `تجاوز الحد اليومي: $${limits.dailySpent + amount} > $${settings.userDailyLimit}`,
            };
        }
        updates.dailySpent = { increment: amount };
        updates.dailyCount = { increment: 1 };
    }

    // Similar checks for weekly and monthly...
    if (now.getTime() - weeklyReset.getTime() > 7 * 24 * 60 * 60 * 1000) {
        updates.weeklySpent = amount;
        updates.weeklyResetAt = now;
    } else if (limits.weeklySpent + amount > settings.userWeeklyLimit) {
        return {
            type: 'LIMIT_EXCEEDED',
            score: 70,
            reason: `Weekly limit exceeded: $${limits.weeklySpent + amount} > $${settings.userWeeklyLimit}`,
            reasonAr: `تجاوز الحد الأسبوعي: $${limits.weeklySpent + amount} > $${settings.userWeeklyLimit}`,
        };
    }

    if (now.getTime() - monthlyReset.getTime() > 30 * 24 * 60 * 60 * 1000) {
        updates.monthlySpent = amount;
        updates.monthlyResetAt = now;
    } else if (limits.monthlySpent + amount > settings.userMonthlyLimit) {
        return {
            type: 'LIMIT_EXCEEDED',
            score: 80,
            reason: `Monthly limit exceeded: $${limits.monthlySpent + amount} > $${settings.userMonthlyLimit}`,
            reasonAr: `تجاوز الحد الشهري: $${limits.monthlySpent + amount} > $${settings.userMonthlyLimit}`,
        };
    }

    // Update limits
    await prisma.userTransactionLimit.update({
        where: { userId },
        data: updates,
    });

    return null;
}

// ============================================
// MAIN RISK CHECK
// ============================================

/**
 * Run all risk checks on a transaction
 */
export async function checkTransactionRisk(
    context: TransactionRiskContext
): Promise<RiskCheckResult> {
    const settings = await getAdvancedSettings();
    const alerts: RiskAlertData[] = [];

    // Run all checks
    const checks = await Promise.all([
        checkHighAmount(context.amount, settings),
        checkRapidTransactions(context.userId, settings),
        checkNewDevice(context.userId, context.deviceId, settings),
        checkSuspiciousIP(context.userId, context.ipAddress),
        checkTransactionLimits(context.userId, context.amount, settings),
    ]);

    for (const result of checks) {
        if (result) {
            alerts.push(result);
        }
    }

    // Calculate total risk score
    const riskScore = alerts.reduce((sum, alert) => sum + alert.score, 0);
    const normalizedScore = Math.min(100, riskScore);

    // Determine if should hold
    const shouldHold = alerts.some((alert) => {
        if (alert.type === 'HIGH_AMOUNT' && settings.autoFreezeHighAmount) return true;
        if (alert.type === 'DEVICE_CHANGE' && settings.autoFreezeNewDevice) return true;
        if (alert.type === 'SUSPICIOUS_IP' && settings.autoFreezeSuspiciousIP) return true;
        if (alert.type === 'RAPID_TRANSACTIONS' && settings.autoFreezeRapidTx) return true;
        if (alert.type === 'LIMIT_EXCEEDED') return true;
        return false;
    });

    return {
        passed: alerts.length === 0,
        riskScore: normalizedScore,
        alerts,
        shouldHold,
    };
}

/**
 * Create risk alert record
 */
export async function createRiskAlert(
    context: TransactionRiskContext,
    alertData: RiskAlertData,
    transactionId?: string
): Promise<string> {
    const alert = await prisma.riskAlert.create({
        data: {
            userId: context.userId,
            transactionId,
            alertType: alertData.type,
            riskScore: alertData.score,
            reason: alertData.reason,
            reasonAr: alertData.reasonAr,
            amount: context.amount,
            ipAddress: context.ipAddress,
            deviceInfo: context.deviceId,
            status: 'PENDING',
        },
    });

    return alert.id;
}

/**
 * Hold a transaction for manual review
 */
export async function holdTransaction(
    transactionId: string,
    riskAlertId: string | undefined,
    reason: string,
    reasonAr: string,
    amount: number
): Promise<string> {
    const held = await prisma.heldTransaction.create({
        data: {
            transactionId,
            riskAlertId,
            reason,
            reasonAr,
            holdAmount: amount,
            status: 'HELD',
        },
    });

    // Update transaction status
    await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'PROCESSING' },
    });

    return held.id;
}

/**
 * Release a held transaction
 */
export async function releaseHeldTransaction(
    heldId: string,
    releasedBy: string,
    notes?: string
): Promise<void> {
    const held = await prisma.heldTransaction.findUnique({
        where: { id: heldId },
    });

    if (!held || held.status !== 'HELD') {
        throw new Error('Transaction not found or already processed');
    }

    await prisma.$transaction([
        prisma.heldTransaction.update({
            where: { id: heldId },
            data: {
                status: 'RELEASED',
                releasedBy,
                releasedAt: new Date(),
                releaseNotes: notes,
            },
        }),
        prisma.transaction.update({
            where: { id: held.transactionId },
            data: { status: 'COMPLETED', completedAt: new Date() },
        }),
    ]);
}

/**
 * Get pending risk alerts for admin review
 */
export async function getPendingRiskAlerts() {
    return prisma.riskAlert.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
}

/**
 * Get held transactions for admin review
 */
export async function getHeldTransactions() {
    return prisma.heldTransaction.findMany({
        where: { status: 'HELD' },
        orderBy: { createdAt: 'desc' },
    });
}

export default {
    checkTransactionRisk,
    createRiskAlert,
    holdTransaction,
    releaseHeldTransaction,
    getPendingRiskAlerts,
    getHeldTransactions,
};
