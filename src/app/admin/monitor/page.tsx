'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    BanknotesIcon,
    ArrowsRightLeftIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    ChartBarIcon,
    LanguageIcon,
} from '@heroicons/react/24/outline';
import { useTranslations, useLocale } from 'next-intl';

interface Transaction {
    id: string;
    type: string;
    amount: number;
    status: string;
    referenceNumber: string;
    createdAt: string;
    senderName: string;
    receiverName: string;
}

interface ActiveUser {
    id: string;
    name: string;
    phone: string;
    type: string;
    hasMerchantAccount?: boolean;
    lastActive: string;
}

interface Stats {
    totalToday: number;
    totalAmount: number;
    pendingCount: number;
    alertCount: number;
    activeUsersCount: number;
}

export default function AdminMonitorPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [stats, setStats] = useState<Stats>({ totalToday: 0, totalAmount: 0, pendingCount: 0, alertCount: 0, activeUsersCount: 0 });
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/monitor');
            if (res.ok) {
                const data = await res.json();
                // Map transactions from API
                setTransactions(data.transactions || []);
                // Set active users
                setActiveUsers(data.activeUsers || []);
                // Map stats from API to our format
                setStats({
                    totalToday: data.stats?.totalTransactions || 0,
                    totalAmount: data.stats?.totalVolume || 0,
                    pendingCount: data.transactions?.filter((t: Transaction) => t.status === 'PENDING').length || 0,
                    alertCount: 0,
                    activeUsersCount: data.stats?.activeUsersCount || data.activeUsers?.length || 0,
                });
            } else if (res.status === 401 || res.status === 403) {
                router.push('/login');
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    }, [router]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            fetchData();
        }
    }, [mounted, fetchData]);

    useEffect(() => {
        if (!mounted || !autoRefresh) return;
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [mounted, autoRefresh, fetchData]);

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <span className="badge bg-green-500/20 text-green-400">{t('admin.settlements.status.completed')}</span>;
            case 'PENDING': return <span className="badge bg-yellow-500/20 text-yellow-400">{t('admin.settlements.status.pending')}</span>;
            case 'FAILED': return <span className="badge bg-red-500/20 text-red-400">{t('admin.settlements.status.rejected')}</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'DEPOSIT': return '📥';
            case 'WITHDRAWAL': return '📤';
            case 'TRANSFER': return '💸';
            case 'PAYMENT': return '💳';
            default: return '📄';
        }
    };

    // Prevent hydration mismatch
    if (!mounted) {
        return null;
    }

    if (loading) {
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
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </Link>
                        <h1 className="text-xl font-bold text-white">📊 {t('admin.monitor.title')}</h1>
                        <span className={`w-3 h-3 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-dark-500'}`}></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                const newLocale = currentLocale === 'ar' ? 'en' : 'ar';
                                document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
                                router.refresh();
                            }}
                            className="btn-ghost btn-icon"
                        >
                            <LanguageIcon className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`btn-ghost text-sm ${autoRefresh ? 'text-green-400' : 'text-dark-400'}`}
                        >
                            {autoRefresh ? `🟢 ${t('admin.monitor.autoRefresh')}` : `⚪ ${t('admin.monitor.stopped')}`}
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="card p-4">
                            <div className="flex items-center gap-3">
                                <ChartBarIcon className="w-8 h-8 text-primary-500" />
                                <div>
                                    <p className="text-dark-400 text-xs">{t('admin.monitor.stats.today')}</p>
                                    <p className="text-white text-xl font-bold">{stats.totalToday}</p>
                                </div>
                            </div>
                        </div>
                        <div className="card p-4">
                            <div className="flex items-center gap-3">
                                <BanknotesIcon className="w-8 h-8 text-green-500" />
                                <div>
                                    <p className="text-dark-400 text-xs">{t('admin.monitor.stats.totalVolume')}</p>
                                    <p className="text-white text-xl font-bold">${formatAmount(stats.totalAmount)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="card p-4">
                            <div className="flex items-center gap-3">
                                <ClockIcon className="w-8 h-8 text-yellow-500" />
                                <div>
                                    <p className="text-dark-400 text-xs">{t('admin.monitor.stats.pending')}</p>
                                    <p className="text-white text-xl font-bold">{stats.pendingCount}</p>
                                </div>
                            </div>
                        </div>
                        <div className="card p-4">
                            <div className="flex items-center gap-3">
                                <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                                <div>
                                    <p className="text-dark-400 text-xs">{t('admin.monitor.stats.alerts')}</p>
                                    <p className="text-white text-xl font-bold">{stats.alertCount}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Live Transactions */}
                    <div className="card p-6">
                        <h2 className="text-white font-semibold mb-4">🔴 {t('admin.monitor.liveTransactions')}</h2>

                        {transactions.length === 0 ? (
                            <div className="text-center py-8 text-dark-400">
                                <ArrowsRightLeftIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>{t('admin.monitor.noRecentTransactions')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {transactions.map((tx) => (
                                    <Link
                                        key={tx.id}
                                        href={`/admin/transactions/${tx.id}`}
                                        className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl hover:bg-dark-700/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{getTypeIcon(tx.type)}</span>
                                            <div>
                                                <p className="text-white text-sm font-medium">
                                                    {tx.senderName} → {tx.receiverName}
                                                </p>
                                                <p className="text-dark-400 text-xs">{tx.referenceNumber}</p>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white font-bold">${formatAmount(tx.amount)}</p>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(tx.status)}
                                                <span className="text-dark-500 text-xs">{formatTime(tx.createdAt)}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Live Active Users */}
                    <div className="card p-6 mt-6">
                        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                            🟢 {t('admin.monitor.activeUsers')}
                            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                                {stats.activeUsersCount || 0} {t('admin.monitor.online')}
                            </span>
                        </h2>

                        {activeUsers.length === 0 ? (
                            <div className="text-center py-8 text-dark-400">
                                <p>{t('admin.monitor.noActiveUsers')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {activeUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <span className="text-lg">
                                                {user.type === 'AGENT' ? '🏪' : user.hasMerchantAccount ? '🏬' : '👤'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{user.name}</p>
                                            <p className="text-dark-400 text-xs">{user.phone}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs px-2 py-0.5 rounded ${user.type === 'AGENT' ? 'bg-blue-500/20 text-blue-400' :
                                                user.hasMerchantAccount ? 'bg-purple-500/20 text-purple-400' :
                                                    'bg-dark-600 text-dark-300'
                                                }`}>
                                                {user.type === 'AGENT' ? t('admin.monitor.userTypes.agent') : user.hasMerchantAccount ? t('admin.monitor.userTypes.business') : t('admin.monitor.userTypes.user')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
