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

    if (event.action === 'open' || !event.action) {
        // Open the app
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes('/dashboard') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise, open new window
                if (clients.openWindow) {
                    return clients.openWindow('/dashboard');
                }
            })
        );
    }
});
