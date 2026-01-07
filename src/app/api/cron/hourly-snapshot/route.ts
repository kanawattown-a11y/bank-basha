/**
 * Hourly Balance Snapshot API
 * GET - Get recent hourly snapshots
 * POST - Trigger manual hourly snapshot (or called by cron)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const S3_BUCKET = process.env.S3_BACKUP_BUCKET || 'bank-basha-backups';

// Verify admin or cron access
async function verifyAccess(request: NextRequest) {
    // Check for cron secret (for automated calls)
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
        return { isCron: true };
    }

    // Check for admin access
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) {
        return null;
    }

    const payload = verifyAccessToken(token);
    if (!payload || payload.userType !== 'ADMIN') {
        return null;
    }

    return { isCron: false, userId: payload.userId };
}

// GET: Get recent hourly snapshots
export async function GET(request: NextRequest) {
    try {
        const access = await verifyAccess(request);
        if (!access) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const { searchParams } = new URL(request.url);
        const hours = parseInt(searchParams.get('hours') || '24');

        const snapshots = await prisma.hourlyBalanceSnapshot.findMany({
            orderBy: { snapshotHour: 'desc' },
            take: hours,
            select: {
                id: true,
                snapshotHour: true,
                totalWalletsUSD: true,
                totalWalletsSYP: true,
                totalAgentCredit: true,
                totalAgentCreditSYP: true,
                totalAgentCash: true,
                totalAgentCashSYP: true,
                systemReserveUSD: true,
                systemReserveSYP: true,
                feesCollectedUSD: true,
                feesCollectedSYP: true,
                walletCount: true,
                agentCount: true,
                checksum: true,
                createdAt: true,
            },
        });

        return NextResponse.json(
            {
                snapshots,
                stats: {
                    total: snapshots.length,
                    latestSnapshot: snapshots[0]?.snapshotHour || null,
                    oldestSnapshot: snapshots[snapshots.length - 1]?.snapshotHour || null,
                },
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get hourly snapshots error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST: Create hourly snapshot
export async function POST(request: NextRequest) {
    try {
        const access = await verifyAccess(request);
        if (!access) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        // Round to current hour
        const now = new Date();
        const snapshotHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

        // Check if snapshot already exists for this hour
        const existing = await prisma.hourlyBalanceSnapshot.findUnique({
            where: { snapshotHour },
        });

        if (existing) {
            return NextResponse.json(
                { message: 'Snapshot already exists for this hour', snapshot: existing },
                { status: 200, headers: getSecurityHeaders() }
            );
        }

        console.log(`📸 Creating hourly snapshot for ${snapshotHour.toISOString()}...`);

        // ═══════════════════════════════════════════════════════════════
        // COLLECT ALL BALANCES
        // ═══════════════════════════════════════════════════════════════

        // 1. All Wallet Balances
        const wallets = await prisma.wallet.findMany({
            select: {
                id: true,
                userId: true,
                currency: true,
                walletType: true,
                balance: true,
            },
        });

        // 2. All Agent Balances
        const agents = await prisma.agentProfile.findMany({
            select: {
                id: true,
                userId: true,
                currentCredit: true,
                currentCreditSYP: true,
                cashCollected: true,
                cashCollectedSYP: true,
            },
        });

        // 3. All Internal Accounts
        const internalAccounts = await prisma.internalAccount.findMany({
            select: {
                code: true,
                balance: true,
            },
        });

        // ═══════════════════════════════════════════════════════════════
        // CALCULATE TOTALS
        // ═══════════════════════════════════════════════════════════════

        const totalWalletsUSD = wallets
            .filter(w => w.currency === 'USD')
            .reduce((sum, w) => sum + w.balance, 0);

        const totalWalletsSYP = wallets
            .filter(w => w.currency === 'SYP')
            .reduce((sum, w) => sum + w.balance, 0);

        const totalAgentCredit = agents.reduce((sum, a) => sum + a.currentCredit, 0);
        const totalAgentCreditSYP = agents.reduce((sum, a) => sum + (a.currentCreditSYP || 0), 0);
        const totalAgentCash = agents.reduce((sum, a) => sum + a.cashCollected, 0);
        const totalAgentCashSYP = agents.reduce((sum, a) => sum + (a.cashCollectedSYP || 0), 0);

        const sysReserve = internalAccounts.find(a => a.code === 'SYS-RESERVE');
        const sysReserveSYP = internalAccounts.find(a => a.code === 'SYS-RESERVE-SYP');
        const feesAccount = internalAccounts.find(a => a.code === 'FEES-COLLECTED');
        const feesSYP = internalAccounts.find(a => a.code === 'FEES-COLLECTED-SYP');

        // ═══════════════════════════════════════════════════════════════
        // CREATE CHECKSUM FOR INTEGRITY
        // ═══════════════════════════════════════════════════════════════

        const dataForChecksum = {
            snapshotHour: snapshotHour.toISOString(),
            wallets,
            agents,
            internalAccounts,
        };
        const checksum = crypto
            .createHash('sha256')
            .update(JSON.stringify(dataForChecksum))
            .digest('hex');

        // ═══════════════════════════════════════════════════════════════
        // SAVE SNAPSHOT
        // ═══════════════════════════════════════════════════════════════

        const snapshot = await prisma.hourlyBalanceSnapshot.create({
            data: {
                snapshotHour,
                walletBalances: JSON.stringify(wallets),
                agentBalances: JSON.stringify(agents),
                internalAccounts: JSON.stringify(internalAccounts),
                totalWalletsUSD,
                totalWalletsSYP,
                totalAgentCredit,
                totalAgentCreditSYP,
                totalAgentCash,
                totalAgentCashSYP,
                systemReserveUSD: sysReserve?.balance || 0,
                systemReserveSYP: sysReserveSYP?.balance || 0,
                feesCollectedUSD: feesAccount?.balance || 0,
                feesCollectedSYP: feesSYP?.balance || 0,
                checksum,
                walletCount: wallets.length,
                agentCount: agents.length,
            },
        });

        // ═══════════════════════════════════════════════════════════════
        // OPTIONAL: UPLOAD TO S3
        // ═══════════════════════════════════════════════════════════════

        let s3Key: string | undefined;
        let s3Error: string | undefined;

        // Check if AWS is configured
        const hasAwsConfig = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
        const hasBucket = process.env.S3_BACKUP_BUCKET;

        console.log(`📋 AWS Config: KEY=${!!process.env.AWS_ACCESS_KEY_ID}, SECRET=${!!process.env.AWS_SECRET_ACCESS_KEY}, BUCKET=${S3_BUCKET}`);

        if (hasAwsConfig && hasBucket) {
            try {
                const dateStr = snapshotHour.toISOString().replace(/[:.]/g, '-');
                s3Key = `hourly-snapshots/${snapshotHour.toISOString().split('T')[0]}/${dateStr}.json`;

                const fullData = {
                    snapshotHour,
                    wallets,
                    agents,
                    internalAccounts,
                    totals: {
                        totalWalletsUSD,
                        totalWalletsSYP,
                        totalAgentCredit,
                        totalAgentCreditSYP,
                        totalAgentCash,
                        totalAgentCashSYP,
                    },
                    checksum,
                };

                console.log(`⏳ Uploading to S3 bucket: ${S3_BUCKET}, key: ${s3Key}...`);

                await s3Client.send(
                    new PutObjectCommand({
                        Bucket: S3_BUCKET,
                        Key: s3Key,
                        Body: JSON.stringify(fullData, null, 2),
                        ContentType: 'application/json',
                        Metadata: {
                            checksum,
                            'snapshot-hour': snapshotHour.toISOString(),
                        },
                    })
                );

                // Update with S3 key
                await prisma.hourlyBalanceSnapshot.update({
                    where: { id: snapshot.id },
                    data: { s3Key },
                });

                console.log(`☁️ ✅ Uploaded to S3 successfully: ${s3Key}`);
            } catch (err: any) {
                s3Error = err?.message || 'Unknown S3 error';
                console.error('❌ S3 upload failed:', {
                    error: s3Error,
                    code: err?.Code || err?.$metadata?.httpStatusCode,
                    bucket: S3_BUCKET,
                });
            }
        } else {
            console.log('⚠️ S3 upload skipped: Missing AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or S3_BACKUP_BUCKET');
        }

        console.log(`✅ Hourly snapshot created: ${wallets.length} wallets, ${agents.length} agents`);

        return NextResponse.json(
            {
                success: true,
                snapshot: {
                    id: snapshot.id,
                    snapshotHour: snapshot.snapshotHour,
                    walletCount: snapshot.walletCount,
                    agentCount: snapshot.agentCount,
                    checksum: snapshot.checksum,
                    s3Key,
                },
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Create hourly snapshot error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
