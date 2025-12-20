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
    cashCollected: number;
    totalDeposits: number;
    totalWithdrawals: number;
    isActive: boolean;
}

export default function AdminAgentsPage() {
    const t = useTranslations();
    const router = useRouter();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
                            {filteredAgents.map((agent) => (
                                <div key={agent.id} className="card p-5">
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
                                            <p className="text-primary-500 font-semibold">${formatAmount(agent.currentCredit)}</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-green-500/10">
                                            <p className="text-dark-400 text-xs mb-1">{t('admin.agents.totalCash')}</p>
                                            <p className="text-green-500 font-semibold">${formatAmount(agent.cashCollected)}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-dark-400">{t('admin.agents.totalDeposits')}</p>
                                            <p className="text-white font-medium">{formatAmount(agent.totalDeposits)} $</p>
                                        </div>
                                        <div>
                                            <p className="text-dark-400">{t('admin.agents.totalWithdrawals')}</p>
                                            <p className="text-white font-medium">{formatAmount(agent.totalWithdrawals)} $</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-dark-700">
                                        <span className={`badge ${agent.isActive ? 'badge-success' : 'badge-error'}`}>
                                            {agent.isActive ? t('common.active') : t('common.inactive')}
                                        </span>
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
