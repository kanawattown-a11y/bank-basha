'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, BellIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Notification {
    id: string;
    type: string;
    title: string;
    titleAr: string;
    message: string;
    messageAr: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationsPage() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        setMounted(true);
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/user/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/user/notifications/${id}/read`, { method: 'POST' });
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch('/api/user/notifications/read-all', { method: 'POST' });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await fetch(`/api/user/notifications/${id}`, { method: 'DELETE' });
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (hours < 1) return 'الآن';
        if (hours < 24) return `منذ ${hours} ساعة`;
        if (days < 7) return `منذ ${days} يوم`;
        return date.toLocaleDateString('ar-EG');
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'TRANSACTION': return '💰';
            case 'SECURITY': return '🔒';
            case 'PROMOTION': return '🎁';
            default: return '📢';
        }
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </Link>
                        <h1 className="text-xl font-bold text-white">🔔 الإشعارات</h1>
                        {unreadCount > 0 && (
                            <span className="badge badge-primary">{unreadCount}</span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="btn-ghost text-sm">
                            <CheckIcon className="w-4 h-4" />
                            قراءة الكل
                        </button>
                    )}
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-md mx-auto">
                    {notifications.length === 0 ? (
                        <div className="card p-8 text-center">
                            <BellIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                            <p className="text-dark-400">لا توجد إشعارات</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`card p-4 transition-all ${!notification.isRead ? 'border-primary-500/30 bg-primary-500/5' : ''
                                        }`}
                                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{getTypeIcon(notification.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-white font-semibold text-sm truncate">
                                                    {notification.titleAr || notification.title}
                                                </p>
                                                {!notification.isRead && (
                                                    <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0"></span>
                                                )}
                                            </div>
                                            <p className="text-dark-400 text-sm line-clamp-2">
                                                {notification.messageAr || notification.message}
                                            </p>
                                            <p className="text-dark-500 text-xs mt-2">
                                                {formatDate(notification.createdAt)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(notification.id);
                                            }}
                                            className="btn-ghost btn-icon text-dark-500 hover:text-red-400"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
