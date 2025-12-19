'use client';

import { useEffect, useState, useCallback } from 'react';
import { getFCMToken, saveFCMToken, onForegroundMessage, initializeMessaging } from '@/lib/firebase/firebase';

interface Notification {
    title: string;
    body: string;
    data?: Record<string, string>;
}

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check if push is supported
        if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
            setIsSupported(true);
        }
    }, []);

    const subscribe = useCallback(async () => {
        if (!isSupported) {
            setError('Push notifications not supported');
            return false;
        }

        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service worker registered:', registration);

            // Initialize messaging
            initializeMessaging();

            // Get FCM token
            const token = await getFCMToken();
            if (token) {
                // Save to server
                const saved = await saveFCMToken(token);
                if (saved) {
                    setIsSubscribed(true);
                    console.log('Push notifications enabled');
                    return true;
                }
            }

            setError('Failed to get FCM token');
            return false;
        } catch (err) {
            console.error('Push subscription error:', err);
            setError('Failed to subscribe to push notifications');
            return false;
        }
    }, [isSupported]);

    useEffect(() => {
        if (!isSupported) return;

        // Listen for foreground messages
        const unsubscribe = onForegroundMessage((payload) => {
            const title = payload.notification?.title || 'Bank Basha';
            const body = payload.notification?.body || '';

            setNotification({
                title,
                body,
                data: payload.data,
            });

            // Show browser notification for foreground messages
            if (Notification.permission === 'granted') {
                const browserNotification = new Notification(title, {
                    body,
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/badge-72x72.png',
                    tag: 'bank-basha-notification',
                    requireInteraction: true, // Stay until user interacts
                });

                // Close notification after 10 seconds
                setTimeout(() => browserNotification.close(), 10000);

                // Handle click
                browserNotification.onclick = () => {
                    window.focus();
                    browserNotification.close();
                };
            }

            // Auto-clear state after 5 seconds
            setTimeout(() => setNotification(null), 5000);
        });

        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [isSupported]);

    const clearNotification = useCallback(() => {
        setNotification(null);
    }, []);

    return {
        isSupported,
        isSubscribed,
        notification,
        error,
        subscribe,
        clearNotification,
    };
}

export default usePushNotifications;
