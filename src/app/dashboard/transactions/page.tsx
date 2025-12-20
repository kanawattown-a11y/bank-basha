'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';

interface Transaction {
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    fee: number;
    status: string;
    description: string;
    descriptionAr: string;
    createdAt: string;
    isOutgoing: boolean;
    counterparty: string;
}

export default function TransactionsPage() {
    const t = useTranslations();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const response = await fetch('/api/wallet');
            if (!response.ok) {
                if (response.status === 401) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const data = await response.json();
            setTransactions(data.recentTransactions || []);
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
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            case 'PENDING':
                return <ClockIcon className="w-5 h-5 text-yellow-500" />;
            case 'FAILED':
                return <XCircleIcon className="w-5 h-5 text-red-500" />;
            default:
                return <ClockIcon className="w-5 h-5 text-gray-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            DEPOSIT: 'إيداع',
            WITHDRAW: 'سحب',
            TRANSFER: 'تحويل',
            QR_PAYMENT: 'دفع QR',
        };
        return labels[type] || type;
    };

    const filteredTransactions = filter === 'all'
        ? transactions
        : transactions.filter(tx => tx.type === filter);

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href="/dashboard" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-lg font-semibold text-white">{t('nav.history')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Filter */}
                    <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
                        {[
                            { value: 'all', label: 'الكل' },
                            { value: 'DEPOSIT', label: 'إيداع' },
                            { value: 'WITHDRAW', label: 'سحب' },
                            { value: 'TRANSFER', label: 'تحويل' },
                            { value: 'QR_PAYMENT', label: 'دفع' },
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

                    {/* Transactions List */}
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner w-10 h-10"></div>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="card p-12 text-center">
                            <ClockIcon className="w-16 h-16 text-dark-500 mx-auto mb-4" />
                            <p className="text-xl font-semibold text-dark-300">لا توجد معاملات</p>
                            <p className="text-dark-500 mt-2">ستظهر معاملاتك هنا</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTransactions.map((tx) => (
                                <div key={tx.id} className="card p-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tx.isOutgoing ? 'bg-red-500/10' : 'bg-green-500/10'
                                            }`}>
                                            {getStatusIcon(tx.status)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium">
                                                {tx.descriptionAr || tx.description || getTypeLabel(tx.type)}
                                            </p>
                                            <p className="text-dark-400 text-sm">{formatDate(tx.createdAt)}</p>
                                        </div>
                                        <div className="text-end">
                                            <p className={`font-semibold ${tx.isOutgoing ? 'text-red-500' : 'text-green-500'}`}>
                                                {tx.isOutgoing ? '-' : '+'}{formatAmount(tx.amount)} $
                                            </p>
                                            <p className="text-dark-500 text-xs">{tx.referenceNumber}</p>
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
