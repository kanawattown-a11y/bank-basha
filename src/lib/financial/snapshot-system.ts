/**
 * Daily Snapshot System
 * Bank Basha - Financial Stability Engine
 * 
 * Creates complete database backups and uploads to S3
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const prisma = new PrismaClient();

// S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const S3_BUCKET = process.env.S3_BACKUP_BUCKET || 'bank-basha-backups';
const S3_FOLDER = 'daily-snapshots';

// ============================================
// SNAPSHOT DATA COLLECTION
// ============================================

interface SnapshotData {
    metadata: {
        snapshotDate: Date;
        createdAt: Date;
        version: string;
    };
    statistics: {
        totalUsers: number;
        totalAgents: number;
        totalMerchants: number;
        totalUserBalance: number;
        totalAgentCredit: number;
        totalAgentCash: number;
        totalMerchantBalance: number;
        systemReserve: number;
        feesCollected: number;
        totalTransactions: number;
        totalVolume: number;
    };
    users: any[];
    wallets: any[];
    agents: any[];
    merchants: any[];
    transactions: any[];
    ledgerEntries: any[];
    ledgerAccounts: any[];
    internalAccounts: any[];
    settlements: any[];
    riskAlerts: any[];
    heldTransactions: any[];
    systemSettings: any;
    advancedSettings: any;
}

/**
 * Collect all data for snapshot
 */
async function collectSnapshotData(): Promise<SnapshotData> {
    const snapshotDate = new Date();

    // Collect all data
    const [
        users,
        wallets,
        agents,
        merchants,
        transactions,
        ledgerEntries,
        ledgerAccounts,
        internalAccounts,
        settlements,
        riskAlerts,
        heldTransactions,
        systemSettings,
        advancedSettings,
    ] = await Promise.all([
        prisma.user.findMany({
            select: {
                id: true,
                phone: true,
                fullName: true,
                userType: true,
                status: true,
                kycStatus: true,
                createdAt: true,
            },
        }),
        prisma.wallet.findMany(),
        prisma.agentProfile.findMany(),
        prisma.merchantProfile.findMany(),
        prisma.transaction.findMany({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
                },
            },
        }),
        prisma.ledgerEntry.findMany({
            include: { lines: true },
        }),
        prisma.ledgerAccount.findMany(),
        prisma.internalAccount.findMany(),
        prisma.settlement.findMany(),
        prisma.riskAlert.findMany({
            where: { status: 'PENDING' },
        }),
        prisma.heldTransaction.findMany({
            where: { status: 'HELD' },
        }),
        prisma.systemSettings.findFirst(),
        prisma.advancedSettings.findFirst(),
    ]);

    // Calculate statistics
    const totalUserBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    const totalAgentCredit = agents.reduce((sum, a) => sum + a.currentCredit, 0);
    const totalAgentCash = agents.reduce((sum, a) => sum + a.cashCollected, 0);

    const merchantWallets = await prisma.wallet.findMany({
        where: {
            user: { userType: 'MERCHANT' },
        },
    });
    const totalMerchantBalance = merchantWallets.reduce((sum, w) => sum + w.balance, 0);

    const systemReserveAccount = internalAccounts.find((a) => a.code === 'SYS-RESERVE');
    const feesAccount = internalAccounts.find((a) => a.code === 'FEES-COLLECTED');

    const completedTransactions = transactions.filter((t) => t.status === 'COMPLETED');
    const totalVolume = completedTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
        metadata: {
            snapshotDate,
            createdAt: new Date(),
            version: '1.0',
        },
        statistics: {
            totalUsers: users.length,
            totalAgents: agents.length,
            totalMerchants: merchants.length,
            totalUserBalance,
            totalAgentCredit,
            totalAgentCash,
            totalMerchantBalance,
            systemReserve: systemReserveAccount?.balance || 0,
            feesCollected: feesAccount?.balance || 0,
            totalTransactions: transactions.length,
            totalVolume,
        },
        users,
        wallets,
        agents,
        merchants,
        transactions,
        ledgerEntries,
        ledgerAccounts,
        internalAccounts,
        settlements,
        riskAlerts,
        heldTransactions,
        systemSettings,
        advancedSettings,
    };
}

// ============================================
// S3 UPLOAD
// ============================================

/**
 * Upload snapshot to S3
 */
async function uploadToS3(data: SnapshotData, snapshotDate: Date): Promise<{
    s3Key: string;
    s3Url: string;
    fileSize: number;
    checksum: string;
}> {
    const dateStr = snapshotDate.toISOString().split('T')[0];
    const s3Key = `${S3_FOLDER}/${dateStr}/snapshot-${dateStr}.json`;

    const jsonData = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonData, 'utf-8');
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    await s3Client.send(
        new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
            Body: buffer,
            ContentType: 'application/json',
            Metadata: {
                checksum,
                'snapshot-date': dateStr,
            },
        })
    );

    return {
        s3Key,
        s3Url: `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`,
        fileSize: buffer.length,
        checksum,
    };
}

// ============================================
// MAIN SNAPSHOT FUNCTION
// ============================================

/**
 * Create daily snapshot and upload to S3
 */
export async function createDailySnapshot(): Promise<string> {
    const snapshotDate = new Date();
    snapshotDate.setHours(0, 0, 0, 0); // Start of day

    // Check if snapshot already exists for today
    const existingSnapshot = await prisma.dailySnapshot.findUnique({
        where: { snapshotDate },
    });

    if (existingSnapshot && existingSnapshot.status === 'COMPLETED') {
        console.log('Snapshot already exists for today');
        return existingSnapshot.id;
    }

    // Create or update snapshot record
    const snapshot = await prisma.dailySnapshot.upsert({
        where: { snapshotDate },
        create: {
            snapshotDate,
            status: 'PROCESSING',
            totalUsers: 0,
            totalAgents: 0,
            totalMerchants: 0,
            totalUserBalance: 0,
            totalAgentCredit: 0,
            totalAgentCash: 0,
            totalMerchantBalance: 0,
            systemReserve: 0,
            feesCollected: 0,
            totalTransactions: 0,
            totalVolume: 0,
        },
        update: { status: 'PROCESSING' },
    });

    try {
        // Collect data
        console.log('📊 Collecting snapshot data...');
        const data = await collectSnapshotData();

        // Upload to S3
        console.log('☁️ Uploading to S3...');
        const s3Result = await uploadToS3(data, snapshotDate);

        // Update snapshot record
        await prisma.dailySnapshot.update({
            where: { id: snapshot.id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                totalUsers: data.statistics.totalUsers,
                totalAgents: data.statistics.totalAgents,
                totalMerchants: data.statistics.totalMerchants,
                totalUserBalance: data.statistics.totalUserBalance,
                totalAgentCredit: data.statistics.totalAgentCredit,
                totalAgentCash: data.statistics.totalAgentCash,
                totalMerchantBalance: data.statistics.totalMerchantBalance,
                systemReserve: data.statistics.systemReserve,
                feesCollected: data.statistics.feesCollected,
                totalTransactions: data.statistics.totalTransactions,
                totalVolume: data.statistics.totalVolume,
                s3BucketName: S3_BUCKET,
                s3Key: s3Result.s3Key,
                s3Url: s3Result.s3Url,
                fileSize: s3Result.fileSize,
                checksum: s3Result.checksum,
            },
        });

        console.log('✅ Snapshot completed successfully');
        return snapshot.id;
    } catch (error) {
        // Update with error
        await prisma.dailySnapshot.update({
            where: { id: snapshot.id },
            data: {
                status: 'FAILED',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
        });

        throw error;
    }
}

/**
 * Create local snapshot (without S3) for testing
 */
export async function createLocalSnapshot(): Promise<SnapshotData> {
    console.log('📊 Creating local snapshot...');
    const data = await collectSnapshotData();
    console.log('✅ Local snapshot created');
    return data;
}

/**
 * Get recent snapshots
 */
export async function getRecentSnapshots(limit = 30) {
    return prisma.dailySnapshot.findMany({
        orderBy: { snapshotDate: 'desc' },
        take: limit,
    });
}

/**
 * Verify snapshot integrity
 */
export async function verifySnapshotIntegrity(): Promise<{
    isValid: boolean;
    lastSnapshot: Date | null;
    missingSnapshots: string[];
}> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const snapshots = await prisma.dailySnapshot.findMany({
        where: {
            snapshotDate: { gte: thirtyDaysAgo },
            status: 'COMPLETED',
        },
        orderBy: { snapshotDate: 'desc' },
    });

    const snapshotDates = new Set(
        snapshots.map((s) => s.snapshotDate.toISOString().split('T')[0])
    );

    const missingSnapshots: string[] = [];
    const today = new Date();

    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (!snapshotDates.has(dateStr)) {
            missingSnapshots.push(dateStr);
        }
    }

    return {
        isValid: missingSnapshots.length === 0,
        lastSnapshot: snapshots[0]?.snapshotDate || null,
        missingSnapshots,
    };
}

export default {
    createDailySnapshot,
    createLocalSnapshot,
    getRecentSnapshots,
    verifySnapshotIntegrity,
};
