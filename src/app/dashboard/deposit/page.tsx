'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    ArrowDownIcon,
    MapPinIcon,
    CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface Agent {
    id: string;
    agentCode: string;
    businessName: string;
    businessAddress: string;
}

export default function DepositPage() {
    const t = useTranslations();
    const router = useRouter();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchNearbyAgents();
    }, []);



    const fetchNearbyAgents = async () => {
        try {
            const response = await fetch('/api/agents/nearby');
            if (response.ok) {
                const data = await response.json();
                setAgents(data.agents || []);
            }
        } catch (error) {
            console.error('Error fetching agents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('ar-SY').format(num);
    };

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href="/dashboard" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-lg font-semibold text-white">{t('wallet.actions.deposit')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-md mx-auto">
                    {/* Info Card */}
                    <div className="card p-6 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                            <ArrowDownIcon className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-white text-center mb-2">{t('transaction.deposit.cashDeposit')}</h2>
                        <p className="text-dark-400 text-center text-sm">
                            {t('transaction.deposit.description')}
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="card p-6 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4">{t('transaction.deposit.stepsTitle')}</h3>
                        <div className="space-y-4">
                            {[
                                { num: 1, text: t('transaction.deposit.step1') },
                                { num: 2, text: t('transaction.deposit.step2') },
                                { num: 3, text: t('transaction.deposit.step3') },
                            ].map((step) => (
                                <div key={step.num} className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-primary-500 font-semibold">{step.num}</span>
                                    </div>
                                    <p className="text-dark-300">{step.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Nearby Agents */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">{t('transaction.deposit.nearbyAgents')}</h3>
                            <MapPinIcon className="w-5 h-5 text-primary-500" />
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="spinner w-8 h-8"></div>
                            </div>
                        ) : agents.length === 0 ? (
                            <div className="text-center py-8 text-dark-400">
                                <p>{t('transaction.deposit.noAgents')}</p>
                                <p className="text-sm mt-2">{t('transaction.deposit.tryLater')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {agents.map((agent) => (
                                    <div key={agent.id} className="p-4 rounded-xl bg-dark-700/50 border border-dark-600">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-white font-medium">{agent.businessName}</p>
                                                <p className="text-dark-400 text-sm mt-1">{agent.businessAddress}</p>
                                            </div>
                                            <span className="badge-primary">{agent.agentCode}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
