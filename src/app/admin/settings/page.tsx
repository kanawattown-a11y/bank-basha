'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
    ArrowLeftIcon,
    Cog6ToothIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    LanguageIcon,
} from '@heroicons/react/24/outline';

interface Settings {
    id: string;
    // USD Fee Settings
    depositFeePercent: number;
    depositFeeFixed: number;
    withdrawalFeePercent: number;
    withdrawalFeeFixed: number;
    transferFeePercent: number;
    transferFeeFixed: number;
    qrPaymentFeePercent: number;
    qrPaymentFeeFixed: number;
    serviceFeePercent: number;
    serviceFeeFixed: number;
    agentCommissionPercent: number;
    // SYP Fee Settings
    depositFeePercentSYP?: number;
    depositFeeFixedSYP?: number;
    withdrawalFeePercentSYP?: number;
    withdrawalFeeFixedSYP?: number;
    transferFeePercentSYP?: number;
    transferFeeFixedSYP?: number;
    qrPaymentFeePercentSYP?: number;
    qrPaymentFeeFixedSYP?: number;
    serviceFeePercentSYP?: number;
    serviceFeeFixedSYP?: number;
    agentCommissionPercentSYP?: number;
    // Settlement
    settlementPlatformCommission: number;
    settlementAgentCommission: number;
}

export default function AdminSettingsPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const [mounted, setMounted] = useState(false);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeCurrencyTab, setActiveCurrencyTab] = useState<'USD' | 'SYP'>('USD');

    useEffect(() => {
        setMounted(true);
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/admin/settings');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed to fetch');
            }
            const data = await response.json();
            setSettings(data.settings);
        } catch (error) {
            console.error('Error:', error);
            setMessage({ type: 'error', text: t('admin.settings.loadFailed') });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        setIsSaving(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // USD Fees
                    depositFeePercent: settings.depositFeePercent,
                    depositFeeFixed: settings.depositFeeFixed,
                    withdrawalFeePercent: settings.withdrawalFeePercent,
                    withdrawalFeeFixed: settings.withdrawalFeeFixed,
                    transferFeePercent: settings.transferFeePercent,
                    transferFeeFixed: settings.transferFeeFixed,
                    qrPaymentFeePercent: settings.qrPaymentFeePercent,
                    qrPaymentFeeFixed: settings.qrPaymentFeeFixed,
                    serviceFeePercent: settings.serviceFeePercent,
                    serviceFeeFixed: settings.serviceFeeFixed,
                    agentCommissionPercent: settings.agentCommissionPercent,
                    // SYP Fees
                    depositFeePercentSYP: settings.depositFeePercentSYP,
                    depositFeeFixedSYP: settings.depositFeeFixedSYP,
                    withdrawalFeePercentSYP: settings.withdrawalFeePercentSYP,
                    withdrawalFeeFixedSYP: settings.withdrawalFeeFixedSYP,
                    transferFeePercentSYP: settings.transferFeePercentSYP,
                    transferFeeFixedSYP: settings.transferFeeFixedSYP,
                    qrPaymentFeePercentSYP: settings.qrPaymentFeePercentSYP,
                    qrPaymentFeeFixedSYP: settings.qrPaymentFeeFixedSYP,
                    serviceFeePercentSYP: settings.serviceFeePercentSYP,
                    serviceFeeFixedSYP: settings.serviceFeeFixedSYP,
                    agentCommissionPercentSYP: settings.agentCommissionPercentSYP,
                    // Settlement
                    settlementPlatformCommission: settings.settlementPlatformCommission,
                    settlementAgentCommission: settings.settlementAgentCommission,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save');
            }

            setMessage({ type: 'success', text: `${t('admin.settings.saved')} ✓` });
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || t('admin.settings.saveFailed') });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        if (!confirm(t('common.confirm') + '?')) return;

        setSettings({
            ...settings!,
            depositFeePercent: 1.0,
            withdrawalFeePercent: 1.5,
            transferFeePercent: 0.5,
            qrPaymentFeePercent: 0.5,
            qrPaymentFeeFixed: 0.1,
            serviceFeePercent: 0,
            serviceFeeFixed: 0,
            agentCommissionPercent: 50.0,
            settlementPlatformCommission: 0.5,
            settlementAgentCommission: 0.5,
        });
    };

    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-dark-300">{t('admin.settings.loadFailed')}</p>
                    <button onClick={fetchSettings} className="btn-primary mt-4">
                        {t('common.refresh')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <Cog6ToothIcon className="w-8 h-8 text-primary-500" />
                        <h1 className="text-xl font-bold text-white">{t('admin.settings.systemSettings')}</h1>
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
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Message */}
                    {message && (
                        <div className={`card p-4 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <p className={`text-center font-medium ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {message.text}
                            </p>
                        </div>
                    )}

                    {/* Commission Rates */}
                    <div className="card p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            💰 {t('admin.settings.fees.title')}
                        </h2>

                        {/* Currency Tabs */}
                        <div className="flex gap-2 mb-6 p-1 bg-dark-800/50 rounded-xl border border-dark-700 w-fit">
                            <button
                                onClick={() => setActiveCurrencyTab('USD')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all ${activeCurrencyTab === 'USD'
                                    ? 'bg-primary-500 text-white shadow-lg'
                                    : 'text-dark-400 hover:text-white'
                                    }`}
                            >
                                💵 USD
                            </button>
                            <button
                                onClick={() => setActiveCurrencyTab('SYP')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all ${activeCurrencyTab === 'SYP'
                                    ? 'bg-green-500 text-white shadow-lg'
                                    : 'text-dark-400 hover:text-white'
                                    }`}
                            >
                                💴 SYP
                            </button>
                        </div>

                        <div className="space-y-6">
                            {activeCurrencyTab === 'USD' ? (
                                <>
                                    {/* USD Fields */}
                                    {/* Deposit */}
                                    <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700">
                                        <div className="md:col-span-2">
                                            <h3 className="text-lg font-medium text-primary-400 mb-1">{t('admin.settings.fees.depositFee')}</h3>
                                            <p className="text-xs text-dark-400 mb-3">{t('admin.settings.fees.depositDescription')}</p>
                                        </div>
                                        <div>
                                            <label className="block text-dark-300 text-sm mb-2">نسبة (%)</label>
                                            <input
                                                type="number" step="0.1" min="0" max="100" className="input"
                                                value={settings.depositFeePercent}
                                                onChange={(e) => setSettings({ ...settings, depositFeePercent: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-dark-300 text-sm mb-2">ثابت ($)</label>
                                            <input
                                                type="number" step="0.1" min="0" className="input"
                                                value={settings.depositFeeFixed}
                                                onChange={(e) => setSettings({ ...settings, depositFeeFixed: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>

                                    {/* Withdrawal */}
                                    <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700">
                                        <div className="md:col-span-2">
                                            <h3 className="text-lg font-medium text-primary-400 mb-1">{t('admin.settings.fees.withdrawFee')}</h3>
                                            <p className="text-xs text-dark-400 mb-3">عمولة السحب: يتم خصمها عند قيام المستخدم بسحب نقدي من الوكيل.</p>
                                        </div>
                                        <div>
                                            <label className="block text-dark-300 text-sm mb-2">نسبة (%)</label>
                                            <input
                                                type="number" step="0.1" min="0" max="100" className="input"
                                                value={settings.withdrawalFeePercent}
                                                onChange={(e) => setSettings({ ...settings, withdrawalFeePercent: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-dark-300 text-sm mb-2">ثابت ($)</label>
                                            <input
                                                type="number" step="0.1" min="0" className="input"
                                                value={settings.withdrawalFeeFixed}
                                                onChange={(e) => setSettings({ ...settings, withdrawalFeeFixed: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>

                                    {/* Transfer */}
                                    <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700">
                                        <div className="md:col-span-2">
                                            <h3 className="text-lg font-medium text-primary-400 mb-1">{t('admin.settings.fees.transferFee')}</h3>
                                            <p className="text-xs text-dark-400 mb-3">عمولة التحويل: يتم خصمها عند إرسال الأموال بين المستخدمين.</p>
                                        </div>
                                        <div>
                                            <label className="block text-dark-300 text-sm mb-2">نسبة (%)</label>
                                            <input
                                                type="number" step="0.1" min="0" max="100" className="input"
                                                value={settings.transferFeePercent}
                                                onChange={(e) => setSettings({ ...settings, transferFeePercent: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-dark-300 text-sm mb-2">ثابت ($)</label>
                                            <input
                                                type="number" step="0.1" min="0" className="input"
                                                value={settings.transferFeeFixed}
                                                onChange={(e) => setSettings({ ...settings, transferFeeFixed: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>

                                    {/* QR Payment */}
                                    <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700">
                                        <div className="md:col-span-2">
                                            <h3 className="text-lg font-medium text-primary-400 mb-1">{t('admin.settings.fees.paymentFee')}</h3>
                                            <p className="text-xs text-dark-400 mb-3">عمولة الدفع (QR): يتم خصمها عند الدفع للتجار.</p>
                                        </div>
                                        <div>
                                            <label className="block text-dark-300 text-sm mb-2">نسبة (%)</label>
                                            <input
                                                type="number" step="0.1" min="0" max="100" className="input"
                                                value={settings.qrPaymentFeePercent}
                                                onChange={(e) => setSettings({ ...settings, qrPaymentFeePercent: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-dark-300 text-sm mb-2">ثابت ($)</label>
                                            <input
                                                type="number" step="0.1" min="0" className="input"
                                                value={settings.qrPaymentFeeFixed}
                                                onChange={(e) => setSettings({ ...settings, qrPaymentFeeFixed: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>

                                    {/* Service Fee */}
                                    <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700">
                                        <div className="md:col-span-2">
                                            <h3 className="text-lg font-medium text-primary-400 mb-1">رسوم الخدمات (Services)</h3>
                                            <p className="text-xs text-dark-400 mb-3">عمولة الشراء: يتم خصمها عند شراء خدمة أو دفع فاتورة.</p>
                                        </div>
                                        <div>
                                            <label className="block text-dark-300 text-sm mb-2">نسبة (%)</label>
                                            <input
                                                type="number" step="0.1" min="0" max="100" className="input"
                                                value={settings.serviceFeePercent}
                                                onChange={(e) => setSettings({ ...settings, serviceFeePercent: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-dark-300 text-sm mb-2">ثابت ($)</label>
                                            <input
                                                type="number" step="0.1" min="0" className="input"
                                                value={settings.serviceFeeFixed}
                                                onChange={(e) => setSettings({ ...settings, serviceFeeFixed: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>

                                    {/* USD Agent Share */}
                                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                                        <div className="mb-2">
                                            <h3 className="text-lg font-medium text-blue-400 mb-1">{t('admin.settings.fees.agentCommission')}</h3>
                                            <p className="text-xs text-blue-300/70">{t('admin.settings.fees.agentShareDescription')}</p>
                                        </div>
                                        <div>
                                            <label className="block text-blue-300 text-sm mb-2">نسبة من الرسوم (%)</label>
                                            <input
                                                type="number" step="1" min="0" max="100" className="input border-blue-500/30 focus:border-blue-500"
                                                value={settings.agentCommissionPercent}
                                                onChange={(e) => setSettings({ ...settings, agentCommissionPercent: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* SYP Deposit */}
                                    <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-green-500/5 border border-green-500/30">
                                        <div className="md:col-span-2">
                                            <h3 className="text-lg font-medium text-green-400 mb-1">عمولة الإيداع (SYP)</h3>
                                            <p className="text-xs text-green-300/60 mb-3">إيداع الليرة السورية</p>
                                        </div>
                                        <div>
                                            <label className="block text-green-300 text-sm mb-2">نسبة (%)</label>
                                            <input type="number" step="0.1" min="0" max="100" className="input border-green-500/30"
                                                value={settings.depositFeePercentSYP ?? settings.depositFeePercent}
                                                onChange={(e) => setSettings({ ...settings, depositFeePercentSYP: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="block text-green-300 text-sm mb-2">ثابت (ل.س)</label>
                                            <input type="number" step="100" min="0" className="input border-green-500/30"
                                                value={settings.depositFeeFixedSYP ?? settings.depositFeeFixed}
                                                onChange={(e) => setSettings({ ...settings, depositFeeFixedSYP: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    </div>

                                    {/* SYP Withdrawal */}
                                    <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-green-500/5 border border-green-500/30">
                                        <div className="md:col-span-2">
                                            <h3 className="text-lg font-medium text-green-400 mb-1">عمولة السحب (SYP)</h3>
                                            <p className="text-xs text-green-300/60 mb-3">سحب الليرة السورية</p>
                                        </div>
                                        <div>
                                            <label className="block text-green-300 text-sm mb-2">نسبة (%)</label>
                                            <input type="number" step="0.1" min="0" max="100" className="input border-green-500/30"
                                                value={settings.withdrawalFeePercentSYP ?? settings.withdrawalFeePercent}
                                                onChange={(e) => setSettings({ ...settings, withdrawalFeePercentSYP: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="block text-green-300 text-sm mb-2">ثابت (ل.س)</label>
                                            <input type="number" step="100" min="0" className="input border-green-500/30"
                                                value={settings.withdrawalFeeFixedSYP ?? settings.withdrawalFeeFixed}
                                                onChange={(e) => setSettings({ ...settings, withdrawalFeeFixedSYP: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    </div>

                                    {/* SYP Transfer */}
                                    <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-green-500/5 border border-green-500/30">
                                        <div className="md:col-span-2">
                                            <h3 className="text-lg font-medium text-green-400 mb-1">عمولة التحويل (SYP)</h3>
                                            <p className="text-xs text-green-300/60 mb-3">تحويل الليرة السورية</p>
                                        </div>
                                        <div>
                                            <label className="block text-green-300 text-sm mb-2">نسبة (%)</label>
                                            <input type="number" step="0.1" min="0" max="100" className="input border-green-500/30"
                                                value={settings.transferFeePercentSYP ?? settings.transferFeePercent}
                                                onChange={(e) => setSettings({ ...settings, transferFeePercentSYP: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="block text-green-300 text-sm mb-2">ثابت (ل.س)</label>
                                            <input type="number" step="100" min="0" className="input border-green-500/30"
                                                value={settings.transferFeeFixedSYP ?? settings.transferFeeFixed}
                                                onChange={(e) => setSettings({ ...settings, transferFeeFixedSYP: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    </div>

                                    {/* SYP QR */}
                                    <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-green-500/5 border border-green-500/30">
                                        <div className="md:col-span-2">
                                            <h3 className="text-lg font-medium text-green-400 mb-1">عمولة QR (SYP)</h3>
                                            <p className="text-xs text-green-300/60 mb-3">دفع QR بالليرة</p>
                                        </div>
                                        <div>
                                            <label className="block text-green-300 text-sm mb-2">نسبة (%)</label>
                                            <input type="number" step="0.1" min="0" max="100" className="input border-green-500/30"
                                                value={settings.qrPaymentFeePercentSYP ?? settings.qrPaymentFeePercent}
                                                onChange={(e) => setSettings({ ...settings, qrPaymentFeePercentSYP: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="block text-green-300 text-sm mb-2">ثابت (ل.س)</label>
                                            <input type="number" step="100" min="0" className="input border-green-500/30"
                                                value={settings.qrPaymentFeeFixedSYP ?? settings.qrPaymentFeeFixed}
                                                onChange={(e) => setSettings({ ...settings, qrPaymentFeeFixedSYP: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    </div>

                                    {/* SYP Services */}
                                    <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl bg-green-500/5 border border-green-500/30">
                                        <div className="md:col-span-2">
                                            <h3 className="text-lg font-medium text-green-400 mb-1">رسوم الخدمات (SYP)</h3>
                                            <p className="text-xs text-green-300/60 mb-3">عمولة الخدمات بالليرة</p>
                                        </div>
                                        <div>
                                            <label className="block text-green-300 text-sm mb-2">نسبة (%)</label>
                                            <input type="number" step="0.1" min="0" max="100" className="input border-green-500/30"
                                                value={settings.serviceFeePercentSYP ?? settings.serviceFeePercent}
                                                onChange={(e) => setSettings({ ...settings, serviceFeePercentSYP: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="block text-green-300 text-sm mb-2">ثابت (ل.س)</label>
                                            <input type="number" step="100" min="0" className="input border-green-500/30"
                                                value={settings.serviceFeeFixedSYP ?? settings.serviceFeeFixed}
                                                onChange={(e) => setSettings({ ...settings, serviceFeeFixedSYP: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    </div>

                                    {/* SYP Agent */}
                                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                                        <div className="mb-2">
                                            <h3 className="text-lg font-medium text-green-400 mb-1">نصيب الوكيل (SYP)</h3>
                                            <p className="text-xs text-green-300/70">نسبة الوكيل من رسوم الليرة</p>
                                        </div>
                                        <div>
                                            <label className="block text-green-300 text-sm mb-2">نسبة من الرسوم (%)</label>
                                            <input type="number" step="1" min="0" max="100" className="input border-green-500/30"
                                                value={settings.agentCommissionPercentSYP ?? settings.agentCommissionPercent}
                                                onChange={(e) => setSettings({ ...settings, agentCommissionPercentSYP: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Settlement Commission */}
                    <div className="card p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            💼 {t('admin.settlements.title')}
                        </h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-dark-300 text-sm mb-2">
                                    {t('admin.settings.fees.settlementPlatform')} (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    className="input"
                                    value={settings.settlementPlatformCommission}
                                    onChange={(e) => setSettings({ ...settings, settlementPlatformCommission: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            <div>
                                <label className="block text-dark-300 text-sm mb-2">
                                    {t('admin.settings.fees.settlementAgent')} (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    className="input"
                                    value={settings.settlementAgentCommission}
                                    onChange={(e) => setSettings({ ...settings, settlementAgentCommission: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="btn-primary flex-1"
                        >
                            {isSaving ? (
                                <>
                                    <div className="spinner w-5 h-5"></div>
                                    <span>{t('common.loading')}</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span>{t('admin.settings.save')}</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleReset}
                            disabled={isSaving}
                            className="btn-ghost"
                        >
                            <ArrowPathIcon className="w-5 h-5" />
                            <span>{t('common.refresh')}</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
