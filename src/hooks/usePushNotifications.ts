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
                    data: payload.data, // Pass data for deep linking
                    requireInteraction: true, // Stay until user interacts
                });

                // Close notification after 10 seconds
                setTimeout(() => browserNotification.close(), 10000);

                // Handle click - Navigate to specific page based on type
                browserNotification.onclick = () => {
                    const data = payload.data || {};
                    const notificationType = data.type;

                    // Determine navigation URL
                    let targetUrl = '/dashboard';

                    switch (notificationType) {
                        case 'TRANSFER':
                        case 'TRANSFER_OTP':
                        case 'TRANSACTION':
                            targetUrl = '/dashboard/transactions';
                            break;
                        case 'DEPOSIT':
                            targetUrl = '/dashboard/deposit';
                            break;
                        case 'WITHDRAW':
                            targetUrl = '/dashboard/withdraw';
                            break;
                        case 'QR_PAYMENT':
                            targetUrl = '/dashboard/transactions';
                            break;
                        case 'SERVICE_PURCHASE':
                        case 'SERVICE_ORDER':
                            targetUrl = '/dashboard/services';
                            break;
                        case 'KYC_UPDATE':
                        case 'KYC_APPROVED':
                        case 'KYC_REJECTED':
                            targetUrl = '/dashboard/settings';
                            break;
                        case 'MERCHANT_PAYMENT':
                            targetUrl = '/merchant';
                            break;
                        case 'AGENT_SETTLEMENT':
                        case 'AGENT_CREDIT':
                            targetUrl = '/agent';
                            break;
                        case 'SUPPORT_TICKET':
                            targetUrl = '/dashboard/support';
                            break;
                    }

                    // Add query params if available
                    if (data.transactionId) {
                        targetUrl += `?id=${data.transactionId}`;
                    } else if (data.orderId) {
                        targetUrl += `?orderId=${data.orderId}`;
                    } else if (data.ticketId) {
                        targetUrl += `?ticketId=${data.ticketId}`;
                    }

                    // Navigate
                    window.location.href = targetUrl;
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
