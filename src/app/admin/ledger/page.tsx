'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeftIcon,
    ChartBarIcon,
    DocumentTextIcon,
    LanguageIcon,
} from '@heroicons/react/24/outline';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface LedgerEntry {
    id: string;
    entryNumber: string;
    description: string;
    totalDebit: number;
    totalCredit: number;
    createdAt: string;
    sender: {
        fullName: string;
        userType: string;
    } | null;
    receiver: {
        fullName: string;
        userType: string;
    } | null;
    type: string;
    status: string;
    fee: number;
    platformFee: number;
    agentFee: number;
}

export default function AdminLedgerPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchLedger();
    }, []);

    const fetchLedger = async () => {
        try {
            const response = await fetch('/api/admin/ledger');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const data = await response.json();
            setEntries(data.entries || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
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

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-base sm:text-lg font-semibold text-white">{t('admin.ledger.title')}</h1>
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
                <div className="max-w-6xl mx-auto">

                    <div className="card p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <ChartBarIcon className="w-8 h-8 text-primary-500" />
                            <div>
                                <h2 className="text-xl font-semibold text-white">{t('admin.ledger.title')}</h2>
                                <p className="text-dark-400 text-sm">{t('admin.ledger.subtitle')}</p>
                            </div>
                        </div>
                        <p className="text-dark-300">
                            {t('admin.ledger.description')}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner w-10 h-10"></div>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="card p-12 text-center">
                            <DocumentTextIcon className="w-16 h-16 text-dark-500 mx-auto mb-4" />
                            <p className="text-xl font-semibold text-dark-300">{t('admin.ledger.empty')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {entries.map((entry) => (
                                <Link
                                    key={entry.id}
                                    href={`/admin/transactions/${entry.id}`}
                                    className="card p-5 block hover:border-primary-500/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="text-white font-semibold">{t('admin.ledger.entryNumber')} {entry.entryNumber}</p>
                                                <span className={`badge ${entry.status === 'COMPLETED' ? 'badge-success' : entry.status === 'PENDING' ? 'badge-warning' : 'badge-error'}`}>
                                                    {entry.status === 'COMPLETED' ? t('admin.ledger.status.completed') : entry.status === 'PENDING' ? t('admin.ledger.status.pending') : t('admin.ledger.status.failed')}
                                                </span>
                                            </div>
                                            <p className="text-dark-400 text-sm">{entry.description}</p>
                                        </div>
                                        <p className="text-dark-500 text-xs">{formatDate(entry.createdAt)}</p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 mb-3">
                                        {entry.sender && (
                                            <div>
                                                <p className="text-dark-400 text-xs mb-1">{t('admin.ledger.from')}</p>
                                                <p className="text-white text-sm">{entry.sender.fullName}</p>
                                            </div>
                                        )}
                                        {entry.receiver && (
                                            <div>
                                                <p className="text-dark-400 text-xs mb-1">{t('admin.ledger.to')}</p>
                                                <p className="text-white text-sm">{entry.receiver.fullName}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-dark-800">
                                        <div>
                                            <p className="text-dark-400 text-xs mb-1">{t('admin.ledger.amount')}</p>
                                            <p className="text-white font-medium">${formatAmount(entry.totalDebit)}</p>
                                        </div>
                                        {entry.fee > 0 && (
                                            <div>
                                                <p className="text-dark-400 text-xs mb-1">{t('admin.ledger.fee')}</p>
                                                <p className="text-red-500 font-medium">${formatAmount(entry.fee)}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-dark-400 text-xs mb-1">{t('admin.ledger.net')}</p>
                                            <p className="text-green-500 font-medium">${formatAmount(entry.totalCredit)}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
