'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ShieldExclamationIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    ArrowLeftIcon,
    LanguageIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

interface RiskAlert {
    id: string;
    userId: string;
    transactionId: string | null;
    alertType: string;
    riskScore: number;
    reason: string;
    reasonAr: string;
    status: string;
    amount: number | null;
    currency?: string;
    ipAddress: string | null;
    createdAt: string;
    user: {
        fullName: string;
        phone: string;
        userType: string;
    };
}

interface HeldTransaction {
    id: string;
    transactionId: string;
    reason: string;
    reasonAr: string;
    holdAmount: number;
    currency?: string;
    status: string;
    createdAt: string;
    transaction: {
        referenceNumber: string;
        type: string;
        amount: number;
        currency?: string;
        sender: { fullName: string; phone: string } | null;
        receiver: { fullName: string; phone: string } | null;
    };
}

export default function RiskManagementPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const [activeTab, setActiveTab] = useState<'alerts' | 'held'>('alerts');
    const [alerts, setAlerts] = useState<RiskAlert[]>([]);
    const [heldTransactions, setHeldTransactions] = useState<HeldTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'alerts') {
                const res = await fetch('/api/admin/risk-alerts');
                const data = await res.json();
                setAlerts(data.alerts || []);
            } else {
                const res = await fetch('/api/admin/held-transactions');
                const data = await res.json();
                setHeldTransactions(data.heldTransactions || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setLoading(false);
    };

    const resolveAlert = async (alertId: string, resolution: string) => {
        setProcessing(alertId);
        try {
            await fetch('/api/admin/risk-alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alertId, resolution }),
            });
            fetchData();
        } catch (error) {
            console.error('Error resolving alert:', error);
        }
        setProcessing(null);
    };

    const handleHeldTransaction = async (heldId: string, action: string) => {
        setProcessing(heldId);
        try {
            await fetch('/api/admin/held-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ heldId, action }),
            });
            fetchData();
        } catch (error) {
            console.error('Error handling transaction:', error);
        }
        setProcessing(null);
    };

    const getAlertTypeColor = (type: string) => {
        switch (type) {
            case 'HIGH_AMOUNT': return 'text-red-500 bg-red-500/10';
            case 'RAPID_TRANSACTIONS': return 'text-orange-500 bg-orange-500/10';
            case 'DEVICE_CHANGE': return 'text-yellow-500 bg-yellow-500/10';
            case 'SUSPICIOUS_IP': return 'text-purple-500 bg-purple-500/10';
            case 'LIMIT_EXCEEDED': return 'text-red-600 bg-red-600/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

    const getAlertTypeLabel = (type: string) => {
        return t(`admin.riskManagement.alertTypes.${type}`) || type;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="btn-ghost btn-icon">
                        <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{t('admin.riskManagement.title')}</h1>
                        <p className="text-dark-400 mt-1">{t('admin.riskManagement.subtitle')}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="btn-ghost btn-sm flex items-center gap-2"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                        {t('admin.riskManagement.refresh')}
                    </button>
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
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setActiveTab('alerts')}
                    className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'alerts'
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <ShieldExclamationIcon className="w-5 h-5" />
                        {t('admin.riskManagement.tabs.alerts')}
                        {alerts.length > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {alerts.length}
                            </span>
                        )}
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('held')}
                    className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'held'
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-5 h-5" />
                        {t('admin.riskManagement.tabs.held')}
                        {heldTransactions.length > 0 && (
                            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {heldTransactions.length}
                            </span>
                        )}
                    </div>
                </button>
            </div>

            {/* Content */}
            {(!mounted || loading) ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-dark-400 mt-4">جاري التحميل...</p>
                </div>
            ) : activeTab === 'alerts' ? (
                <div className="space-y-4">
                    {alerts.length === 0 ? (
                        <div className="card p-12 text-center">
                            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">{t('admin.riskManagement.emptyAlerts')}</h3>
                            <p className="text-dark-400">{t('admin.riskManagement.emptyAlertsDesc')}</p>
                        </div>
                    ) : (
                        alerts.map((alert) => (
                            <div key={alert.id} className="card p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getAlertTypeColor(alert.alertType)}`}>
                                                {getAlertTypeLabel(alert.alertType)}
                                            </span>
                                            <span className="text-dark-500 text-sm">
                                                {t('admin.riskManagement.riskScore')}: {alert.riskScore.toFixed(0)}%
                                            </span>
                                        </div>
                                        <p className="text-white font-medium mb-1">{currentLocale === 'ar' ? alert.reasonAr || alert.reason : alert.reason}</p>
                                        <div className="flex items-center gap-4 text-sm text-dark-400">
                                            <span>المستخدم: {alert.user?.fullName}</span>
                                            <span>الهاتف: {alert.user?.phone}</span>
                                            {alert.amount && <span>المبلغ: {alert.amount.toLocaleString()} {alert.currency === 'SYP' ? 'ل.س' : '$'}</span>}
                                        </div>
                                        <p className="text-dark-500 text-xs mt-2">
                                            {new Date(alert.createdAt).toLocaleString('ar-SA')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => resolveAlert(alert.id, 'APPROVED')}
                                            disabled={processing === alert.id}
                                            className="btn-sm bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                        >
                                            <CheckCircleIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => resolveAlert(alert.id, 'BLOCKED')}
                                            disabled={processing === alert.id}
                                            className="btn-sm bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                        >
                                            <XCircleIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => resolveAlert(alert.id, 'DISMISSED')}
                                            disabled={processing === alert.id}
                                            className="btn-sm bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
                                        >
                                            <ExclamationTriangleIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {heldTransactions.length === 0 ? (
                        <div className="card p-12 text-center">
                            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">{t('admin.riskManagement.emptyHeld')}</h3>
                            <p className="text-dark-400">{t('admin.riskManagement.emptyHeldDesc')}</p>
                        </div>
                    ) : (
                        heldTransactions.map((held) => (
                            <div key={held.id} className="card p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-orange-500 font-semibold">
                                                {held.holdAmount.toLocaleString()} {held.transaction?.currency === 'SYP' ? 'ل.س' : '$'}
                                            </span>
                                            <span className="text-dark-500 text-sm">
                                                {held.transaction?.referenceNumber}
                                            </span>
                                        </div>
                                        <p className="text-white font-medium mb-1">{currentLocale === 'ar' ? held.reasonAr || held.reason : held.reason}</p>
                                        <div className="flex items-center gap-4 text-sm text-dark-400">
                                            <span>من: {held.transaction?.sender?.fullName || 'غير معروف'}</span>
                                            <span>إلى: {held.transaction?.receiver?.fullName || 'غير معروف'}</span>
                                        </div>
                                        <p className="text-dark-500 text-xs mt-2">
                                            {new Date(held.createdAt).toLocaleString('ar-SA')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleHeldTransaction(held.id, 'RELEASE')}
                                            disabled={processing === held.id}
                                            className="btn-sm bg-green-500 text-white hover:bg-green-600"
                                        >
                                            {t('admin.riskManagement.actions.release')}
                                        </button>
                                        <button
                                            onClick={() => handleHeldTransaction(held.id, 'CANCEL')}
                                            disabled={processing === held.id}
                                            className="btn-sm bg-red-500 text-white hover:bg-red-600"
                                        >
                                            {t('admin.riskManagement.actions.cancel')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
