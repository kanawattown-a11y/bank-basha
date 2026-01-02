'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    LanguageIcon,
} from '@heroicons/react/24/outline';

interface Settlement {
    id: string;
    settlementNumber: string;
    agentCode: string;
    businessName: string;
    cashCollected: number;
    cashCollectedSYP?: number;
    amountDue: number;
    amountDueSYP?: number;
    currency?: string;
    status: string;
    createdAt: string;
}

export default function AdminSettlementsPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING');

    useEffect(() => {
        fetchSettlements();
    }, []);

    const fetchSettlements = async () => {
        try {
            const response = await fetch('/api/admin/settlements/all');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const data = await response.json();
            setSettlements(data.settlements || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (settlementId: string, action: 'approve' | 'reject') => {
        try {
            await fetch('/api/admin/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settlementId, action }),
            });
            fetchSettlements();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="badge-warning">{t('admin.settlements.status.pending')}</span>;
            case 'COMPLETED':
                return <span className="badge-success">{t('admin.settlements.status.completed')}</span>;
            case 'REJECTED':
                return <span className="badge-error">{t('admin.settlements.status.rejected')}</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    const filteredSettlements = settlements.filter(s => filter === 'all' || s.status === filter);

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-base sm:text-lg font-semibold text-white">{t('admin.settlements.title')}</h1>
                    </div>
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
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-4xl mx-auto">

                    {/* Filter */}
                    <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
                        {[
                            { value: 'PENDING', label: t('admin.settlements.filters.pending') },
                            { value: 'COMPLETED', label: t('admin.settlements.filters.completed') },
                            { value: 'REJECTED', label: t('admin.settlements.filters.rejected') },
                            { value: 'all', label: t('admin.settlements.filters.all') },
                        ].map((item) => (
                            <button
                                key={item.value}
                                onClick={() => setFilter(item.value)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === item.value
                                    ? 'bg-primary-500 text-dark-900'
                                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Settlements List */}
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner w-10 h-10"></div>
                        </div>
                    ) : filteredSettlements.length === 0 ? (
                        <div className="card p-12 text-center">
                            <ClockIcon className="w-16 h-16 text-dark-500 mx-auto mb-4" />
                            <p className="text-xl font-semibold text-dark-300">{t('admin.settlements.empty')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredSettlements.map((settlement) => (
                                <div key={settlement.id} className="card p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="text-white font-medium">{settlement.businessName}</p>
                                            <p className="text-dark-400 text-sm">{settlement.agentCode}</p>
                                        </div>
                                        {getStatusBadge(settlement.status)}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                                        <div>
                                            <p className="text-dark-400">{t('admin.settlements.labels.cashCollected')}</p>
                                            <p className="text-white font-medium">{formatAmount(settlement.cashCollected)} $</p>
                                            {settlement.cashCollectedSYP !== undefined && settlement.cashCollectedSYP > 0 && (
                                                <p className="text-blue-400 text-xs">{formatAmount(settlement.cashCollectedSYP)} ل.س</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-dark-400">{t('admin.settlements.labels.amountDue')}</p>
                                            <p className="text-green-500 font-medium">{formatAmount(settlement.amountDue)} $</p>
                                            {settlement.amountDueSYP !== undefined && settlement.amountDueSYP > 0 && (
                                                <p className="text-blue-400 text-xs">{formatAmount(settlement.amountDueSYP)} ل.س</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-dark-700">
                                        <p className="text-dark-500 text-xs">{formatDate(settlement.createdAt)}</p>
                                        {settlement.status === 'PENDING' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAction(settlement.id, 'approve')}
                                                    className="btn-icon bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                                >
                                                    <CheckCircleIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(settlement.id, 'reject')}
                                                    className="btn-icon bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                                >
                                                    <XCircleIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
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
