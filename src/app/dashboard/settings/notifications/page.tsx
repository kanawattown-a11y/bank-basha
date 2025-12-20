'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeftIcon,
    BellIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

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
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
        setLoading(false);
    };

    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
            setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'SYSTEM':
                return { icon: BellIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' };
            case 'TRANSACTION':
                return { icon: CheckCircleIcon, color: 'text-green-500', bg: 'bg-green-500/10' };
            case 'ADMIN_ALERT':
                return { icon: XCircleIcon, color: 'text-red-500', bg: 'bg-red-500/10' };
            default:
                return { icon: BellIcon, color: 'text-gray-500', bg: 'bg-gray-500/10' };
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        return `منذ ${days} يوم`;
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href="/dashboard/settings" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-lg sm:text-xl font-bold text-white">الإشعارات</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-2xl mx-auto">
                    {notifications.length === 0 ? (
                        <div className="card p-12 text-center">
                            <BellIcon className="w-20 h-20 text-dark-600 mx-auto mb-4" />
                            <h3 className="text-white font-semibold mb-2">لا توجد إشعارات</h3>
                            <p className="text-dark-400 text-sm">ستظهر إشعاراتك هنا</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notif) => {
                                const { icon: Icon, color, bg } = getNotificationIcon(notif.type);
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => !notif.isRead && markAsRead(notif.id)}
                                        className={`card p-4 cursor-pointer transition-all ${!notif.isRead ? 'border-primary-500/30 bg-primary-500/5' : ''}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                                                <Icon className={`w-6 h-6 ${color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="text-white font-medium">{notif.titleAr || notif.title}</h4>
                                                    {!notif.isRead && (
                                                        <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2"></div>
                                                    )}
                                                </div>
                                                <p className="text-dark-400 text-sm mb-2">{notif.messageAr || notif.message}</p>
                                                <div className="flex items-center gap-2 text-dark-500 text-xs">
                                                    <ClockIcon className="w-3 h-3" />
                                                    <span>{formatDate(notif.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
