/**
 * Internal Scheduler for Hourly Snapshots
 * This runs on app startup and schedules hourly snapshots automatically
 */

let isSchedulerRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Execute hourly snapshot
 */
async function executeHourlySnapshot() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.log('⚠️ CRON_SECRET not set, skipping scheduled snapshot');
        return;
    }

    try {
        console.log(`⏰ [${new Date().toISOString()}] Executing scheduled hourly snapshot...`);

        const response = await fetch(`${baseUrl}/api/cron/hourly-snapshot`, {
            method: 'POST',
            headers: {
                'x-cron-secret': cronSecret,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (data.success) {
            console.log(`✅ Hourly snapshot created: ${data.snapshot?.walletCount || 0} wallets, checksum: ${data.snapshot?.checksum?.substring(0, 12)}...`);
            if (data.snapshot?.s3Key) {
                console.log(`☁️ Uploaded to S3: ${data.snapshot.s3Key}`);
            }
        } else if (data.message) {
            console.log(`ℹ️ ${data.message}`);
        } else {
            console.error('❌ Snapshot failed:', data.error);
        }
    } catch (error) {
        console.error('❌ Scheduler error:', error);
    }
}

/**
 * Start the hourly scheduler
 */
export function startHourlyScheduler() {
    if (isSchedulerRunning) {
        console.log('📅 Hourly scheduler already running');
        return;
    }

    console.log('🚀 Starting hourly snapshot scheduler...');
    isSchedulerRunning = true;

    // Calculate time until next hour
    const now = new Date();
    const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
    const msUntilNextHour = nextHour.getTime() - now.getTime();

    console.log(`⏱️ First snapshot in ${Math.round(msUntilNextHour / 1000 / 60)} minutes (at ${nextHour.toLocaleTimeString()})`);

    // Run at next hour, then every hour after that
    setTimeout(() => {
        executeHourlySnapshot();

        // Set interval for every hour
        schedulerInterval = setInterval(executeHourlySnapshot, SNAPSHOT_INTERVAL_MS);
    }, msUntilNextHour);
}

/**
 * Stop the scheduler
 */
export function stopHourlyScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
    }
    isSchedulerRunning = false;
    console.log('🛑 Hourly scheduler stopped');
}

/**
 * Run snapshot immediately (for testing)
 */
export async function runSnapshotNow() {
    await executeHourlySnapshot();
}
