// Firebase Client Configuration
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyBdC6bEoHH8abpxbWnXl1TKDYsoYdDTJvo",
    authDomain: "bank-basha.firebaseapp.com",
    projectId: "bank-basha",
    storageBucket: "bank-basha.firebasestorage.app",
    messagingSenderId: "459313444690",
    appId: "1:459313444690:web:a7c324fce9759c0a3dec8b"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messaging: Messaging | null = null;

// Initialize messaging only in browser
export const initializeMessaging = () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
            messaging = getMessaging(app);
            return messaging;
        } catch (error) {
            console.error('Failed to initialize messaging:', error);
            return null;
        }
    }
    return null;
};

// Get FCM Token
export const getFCMToken = async (): Promise<string | null> => {
    try {
        if (!messaging) {
            messaging = initializeMessaging();
        }
        if (!messaging) return null;

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // Get registration token
        const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        return token;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
};

// Listen to foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
    if (!messaging) {
        console.log('🔄 Initializing messaging for foreground listener...');
        messaging = initializeMessaging();
    }
    if (messaging) {
        console.log('🔔 Foreground message listener attached');
        return onMessage(messaging, (payload) => {
            console.log('📬 Foreground message received:', payload);
            callback(payload);
        });
    } else {
        console.warn('⚠️ Could not attach foreground message listener - messaging not available');
    }
    return null;
};

// Save FCM token to server
export const saveFCMToken = async (token: string): Promise<boolean> => {
    try {
        const res = await fetch('/api/user/fcm-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        return res.ok;
    } catch (error) {
        console.error('Error saving FCM token:', error);
        return false;
    }
};

// Remove FCM token from server (on logout)
export const removeFCMToken = async (): Promise<boolean> => {
    try {
        const res = await fetch('/api/user/fcm-token', {
            method: 'DELETE',
        });
        return res.ok;
    } catch (error) {
        console.error('Error removing FCM token:', error);
        return false;
    }
};

export { app };
