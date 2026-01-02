'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowDownIcon,
    ArrowUpIcon,
    BanknotesIcon,
    DocumentTextIcon,
    UserGroupIcon,
    ArrowRightOnRectangleIcon,
    CheckCircleIcon,
    ClockIcon,
    GlobeAltIcon,
    CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { CurrencyToggle, formatCurrencyAmount, type Currency } from '@/components/CurrencySelector';

interface AgentData {
    balances: { USD: number; SYP: number };
    currentCredit: { USD: number; SYP: number };
    cashCollected: { USD: number; SYP: number };
    todayTransactions: number;
    pendingSettlement: number;
    agentCode: string;
    businessName: string;
    // Legacy fields
    digitalBalance?: number;
}

export default function AgentDashboard() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [agentData, setAgentData] = useState<AgentData | null>(null);
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [currency, setCurrency] = useState<Currency>('USD');
    const [formData, setFormData] = useState({ customerPhone: '', amount: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [exchangeRates, setExchangeRates] = useState<{ deposit: number | null; withdraw: number | null }>({ deposit: null, withdraw: null });

    useEffect(() => {
        fetchAgentData();
        fetchExchangeRates();
    }, []);

    const fetchExchangeRates = async () => {
        try {
            const response = await fetch('/api/exchange-rates');
            if (response.ok) {
                const data = await response.json();
                setExchangeRates({
                    deposit: data.deposit?.rate || null,
                    withdraw: data.withdraw?.rate || null,
                });
            }
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
        }
    };

    const fetchAgentData = async () => {
        try {
            const response = await fetch('/api/agents/dashboard');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed to fetch data');
            }
            const data = await response.json();
            setAgentData(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setMessage(null);

        try {
            const endpoint = activeTab === 'deposit' ? '/api/agents/deposit' : '/api/agents/withdraw';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerPhone: formData.customerPhone,
                    amount: parseFloat(formData.amount),
                    currency, // Add currency
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Operation failed');
            }

            setMessage({
                type: 'success',
                text: activeTab === 'deposit'
                    ? `${t('common.success')} - ${t('transaction.referenceNumber')}: ${data.referenceNumber}`
                    : `${t('common.success')} - ${t('transaction.referenceNumber')}: ${data.referenceNumber}`,
            });
            setFormData({ customerPhone: '', amount: '' });
            fetchAgentData(); // Refresh data
        } catch (err) {
            setMessage({
                type: 'error',
                text: err instanceof Error ? err.message : t('common.error'),
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('ar-SY').format(num);
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const toggleLanguage = () => {
        const newLocale = locale === 'ar' ? 'en' : 'ar';
        document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;
        window.location.reload();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
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
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-gradient hidden sm:block">{t('agent.dashboard.title')}</span>
                            <p className="text-xs text-dark-400">{agentData?.businessName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="badge-primary">{agentData?.agentCode}</span>
                        <button onClick={toggleLanguage} className="btn-ghost btn-icon text-primary-500" title={locale === 'ar' ? 'English' : 'العربية'}>
                            <GlobeAltIcon className="w-6 h-6" />
                        </button>
                        <button onClick={handleLogout} className="btn-ghost btn-icon text-red-500">
                            <ArrowRightOnRectangleIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-20 pb-8 px-4">
                <div className="max-w-6xl mx-auto space-y-6">

                    {/* Stats Grid - Dual Currency */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="stat-card">
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500/10 mx-auto mb-3">
                                <BanknotesIcon className="w-6 h-6 text-primary-500" />
                            </div>
                            <div className="stat-value text-gradient">
                                {formatCurrencyAmount(agentData?.currentCredit?.[currency] || agentData?.currentCredit?.USD || 0, currency)}
                            </div>
                            <div className="stat-label">{t('agent.dashboard.balance')}</div>
                        </div>

                        <div className="stat-card">
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10 mx-auto mb-3">
                                <BanknotesIcon className="w-6 h-6 text-green-500" />
                            </div>
                            <div className="stat-value text-green-500">
                                {formatCurrencyAmount(agentData?.cashCollected?.[currency] || agentData?.cashCollected?.USD || 0, currency)}
                            </div>
                            <div className="stat-label">{t('agent.dashboard.cashCollected')}</div>
                        </div>

                        <div className="stat-card">
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 mx-auto mb-3">
                                <DocumentTextIcon className="w-6 h-6 text-purple-500" />
                            </div>
                            <div className="stat-value">{agentData?.todayTransactions || 0}</div>
                            <div className="stat-label">{t('agent.dashboard.todayTransactions')}</div>
                        </div>
                    </div>

                    {/* Exchange Rates */}
                    {(exchangeRates.deposit || exchangeRates.withdraw) && (
                        <div className="card p-4 border-primary-500/30 bg-gradient-to-r from-primary-500/10 to-purple-500/10">
                            <div className="flex items-center gap-3 mb-3">
                                <CurrencyDollarIcon className="w-5 h-5 text-primary-500" />
                                <span className="text-white font-semibold">سعر الصرف اليوم</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {exchangeRates.deposit && (
                                    <div className="text-center p-3 rounded-xl bg-dark-800/50">
                                        <p className="text-dark-400 text-xs mb-1">سعر الإيداع</p>
                                        <p className="text-lg font-bold text-green-400">{formatNumber(exchangeRates.deposit)}</p>
                                        <p className="text-dark-500 text-xs">ل.س / $1</p>
                                    </div>
                                )}
                                {exchangeRates.withdraw && (
                                    <div className="text-center p-3 rounded-xl bg-dark-800/50">
                                        <p className="text-dark-400 text-xs mb-1">سعر السحب</p>
                                        <p className="text-lg font-bold text-red-400">{formatNumber(exchangeRates.withdraw)}</p>
                                        <p className="text-dark-500 text-xs">ل.س / $1</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Main Actions Card */}
                    <div className="card p-6">
                        {/* Currency Toggle */}
                        <div className="flex items-center justify-center mb-4">
                            <CurrencyToggle value={currency} onChange={setCurrency} />
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => {
                                    setActiveTab('deposit');
                                    setMessage(null);
                                }}
                                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'deposit'
                                    ? 'bg-green-500 text-dark-900'
                                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                                    }`}
                            >
                                <ArrowDownIcon className="w-5 h-5" />
                                {t('agent.deposit.title')}
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('withdraw');
                                    setMessage(null);
                                }}
                                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'withdraw'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                                    }`}
                            >
                                <ArrowUpIcon className="w-5 h-5" />
                                {t('agent.withdraw.title')}
                            </button>
                        </div>

                        {/* Message */}
                        {message && (
                            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
                                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                }`}>
                                {message.type === 'success' ? (
                                    <CheckCircleIcon className="w-6 h-6 flex-shrink-0" />
                                ) : null}
                                <span>{message.text}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="label">
                                    {activeTab === 'deposit'
                                        ? t('agent.deposit.customerPhone')
                                        : t('agent.withdraw.customerPhone')}
                                </label>
                                <input
                                    type="tel"
                                    className="input"
                                    placeholder="09XX XXX XXX"
                                    dir="ltr"
                                    value={formData.customerPhone}
                                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">
                                    {activeTab === 'deposit'
                                        ? t('agent.deposit.amount')
                                        : t('agent.withdraw.amount')}
                                </label>
                                <input
                                    type="number"
                                    className="input text-3xl text-center font-bold"
                                    placeholder="0"
                                    dir="ltr"
                                    min="1"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                                <p className="text-center text-dark-400 mt-2">$</p>
                            </div>

                            <button
                                type="submit"
                                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${activeTab === 'deposit'
                                    ? 'bg-green-500 hover:bg-green-400 text-dark-900'
                                    : 'bg-red-500 hover:bg-red-400 text-white'
                                    }`}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <div className="spinner w-6 h-6 mx-auto"></div>
                                ) : activeTab === 'deposit' ? (
                                    t('agent.deposit.confirm')
                                ) : (
                                    t('agent.withdraw.confirm')
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Quick Links */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/agent/settlement" className="card-hover p-6 text-center">
                            <DocumentTextIcon className="w-10 h-10 text-primary-500 mx-auto mb-3" />
                            <span className="text-white font-medium">{t('agent.settlement.title')}</span>
                        </Link>
                        <Link href="/agent/transactions" className="card-hover p-6 text-center">
                            <UserGroupIcon className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                            <span className="text-white font-medium">{t('agent.transactions.title')}</span>
                        </Link>
                    </div>

                </div >
            </main >
        </div >
    );
}
