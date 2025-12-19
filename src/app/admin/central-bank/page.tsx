'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    BanknotesIcon,
    ArrowLeftIcon,
    BuildingLibraryIcon,
    UserGroupIcon,
    CurrencyDollarIcon,
    LanguageIcon,
} from '@heroicons/react/24/outline';
import { useTranslations, useLocale } from 'next-intl';

interface CentralBankData {
    centralBank: {
        balance: number;
        name: string;
    };
    summary: {
        totalUserBalances: number;
        totalAgentCredit: number;
        totalAgentCash: number;
        systemBalance: number;
    };
    recentCreditGrants: Array<{
        id: string;
        amount: number;
        receiver: string;
        date: string;
        reference: string;
    }>;
}

export default function CentralBankPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const [data, setData] = useState<CentralBankData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch('/api/admin/central-bank');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed to fetch');
            }
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900">
            <header className="glass-morphism sticky top-0 z-50 border-b border-dark-700">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-dark-400 hover:text-white">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </Link>
                        <BuildingLibraryIcon className="w-8 h-8 text-primary-500" />
                        <h1 className="text-xl font-bold text-white">{t('admin.centralBank.title')}</h1>
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

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                {/* Central Bank Balance */}
                <div className="card p-8 text-center border-2 border-primary-500/30">
                    <BuildingLibraryIcon className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                    <h2 className="text-dark-400 text-lg mb-2">{t('admin.centralBank.balance')}</h2>
                    <p className={`text-4xl font-bold ${(data?.centralBank.balance || 0) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        ${formatAmount(data?.centralBank.balance || 0)}
                    </p>
                    <p className="text-dark-500 text-sm mt-2">
                        {(data?.centralBank.balance || 0) < 0
                            ? t('admin.centralBank.negativeHint')
                            : t('admin.centralBank.positiveHint')}
                    </p>
                </div>

                {/* System Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="stat-card">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 mx-auto mb-3">
                            <UserGroupIcon className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="stat-value text-blue-500">
                            ${formatAmount(data?.summary.totalUserBalances || 0)}
                        </div>
                        <div className="stat-label">{t('admin.centralBank.userBalance')}</div>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10 mx-auto mb-3">
                            <BanknotesIcon className="w-6 h-6 text-green-500" />
                        </div>
                        <div className="stat-value text-green-500">
                            ${formatAmount(data?.summary.totalAgentCredit || 0)}
                        </div>
                        <div className="stat-label">{t('admin.centralBank.agentCredit')}</div>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-500/10 mx-auto mb-3">
                            <CurrencyDollarIcon className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div className="stat-value text-yellow-500">
                            ${formatAmount(data?.summary.totalAgentCash || 0)}
                        </div>
                        <div className="stat-label">{t('admin.centralBank.agentCash')}</div>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 mx-auto mb-3">
                            <BuildingLibraryIcon className="w-6 h-6 text-purple-500" />
                        </div>
                        <div className={`stat-value ${(data?.summary.systemBalance || 0) === 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${formatAmount(data?.summary.systemBalance || 0)}
                        </div>
                        <div className="stat-label">{t('admin.centralBank.systemBalance')}</div>
                    </div>
                </div>

                {/* Balance Explanation */}
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-white mb-4">📊 {t('admin.centralBank.equationTitle')}</h3>
                    <div className="bg-dark-800 p-4 rounded-xl font-mono text-sm">
                        <p className="text-dark-400 mb-2">{t('admin.centralBank.equation')}</p>
                        <p className="text-white">
                            ${formatAmount(data?.centralBank.balance || 0)} + ${formatAmount(data?.summary.totalUserBalances || 0)} =
                            <span className={data?.summary.systemBalance === 0 ? 'text-green-500' : 'text-red-500'}>
                                {' '}${formatAmount(data?.summary.systemBalance || 0)}
                            </span>
                        </p>
                    </div>
                    <p className="text-dark-500 text-sm mt-3">
                        {t('admin.centralBank.balanced')}
                    </p>
                </div>

                {/* Recent Credit Grants */}
                <div className="card">
                    <div className="p-4 border-b border-dark-700">
                        <h3 className="text-lg font-bold text-white">{t('admin.centralBank.recentGrants')}</h3>
                    </div>
                    <div className="divide-y divide-dark-700">
                        {data?.recentCreditGrants && data.recentCreditGrants.length > 0 ? (
                            data.recentCreditGrants.map((grant) => (
                                <div key={grant.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-medium">{grant.receiver}</p>
                                        <p className="text-dark-500 text-sm">{grant.reference}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-green-500 font-bold">${formatAmount(grant.amount)}</p>
                                        <p className="text-dark-500 text-sm">{formatDate(grant.date)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-dark-500">
                                {t('admin.centralBank.noGrants')}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
