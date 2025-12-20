'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    BanknotesIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    UserIcon,
    BuildingStorefrontIcon,
    UserGroupIcon,
    CurrencyDollarIcon,
    ArchiveBoxIcon,
    ClockIcon,
    ArrowLeftIcon,
    LanguageIcon,
} from '@heroicons/react/24/outline';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface InternalAccount {
    id: string;
    code: string;
    name: string;
    nameAr: string | null;
    type: string;
    balance: number;
    frozenBalance: number;
    description: string | null;
    isActive: boolean;
}

interface Summary {
    systemReserve: number;
    otherTotal: number;
    difference: number;
    isBalanced: boolean;
}

export default function InternalAccountsPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const [accounts, setAccounts] = useState<InternalAccount[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/internal-accounts');
            const data = await res.json();
            setAccounts(data.accounts || []);
            setSummary(data.summary || null);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
        setLoading(false);
    };

    const syncAccounts = async () => {
        setSyncing(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/internal-accounts', {
                method: 'POST',
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: t('admin.internalAccounts.syncSuccess') });
                fetchAccounts();
            } else {
                setMessage({ type: 'error', text: t('admin.internalAccounts.syncFailed') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'حدث خطأ' });
        }
        setSyncing(false);
    };

    const getAccountIcon = (type: string) => {
        switch (type) {
            case 'SYSTEM_RESERVE':
                return <BanknotesIcon className="w-6 h-6" />;
            case 'USERS_LEDGER':
                return <UserIcon className="w-6 h-6" />;
            case 'MERCHANTS_LEDGER':
                return <BuildingStorefrontIcon className="w-6 h-6" />;
            case 'AGENTS_LEDGER':
                return <UserGroupIcon className="w-6 h-6" />;
            case 'SETTLEMENTS':
                return <ClockIcon className="w-6 h-6" />;
            case 'FEES':
                return <CurrencyDollarIcon className="w-6 h-6" />;
            case 'SUSPENSE':
                return <ArchiveBoxIcon className="w-6 h-6" />;
            default:
                return <BanknotesIcon className="w-6 h-6" />;
        }
    };

    const getAccountColor = (type: string) => {
        switch (type) {
            case 'SYSTEM_RESERVE':
                return 'text-blue-500 bg-blue-500/10';
            case 'USERS_LEDGER':
                return 'text-green-500 bg-green-500/10';
            case 'MERCHANTS_LEDGER':
                return 'text-purple-500 bg-purple-500/10';
            case 'AGENTS_LEDGER':
                return 'text-orange-500 bg-orange-500/10';
            case 'SETTLEMENTS':
                return 'text-yellow-500 bg-yellow-500/10';
            case 'FEES':
                return 'text-cyan-500 bg-cyan-500/10';
            case 'SUSPENSE':
                return 'text-red-500 bg-red-500/10';
            default:
                return 'text-gray-500 bg-gray-500/10';
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    if (!mounted || loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]" suppressHydrationWarning>
                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="btn-ghost btn-icon">
                        <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{t('admin.internalAccounts.title')}</h1>
                        <p className="text-dark-400 mt-1">{t('admin.internalAccounts.subtitle')}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchAccounts}
                        className="btn-ghost btn-sm flex items-center gap-2"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                        {t('common.refresh')}
                    </button>
                    <button
                        onClick={syncAccounts}
                        disabled={syncing}
                        className="btn-primary btn-sm flex items-center gap-2"
                    >
                        {syncing ? (
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                            <ArrowPathIcon className="w-5 h-5" />
                        )}
                        {t('admin.internalAccounts.sync')}
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

            {message && (
                <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {message.text}
                </div>
            )}

            {/* Balance Status */}
            {summary && (
                <div className={`card p-6 mb-8 border-2 ${summary.isBalanced ? 'border-green-500/30' : 'border-red-500/30'}`}>
                    <div className="flex items-center gap-4">
                        {summary.isBalanced ? (
                            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                <CheckCircleIcon className="w-8 h-8 text-green-500" />
                            </div>
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
                            </div>
                        )}
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold text-white mb-1">
                                {summary.isBalanced ? t('admin.internalAccounts.balanced') : t('admin.internalAccounts.unbalanced')}
                            </h3>
                            <p className="text-dark-400">
                                {t('admin.internalAccounts.systemReserve')}: {formatAmount(summary.systemReserve)} |
                                {t('admin.internalAccounts.otherTotal')}: {formatAmount(summary.otherTotal)} |
                                {t('admin.internalAccounts.difference')}: {formatAmount(summary.difference)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Accounts Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map((account) => (
                    <div key={account.id} className="card p-6 hover:border-primary-500/30 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getAccountColor(account.type)}`}>
                                {getAccountIcon(account.type)}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base sm:text-lg font-semibold text-white">{account.nameAr || account.name}</h3>
                                <p className="text-xs text-dark-500 mb-3">{account.code}</p>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-dark-400 text-sm">{t('admin.internalAccounts.balance')}:</span>
                                        <span className={`font-bold ${account.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {formatAmount(account.balance)}
                                        </span>
                                    </div>
                                    {account.frozenBalance > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-dark-400 text-sm">{t('admin.internalAccounts.frozen')}:</span>
                                            <span className="text-orange-500 font-medium">
                                                {formatAmount(account.frozenBalance)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {account.description && (
                                    <p className="text-dark-500 text-xs mt-3 pt-3 border-t border-dark-800">
                                        {account.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Explanation */}
            <div className="card p-6 mt-8">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">{t('admin.internalAccounts.explanation.title')}</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <BanknotesIcon className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-white font-medium">{t('admin.internalAccounts.systemReserve')}</p>
                            <p className="text-dark-400">{t('admin.internalAccounts.explanation.systemReserve')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                            <p className="text-white font-medium">{t('admin.internalAccounts.explanation.usersLedger')}</p>
                            <p className="text-dark-400">{t('admin.internalAccounts.explanation.usersLedger')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <BuildingStorefrontIcon className="w-4 h-4 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-white font-medium">{t('admin.internalAccounts.explanation.merchantsLedger')}</p>
                            <p className="text-dark-400">{t('admin.internalAccounts.explanation.merchantsLedger')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                            <UserGroupIcon className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-white font-medium">{t('admin.internalAccounts.explanation.agentsLedger')}</p>
                            <p className="text-dark-400">{t('admin.internalAccounts.explanation.agentsLedger')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                            <ClockIcon className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-white font-medium">{t('admin.internalAccounts.explanation.settlements')}</p>
                            <p className="text-dark-400">{t('admin.internalAccounts.explanation.settlements')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                            <CurrencyDollarIcon className="w-4 h-4 text-cyan-500" />
                        </div>
                        <div>
                            <p className="text-white font-medium">{t('admin.internalAccounts.explanation.commissions')}</p>
                            <p className="text-dark-400">{t('admin.internalAccounts.explanation.commissions')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
