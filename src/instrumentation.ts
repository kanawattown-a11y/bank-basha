/**
 * Next.js Instrumentation
 * This file runs when the server starts and initializes background tasks
 */

export async function register() {
    // Only run on server side
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        console.log('🚀 Initializing Bank Basha server instrumentation...');

        // Start hourly snapshot scheduler
        const { startHourlyScheduler } = await import('@/lib/scheduler/hourly-snapshot-scheduler');

        // Delay start to allow server to fully initialize
        setTimeout(() => {
            console.log('📅 Starting scheduled tasks...');
            startHourlyScheduler();
        }, 5000); // 5 second delay
    }
}
