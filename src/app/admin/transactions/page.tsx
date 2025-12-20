'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    ArrowDownIcon,
    ArrowUpIcon,
    ArrowsRightLeftIcon,
    QrCodeIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';

interface Transaction {
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    status: string;
    senderName: string;
    receiverName: string;
    createdAt: string;
}

export default function AdminTransactionsPage() {
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
            const response = await fetch('/api/admin/transactions');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const data = await response.json();
            setTransactions(data.transactions || []);
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
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'DEPOSIT':
                return { Icon: ArrowDownIcon, color: 'text-green-500', bg: 'bg-green-500/10' };
            case 'WITHDRAW':
                return { Icon: ArrowUpIcon, color: 'text-red-500', bg: 'bg-red-500/10' };
            case 'TRANSFER':
                return { Icon: ArrowsRightLeftIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' };
            case 'QR_PAYMENT':
                return { Icon: QrCodeIcon, color: 'text-purple-500', bg: 'bg-purple-500/10' };
            default:
                return { Icon: ArrowsRightLeftIcon, color: 'text-gray-500', bg: 'bg-gray-500/10' };
        }
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            DEPOSIT: t('transaction.types.deposit'),
            WITHDRAW: t('transaction.types.withdraw'),
            TRANSFER: t('transaction.types.transfer'),
            QR_PAYMENT: t('transaction.types.qrPayment'),
        };
        return labels[type] || type;
    };

    const filteredTransactions = filter === 'all'
        ? transactions
        : transactions.filter(tx => tx.type === filter);

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-base sm:text-lg font-semibold text-white">{t('admin.transactions.title')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-4xl mx-auto">

                    {/* Filter */}
                    <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
                        {[
                            { value: 'all', label: t('common.all') },
                            { value: 'DEPOSIT', label: t('transaction.types.deposit') },
                            { value: 'WITHDRAW', label: t('transaction.types.withdraw') },
                            { value: 'TRANSFER', label: t('transaction.types.transfer') },
                            { value: 'QR_PAYMENT', label: t('transaction.types.payment') },
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

                    {/* Transactions */}
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner w-10 h-10"></div>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="card p-12 text-center">
                            <p className="text-xl font-semibold text-dark-300">{t('admin.transactions.noTransactions')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTransactions.map((tx) => {
                                const { Icon, color, bg } = getTypeIcon(tx.type);
                                return (
                                    <div key={tx.id} className="card p-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bg}`}>
                                                <Icon className={`w-6 h-6 ${color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium">{getTypeLabel(tx.type)}</p>
                                                <p className="text-dark-400 text-sm truncate">
                                                    {tx.senderName} → {tx.receiverName}
                                                </p>
                                            </div>
                                            <div className="text-end">
                                                <p className="text-white font-semibold">{formatAmount(tx.amount)} $</p>
                                                <p className="text-dark-500 text-xs">{formatDate(tx.createdAt)}</p>
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
