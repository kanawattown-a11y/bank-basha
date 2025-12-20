'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

interface Settlement {
    id: string;
    settlementNumber: string;
    cashCollected: number;
    platformShare: number;
    agentShare: number;
    amountDue: number;
    status: string;
    createdAt: string;
}

export default function AgentSettlementPage() {
    const t = useTranslations();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [cashCollected, setCashCollected] = useState(0);
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [dashRes, settleRes] = await Promise.all([
                fetch('/api/agents/dashboard'),
                fetch('/api/agents/settlements'),
            ]);

            if (dashRes.ok) {
                const data = await dashRes.json();
                setCashCollected(data.cashCollected || 0);
            }

            if (settleRes.ok) {
                const data = await settleRes.json();
                setSettlements(data.settlements || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestSettlement = async () => {
        setIsSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch('/api/agents/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create settlement');
            }

            setMessage({
                type: 'success',
                text: t('common.success'),
            });
            setNotes('');
            fetchData();
        } catch (err) {
            setMessage({
                type: 'error',
                text: err instanceof Error ? err.message : t('common.error'),
            });
        } finally {
            setIsSubmitting(false);
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
        }).format(new Date(dateString));
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="badge-warning">{t('common.pending')}</span>;
            case 'COMPLETED':
                return <span className="badge-success">{t('common.completed')}</span>;
            case 'REJECTED':
                return <span className="badge-error">{t('common.rejected')}</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/agent" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-lg font-semibold text-white">{t('agent.settlement.title')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Current Balance Card */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">{t('agent.dashboard.cashCollected')}</h2>
                            <DocumentTextIcon className="w-6 h-6 text-primary-500" />
                        </div>

                        <div className="text-4xl font-bold text-gradient mb-2">
                            {formatAmount(cashCollected)} $
                        </div>
                        <p className="text-dark-400 text-sm mb-6">
                            {t('agent.settlement.description')}
                        </p>

                        {message && (
                            <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        {/* Notes Field */}
                        <div className="mb-4">
                            <label className="block text-dark-300 text-sm mb-2">
                                {t('common.note')} ({t('common.optional')})
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="input w-full min-h-[80px]"
                                placeholder={t('agent.settlement.notesPlaceholder')}
                            />
                        </div>

                        <button
                            onClick={handleRequestSettlement}
                            className="btn-primary w-full"
                            disabled={isSubmitting || cashCollected < 10}
                        >
                            {isSubmitting ? (
                                <div className="spinner w-5 h-5"></div>
                            ) : (
                                <>
                                    <DocumentTextIcon className="w-5 h-5" />
                                    <span>{t('agent.settlement.request')}</span>
                                </>
                            )}
                        </button>

                        {cashCollected < 10 && (
                            <p className="text-dark-500 text-sm text-center mt-3">
                                {t('agent.settlement.minimum')}
                            </p>
                        )}
                    </div>

                    {/* Settlement History */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">{t('agent.settlement.history')}</h3>

                        {settlements.length === 0 ? (
                            <div className="text-center py-8 text-dark-400">
                                <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>{t('common.noData')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {settlements.map((settlement) => (
                                    <div key={settlement.id} className="p-4 rounded-xl bg-dark-700/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-medium">{settlement.settlementNumber}</span>
                                            {getStatusBadge(settlement.status)}
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-dark-400">{formatDate(settlement.createdAt)}</span>
                                            <span className="text-primary-500 font-semibold">
                                                {formatAmount(settlement.amountDue)} $
                                            </span>
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
