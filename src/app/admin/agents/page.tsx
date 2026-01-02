'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    MagnifyingGlassIcon,
    BanknotesIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Agent {
    id: string;
    agentCode: string;
    businessName: string;
    phone: string;
    currentCredit: number;
    currentCreditSYP: number;
    cashCollected: number;
    cashCollectedSYP: number;
    totalDeposits: number;
    totalDepositsSYP: number;
    totalWithdrawals: number;
    totalWithdrawalsSYP: number;
    isActive: boolean;
}

export default function AdminAgentsPage() {
    const t = useTranslations();
    const router = useRouter();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currency, setCurrency] = useState<'USD' | 'SYP'>('USD');

    const fetchAgents = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/agents');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const data = await response.json();
            setAgents(data.agents || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const filteredAgents = agents.filter(agent =>
        agent.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.agentCode.includes(searchTerm) ||
        agent.phone.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-base sm:text-lg font-semibold text-white">{t('admin.agents.title')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-6xl mx-auto">

                    {/* Search */}
                    <div className="card p-4 mb-6">
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
                            <input
                                type="text"
                                className="input pr-10"
                                placeholder={t('admin.agents.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Currency Selector */}
                    <div className="card p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-dark-400">Currency:</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrency('USD')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${currency === 'USD'
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                        }`}
                                >
                                    💵 USD
                                </button>
                                <button
                                    onClick={() => setCurrency('SYP')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${currency === 'SYP'
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                        }`}
                                >
                                    🇸🇾 SYP
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Agents List */}
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner w-10 h-10"></div>
                        </div>
                    ) : filteredAgents.length === 0 ? (
                        <div className="card p-12 text-center">
                            <UserGroupIcon className="w-16 h-16 text-dark-500 mx-auto mb-4" />
                            <p className="text-xl font-semibold text-dark-300">{t('admin.agents.noAgents')}</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            {filteredAgents.map((agent) => {
                                const symbol = currency === 'SYP' ? 'ل.س' : '$';
                                const credit = currency === 'SYP' ? agent.currentCreditSYP : agent.currentCredit;
                                const cash = currency === 'SYP' ? agent.cashCollectedSYP : agent.cashCollected;
                                const deposits = currency === 'SYP' ? agent.totalDepositsSYP : agent.totalDeposits;
                                const withdrawals = currency === 'SYP' ? agent.totalWithdrawalsSYP : agent.totalWithdrawals;

                                return (
                                    <div
                                        key={agent.id}
                                        className="card p-5 cursor-pointer hover:border-primary-500/50 transition-all"
                                        onClick={() => router.push(`/admin/agents/${agent.id}`)}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <p className="text-white font-semibold text-lg">{agent.businessName}</p>
                                                <p className="text-dark-400 text-sm">{agent.phone}</p>
                                            </div>
                                            <span className="badge-primary">{agent.agentCode}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="p-3 rounded-xl bg-primary-500/10">
                                                <p className="text-dark-400 text-xs mb-1">{t('admin.agents.digitalCredit')}</p>
                                                <p className="text-primary-500 font-semibold">{symbol}{formatAmount(credit)}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-green-500/10">
                                                <p className="text-dark-400 text-xs mb-1">{t('admin.agents.totalCash')}</p>
                                                <p className="text-green-500 font-semibold">{symbol}{formatAmount(cash)}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-dark-400">{t('admin.agents.totalDeposits')}</p>
                                                <p className="text-white font-medium">{symbol}{formatAmount(deposits)}</p>
                                            </div>
                                            <div>
                                                <p className="text-dark-400">{t('admin.agents.totalWithdrawals')}</p>
                                                <p className="text-white font-medium">{symbol}{formatAmount(withdrawals)}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-dark-700 flex justify-between items-center">
                                            <span className={`badge ${agent.isActive ? 'badge-success' : 'badge-error'}`}>
                                                {agent.isActive ? t('common.active') : t('common.inactive')}
                                            </span>
                                            <span className="text-primary-500 text-sm">عرض التفاصيل ←</span>
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
