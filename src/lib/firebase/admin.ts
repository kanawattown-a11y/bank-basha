// Firebase Admin SDK for Server-side Push Notifications
import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const initAdmin = () => {
    if (admin.apps.length === 0) {
        let initialized = false;

        // Method 1: Try loading from file
        const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            try {
                const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log('✅ Firebase Admin initialized from file');
                initialized = true;
            } catch (error) {
                console.error('❌ Failed to load service account from file:', error);
            }
        }

        // Method 2: Try environment variable with fixed newlines
        if (!initialized && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            try {
                let jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
                const serviceAccount = JSON.parse(jsonStr);

                // Fix private key newlines
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log('✅ Firebase Admin initialized from env');
                initialized = true;
            } catch (error) {
                console.error('❌ Failed to parse env service account:', error);
            }
        }

        // Fallback: No push notifications
        if (!initialized) {
            console.log('⚠️ Firebase Admin: Push notifications disabled (no valid credentials)');
            admin.initializeApp({
                projectId: 'bank-basha',
            });
        }
    }
    return admin;
};

// Send push notification to a single device
export const sendPushNotification = async (
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<boolean> => {
    try {
        const adminApp = initAdmin();

        const message = {
            token: fcmToken,
            notification: {
                title,
                body,
            },
            data: data || {},
            android: {
                priority: 'high' as const,
                notification: {
                    sound: 'default',
                    channelId: 'bank_basha_channel',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
            webpush: {
                notification: {
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/badge-72x72.png',
                },
            },
        };

        const response = await adminApp.messaging().send(message);
        console.log('✅ Push notification sent:', response);
        return true;
    } catch (error: any) {
        // Handle invalid/expired tokens silently
        if (error?.errorInfo?.code === 'messaging/registration-token-not-registered' ||
            error?.errorInfo?.code === 'messaging/invalid-registration-token') {
            console.log('⚠️ Invalid FCM token (user needs to re-login)');
            // TODO: Could mark token as invalid in database here
            return false;
        }

        console.error('❌ Error sending push notification:', error?.message || error);
        return false;
    }
};

// Send push to multiple devices
export const sendMultiplePush = async (
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<number> => {
    try {
        const adminApp = initAdmin();

        const message = {
            tokens: fcmTokens,
            notification: {
                title,
                body,
            },
            data: data || {},
        };

        const response = await adminApp.messaging().sendEachForMulticast(message);
        console.log('Multicast sent:', response.successCount, 'successes');
        return response.successCount;
    } catch (error) {
        console.error('Error sending multicast:', error);
        return 0;
    }
};

// Send transfer OTP notification
export const sendTransferOTPNotification = async (
    fcmToken: string,
    senderName: string,
    amount: number,
    otp: string
): Promise<boolean> => {
    const title = '💰 تحويل وارد';
    const body = `${senderName} يرسل لك $${amount.toFixed(2)}. رمز التأكيد: ${otp}`;

    return sendPushNotification(fcmToken, title, body, {
        type: 'TRANSFER_OTP',
        otp,
        amount: amount.toString(),
        senderName,
    });
};

// Send transaction notification
export const sendTransactionNotification = async (
    fcmToken: string,
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'PAYMENT',
    amount: number,
    status: 'COMPLETED' | 'PENDING' | 'FAILED'
): Promise<boolean> => {
    const typeLabels = {
        DEPOSIT: 'إيداع',
        WITHDRAWAL: 'سحب',
        TRANSFER: 'تحويل',
        PAYMENT: 'دفع',
    };

    const statusLabels = {
        COMPLETED: '✅ مكتمل',
        PENDING: '⏳ قيد المعالجة',
        FAILED: '❌ فشل',
    };

    const title = `${typeLabels[type]} - ${statusLabels[status]}`;
    const body = `مبلغ: $${amount.toFixed(2)}`;

    return sendPushNotification(fcmToken, title, body, {
        type: 'TRANSACTION',
        transactionType: type,
        amount: amount.toString(),
        status,
    });
};

export default initAdmin;
