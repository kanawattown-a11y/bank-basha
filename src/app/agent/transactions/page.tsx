'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    ArrowDownIcon,
    ArrowUpIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

import TransactionDetailsModal from '@/components/TransactionDetailsModal';
import { Currency } from '@/components/CurrencySelector';

interface Transaction {
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    currency: Currency;
    fee: number;
    agentFee?: number;
    platformFee?: number;
    description?: string;
    status: string;
    customerName: string;
    senderName?: string;
    receiverName?: string;
    createdAt: string;
}

export default function AgentTransactionsPage() {
    const t = useTranslations();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const response = await fetch('/api/agents/transactions');
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

    const formatAmount = (amount: number, currency?: string) => {
        const decimals = currency === 'SYP' ? 0 : 2;
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    const filteredTransactions = filter === 'all'
        ? transactions
        : transactions.filter(tx => tx.type === filter);

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/agent" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-lg font-semibold text-white">{t('agent.transactions.title')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Filter */}
                    <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
                        {[
                            { value: 'all', label: t('common.all') },
                            { value: 'DEPOSIT', label: t('transaction.types.deposit') },
                            { value: 'WITHDRAW', label: t('transaction.types.withdraw') },
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
                            <p className="text-xl font-semibold text-dark-300">{t('common.noData')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTransactions.map((tx) => (
                                <button
                                    key={tx.id}
                                    onClick={() => {
                                        setSelectedTransaction(tx);
                                        setIsModalOpen(true);
                                    }}
                                    className="w-full text-start card p-4 hover:border-primary-500/30 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-green-500/10' : 'bg-red-500/10'
                                            }`}>
                                            {tx.type === 'DEPOSIT' ? (
                                                <ArrowDownIcon className="w-6 h-6 text-green-500" />
                                            ) : (
                                                <ArrowUpIcon className="w-6 h-6 text-red-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium">{tx.customerName || t('common.name')}</p>
                                            <p className="text-dark-400 text-sm">{formatDate(tx.createdAt)}</p>
                                        </div>
                                        <div className="text-end">
                                            <p className={`font-semibold ${tx.type === 'DEPOSIT' ? 'text-green-500' : 'text-red-500'
                                                }`}>
                                                {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(tx.amount)}
                                            </p>
                                            <p className="text-dark-500 text-xs">{tx.referenceNumber}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <TransactionDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                transaction={selectedTransaction}
                userType="AGENT"
            />
        </div>
    );
}
