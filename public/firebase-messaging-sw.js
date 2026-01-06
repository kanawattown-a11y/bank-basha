// Firebase Cloud Messaging Service Worker
// This file MUST be in the public folder

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBdC6bEoHH8abpxbWnXl1TKDYsoYdDTJvo",
    authDomain: "bank-basha.firebaseapp.com",
    projectId: "bank-basha",
    storageBucket: "bank-basha.firebasestorage.app",
    messagingSenderId: "459313444690",
    appId: "1:459313444690:web:a7c324fce9759c0a3dec8b"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Bank Basha';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: payload.data?.type || 'general',
        data: payload.data,
        vibrate: [200, 100, 200],
        actions: [
            { action: 'open', title: 'فتح التطبيق' },
            { action: 'close', title: 'إغلاق' },
        ],
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);

    event.notification.close();

    if (event.action === 'close') {
        return; // Just close the notification
    }

    // Get notification data for deep linking
    const notificationData = event.notification.data || {};
    const notificationType = notificationData.type;

    // Determine deep link URL based on notification type
    let targetUrl = '/dashboard'; // Default fallback

    switch (notificationType) {
        case 'TRANSFER':
        case 'TRANSFER_OTP':
        case 'TRANSACTION':
            // Go to transactions page
            targetUrl = '/dashboard/transactions';
            break;

        case 'DEPOSIT':
            // Go to deposit page
            targetUrl = '/dashboard/deposit';
            break;

        case 'WITHDRAW':
            // Go to withdraw page
            targetUrl = '/dashboard/withdraw';

        case 'QR_PAYMENT':
            // Go to pay page or transactions
            targetUrl = '/dashboard/transactions';
            break;

        case 'SERVICE_PURCHASE':
        case 'SERVICE_ORDER':
            // Go to services or orders page
            targetUrl = '/dashboard/services';
            break;

        case 'KYC_UPDATE':
        case 'KYC_APPROVED':
        case 'KYC_REJECTED':
            // Go to settings/KYC page
            targetUrl = '/dashboard/settings';
            break;

        case 'MERCHANT_PAYMENT':
            // Go to merchant dashboard
            targetUrl = '/merchant';
            break;

        case 'AGENT_SETTLEMENT':
        case 'AGENT_CREDIT':
            // Go to agent dashboard
            targetUrl = '/agent';
            break;

        case 'SUPPORT_TICKET':
            // Go to support page
            targetUrl = '/dashboard/support';
            break;

        default:
            // For unknown types, go to dashboard
            targetUrl = '/dashboard';
    }

    // If specific transaction/order ID is provided, append it
    if (notificationData.transactionId) {
        targetUrl += `?id=${notificationData.transactionId}`;
    } else if (notificationData.orderId) {
        targetUrl += `?orderId=${notificationData.orderId}`;
    } else if (notificationData.ticketId) {
        targetUrl += `?ticketId=${notificationData.ticketId}`;
    }

    console.log('[Deep Link] Navigating to:', targetUrl);

    // Open or focus the target URL
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if app is already open
            for (const client of clientList) {
                if (client.url.includes('/dashboard') && 'navigate' in client) {
                    // Navigate existing window to target URL
                    return client.navigate(targetUrl).then(client => client.focus());
                }
            }
            // Otherwise, open new window with target URL
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
