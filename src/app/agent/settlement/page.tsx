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
    BanknotesIcon,
    PlusCircleIcon,
    ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface Settlement {
    id: string;
    settlementNumber: string;
    type: string;
    requestedAmount: number;
    cashCollected?: number;
    platformShare?: number;
    agentShare?: number;
    amountDue?: number;
    creditGiven?: number;
    cashToReceive?: number;
    deliveryStatus?: string;
    status: string;
    createdAt: string;
}

interface AgentData {
    cashCollected: { USD: number; SYP: number };
    currentCredit: { USD: number; SYP: number };
    creditLimit: { USD: number; SYP: number };
    pendingDebt: number;
}

export default function AgentSettlementPage() {
    const t = useTranslations();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [agentData, setAgentData] = useState<AgentData | null>(null);
    const [currency, setCurrency] = useState<'USD' | 'SYP'>('USD');
    const [settlementType, setSettlementType] = useState<'CASH_TO_CREDIT' | 'CREDIT_REQUEST' | 'CASH_REQUEST'>('CASH_TO_CREDIT');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // System settings (fetch from API in production)
    const [platformCommission, setPlatformCommission] = useState(2);
    const [agentCommission, setAgentCommission] = useState(1);

    useEffect(() => {
        fetchData();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/system/settings');
            if (res.ok) {
                const data = await res.json();
                setPlatformCommission(data.settlementPlatformCommission || 2);
                setAgentCommission(data.settlementAgentCommission || 1);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const fetchData = async () => {
        try {
            const [dashRes, settleRes] = await Promise.all([
                fetch('/api/agents/dashboard'),
                fetch('/api/agents/settlements'),
            ]);

            if (dashRes.ok) {
                const data = await dashRes.json();
                setAgentData({
                    cashCollected: {
                        USD: data.cashCollected || 0,
                        SYP: data.cashCollectedSYP || 0
                    },
                    currentCredit: {
                        USD: data.currentCredit || 0,
                        SYP: data.currentCreditSYP || 0
                    },
                    creditLimit: {
                        USD: data.creditLimit || 0,
                        SYP: data.creditLimitSYP || 0
                    },
                    pendingDebt: data.pendingDebt || 0,
                });
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

    const getMaxAmount = () => {
        if (!agentData) return 0;

        const cashBalance = agentData.cashCollected[currency];
        const creditBalance = agentData.currentCredit[currency];
        const creditLimit = agentData.creditLimit[currency];

        if (settlementType === 'CASH_TO_CREDIT') {
            return cashBalance;
        } else if (settlementType === 'CREDIT_REQUEST') {
            return creditLimit - creditBalance - agentData.pendingDebt;
        } else if (settlementType === 'CASH_REQUEST') {
            return creditBalance;
        }
        return 0;
    };

    const calculatePreview = () => {
        if (!amount || !agentData) return null;

        const requestedAmount = parseFloat(amount);
        if (isNaN(requestedAmount) || requestedAmount <= 0) return null;

        // Get currency-specific balances
        const cashBalance = agentData.cashCollected[currency];
        const creditBalance = agentData.currentCredit[currency];
        const creditLimit = agentData.creditLimit[currency];

        if (settlementType === 'CASH_TO_CREDIT') {
            const platformFee = requestedAmount * (platformCommission / 100);
            const agentFee = requestedAmount * (agentCommission / 100);
            const netCredit = requestedAmount - platformFee - agentFee;

            return {
                cashGiven: requestedAmount,
                platformFee,
                agentFee,
                netCredit,
            };
        } else if (settlementType === 'CREDIT_REQUEST') {
            return {
                creditRequested: requestedAmount,
                currentDebt: agentData.pendingDebt,
                newTotalDebt: agentData.pendingDebt + requestedAmount,
            };
        } else if (settlementType === 'CASH_REQUEST') {
            return {
                cashNeeded: requestedAmount,
                creditDeducted: requestedAmount,
            };
        }

        return null;
    };

    const handleRequestSettlement = async () => {
        setIsSubmitting(true);
        setMessage(null);

        try {
            const amt = parseFloat(amount);
            if (!amt || amt < 10) {
                throw new Error('Minimum settlement amount is $10');
            }

            const maxAmount = getMaxAmount();
            if (amt > maxAmount) {
                throw new Error(`Maximum available: $${maxAmount}`);
            }

            const response = await fetch('/api/agents/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: settlementType,
                    amount: parseFloat(amount),
                    currency,
                    notes: notes.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create settlement');
            }

            setMessage({
                type: 'success',
                text: t('common.success'),
            });
            setAmount('');
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
            case 'APPROVED':
                return <span className="badge-info">Approved</span>;
            case 'COMPLETED':
                return <span className="badge-success">{t('common.completed')}</span>;
            case 'REJECTED':
                return <span className="badge-error">{t('common.rejected')}</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'CASH_TO_CREDIT':
                return <span className="badge-primary">💵→💳 Cash to Credit</span>;
            case 'CREDIT_REQUEST':
                return <span className="badge-secondary">📈 Credit Request</span>;
            case 'CASH_REQUEST':
                return <span className="badge-accent">💰 Cash Request</span>;
            default:
                return <span className="badge">{type}</span>;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    if (!agentData) {
        return <div>Error loading data</div>;
    }

    const maxAmount = getMaxAmount();
    const preview = calculatePreview();

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
                <div className="max-w-2xl mx-auto">
                    {message && (
                        <div className={`mb-4 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Currency Selector */}
                    <div className="card mb-6">
                        <div className="p-4">
                            <h3 className="text-sm font-medium text-dark-300 mb-3">Select Currency</h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCurrency('USD')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${currency === 'USD'
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                        }`}
                                >
                                    💵 USD
                                </button>
                                <button
                                    onClick={() => setCurrency('SYP')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${currency === 'SYP'
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                        }`}
                                >
                                    🇸🇾 SYP
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Balance Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="card">
                            <div className="p-4">
                                <div className="text-sm text-dark-400 mb-1">Cash Collected</div>
                                <div className="text-2xl font-bold text-primary-500">
                                    {currency === 'SYP' ? 'ل.س' : '$'}
                                    {agentData ? formatAmount(agentData.cashCollected[currency]) : '0.00'}
                                </div>
                                <div className="text-xs text-dark-500 mt-1">
                                    Other: {currency === 'USD' ? 'ل.س' : '$'}
                                    {agentData ? formatAmount(agentData.cashCollected[currency === 'USD' ? 'SYP' : 'USD']) : '0.00'}
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="p-4">
                                <div className="text-sm text-dark-400 mb-1">Digital Credit</div>
                                <div className="text-2xl font-bold text-secondary-500">
                                    {currency === 'SYP' ? 'ل.س' : '$'}
                                    {agentData ? formatAmount(agentData.currentCredit[currency]) : '0.00'}
                                </div>
                                <div className="text-xs text-dark-500 mt-1">
                                    Other: {currency === 'USD' ? 'ل.س' : '$'}
                                    {agentData ? formatAmount(agentData.currentCredit[currency === 'USD' ? 'SYP' : 'USD']) : '0.00'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Settlement Type Selector */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Settlement Type</h3>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <button
                                onClick={() => { setSettlementType('CASH_TO_CREDIT'); setAmount(''); }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${settlementType === 'CASH_TO_CREDIT'
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                                    }`}
                            >
                                <BanknotesIcon className="w-6 h-6 text-primary-500" />
                                <span className="text-xl">💵→💳</span>
                                <span className="text-xs text-center text-dark-300">Cash to Credit</span>
                            </button>
                            <button
                                onClick={() => { setSettlementType('CREDIT_REQUEST'); setAmount(''); }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${settlementType === 'CREDIT_REQUEST'
                                    ? 'border-secondary-500 bg-secondary-500/10'
                                    : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                                    }`}
                            >
                                <PlusCircleIcon className="w-6 h-6 text-secondary-500" />
                                <span className="text-xl">📈</span>
                                <span className="text-xs text-center text-dark-300">Credit Request</span>
                            </button>
                            <button
                                onClick={() => { setSettlementType('CASH_REQUEST'); setAmount(''); }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${settlementType === 'CASH_REQUEST'
                                    ? 'border-accent-500 bg-accent-500/10'
                                    : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                                    }`}
                            >
                                <ArrowDownTrayIcon className="w-6 h-6 text-accent-500" />
                                <span className="text-xl">💰</span>
                                <span className="text-xs text-center text-dark-300">Cash Request</span>
                            </button>
                        </div>

                        {/* Amount Input */}
                        <div className="mb-4">
                            <label className="block text-dark-300 text-sm mb-2">
                                Amount (${formatAmount(10)} - ${formatAmount(maxAmount)})
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                max={maxAmount}
                                min={10}
                                step="0.01"
                                className="input w-full"
                                placeholder="Enter amount"
                            />
                            <p className="text-sm text-dark-400 mt-1">
                                Available: ${formatAmount(maxAmount)}
                            </p>
                        </div>

                        {/* Preview */}
                        {amount && parseFloat(amount) >= 10 && (
                            <div className="card bg-dark-800 p-4 mb-4">
                                <h4 className="font-semibold text-white mb-3">Preview:</h4>
                                {preview && settlementType === 'CASH_TO_CREDIT' && (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-dark-300">Cash to Give:</span>
                                            <span className="text-white font-medium">{currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(preview.cashGiven || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-300">Platform Fee ({platformCommission}%):</span>
                                            <span className="text-red-400 font-medium">-{currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(preview.platformFee || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-300">Agent Fee ({agentCommission}%):</span>
                                            <span className="text-red-400 font-medium">-{currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(preview.agentFee || 0)}</span>
                                        </div>
                                        <div className="flex justify-between pt-3 border-t border-dark-600">
                                            <span className="text-dark-300 font-medium">Net Credit:</span>
                                            <span className="text-green-400 font-bold text-lg">{currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(preview.netCredit || 0)}</span>
                                        </div>
                                    </div>
                                )}
                                {settlementType === 'CREDIT_REQUEST' && (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-dark-300">Credit Requested:</span>
                                            <span className="text-white font-medium">{currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(parseFloat(amount))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-300">Current Debt:</span>
                                            <span className="text-orange-400">{currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(agentData.pendingDebt)}</span>
                                        </div>
                                        <div className="border-t border-dark-700 pt-2 mt-2 flex justify-between font-semibold">
                                            <span className="text-dark-300">New Total Debt:</span>
                                            <span className="text-red-500">{currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(agentData.pendingDebt + parseFloat(amount))}</span>
                                        </div>
                                        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                            <p className="text-xs text-orange-400">⚠️ This is a loan - you&apos;ll need to repay later</p>
                                        </div>
                                    </div>
                                )}
                                {settlementType === 'CASH_REQUEST' && (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-dark-300">Cash Needed:</span>
                                            <span className="text-white font-medium">{currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(parseFloat(amount))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-300">Credit to Deduct:</span>
                                            <span className="text-red-400">-{currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(parseFloat(amount))}</span>
                                        </div>
                                        <div className="border-t border-dark-700 pt-2 mt-2 flex justify-between font-semibold">
                                            <span className="text-dark-300">Cash You&apos;ll Receive:</span>
                                            <span className="text-green-500">{currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(parseFloat(amount))}</span>
                                        </div>
                                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                            <p className="text-xs text-blue-400">ℹ️ Admin will arrange cash delivery</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes */}
                        <div className="mb-4">
                            <label className="block text-dark-300 text-sm mb-2">
                                {t('common.note')} ({t('common.optional')})
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="input w-full min-h-[80px]"
                                placeholder="Add notes (optional)"
                            />
                        </div>

                        {/* Messages */}
                        {message && (
                            <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleRequestSettlement}
                            className="btn-primary w-full"
                            disabled={isSubmitting || !amount || parseFloat(amount) < 10 || parseFloat(amount) > maxAmount}
                        >
                            {isSubmitting ? (
                                <div className="spinner w-5 h-5"></div>
                            ) : (
                                <>
                                    <DocumentTextIcon className="w-5 h-5" />
                                    <span>Request Settlement</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Settlement History */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Settlement History</h3>

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
                                        <div className="mb-2">
                                            {getTypeBadge(settlement.type)}
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-dark-400">{formatDate(settlement.createdAt)}</span>
                                            <span className="text-primary-500 font-semibold">
                                                ${formatAmount(settlement.requestedAmount)}
                                            </span>
                                        </div>
                                        {settlement.deliveryStatus && (
                                            <div className="mt-2 text-xs text-blue-400">
                                                Delivery: {settlement.deliveryStatus}
                                            </div>
                                        )}
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
