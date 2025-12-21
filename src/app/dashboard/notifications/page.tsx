'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, BellIcon, CheckIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

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
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        if (days < 7) return `منذ ${days} يوم`;
        return date.toLocaleDateString('ar-EG');
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'TRANSACTION': return '💰';
            case 'SECURITY': return '🔒';
            case 'PROMOTION': return '🎁';
            case 'KYC': return '📋';
            case 'SUPPORT': return '💬';
            default: return '📢';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'TRANSACTION': return 'bg-green-500/20';
            case 'SECURITY': return 'bg-red-500/20';
            case 'PROMOTION': return 'bg-purple-500/20';
            case 'KYC': return 'bg-blue-500/20';
            case 'SUPPORT': return 'bg-yellow-500/20';
            default: return 'bg-primary-500/20';
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
            {/* Header */}
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <BellIcon className="w-5 h-5 text-primary-500" />
                            <h1 className="text-lg font-bold text-white">الإشعارات</h1>
                            {unreadCount > 0 && (
                                <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-primary-500 text-sm flex items-center gap-1"
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">قراءة الكل</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-20 pb-24 px-3 sm:px-4">
                <div className="max-w-lg mx-auto">
                    {notifications.length === 0 ? (
                        <div className="card p-8 text-center mt-8">
                            <div className="w-20 h-20 rounded-full bg-dark-800 flex items-center justify-center mx-auto mb-4">
                                <BellIcon className="w-10 h-10 text-dark-600" />
                            </div>
                            <p className="text-dark-400 text-lg mb-2">لا توجد إشعارات</p>
                            <p className="text-dark-500 text-sm">ستظهر هنا عند وصول إشعارات جديدة</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`bg-dark-900/80 rounded-xl p-3 border transition-all ${!notification.isRead
                                            ? 'border-primary-500/40 bg-primary-500/5'
                                            : 'border-dark-800'
                                        }`}
                                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                                >
                                    {/* Header Row */}
                                    <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-xl ${getTypeColor(notification.type)} flex items-center justify-center flex-shrink-0`}>
                                            <span className="text-lg">{getTypeIcon(notification.type)}</span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Title with unread indicator */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-white font-semibold text-sm leading-tight">
                                                    {notification.titleAr || notification.title}
                                                </h3>
                                                {!notification.isRead && (
                                                    <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0"></span>
                                                )}
                                            </div>

                                            {/* Message - Full text visible */}
                                            <p className="text-dark-300 text-sm leading-relaxed mb-2">
                                                {notification.messageAr || notification.message}
                                            </p>

                                            {/* Footer: Time and Delete */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-dark-500 text-xs">
                                                    {formatDate(notification.createdAt)}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                    className="text-dark-500 hover:text-red-400 p-1 -m-1 transition-colors"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
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
