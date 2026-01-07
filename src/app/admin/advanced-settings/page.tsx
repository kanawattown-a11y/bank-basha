'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Cog6ToothIcon,
    ShieldCheckIcon,
    UserIcon,
    BuildingStorefrontIcon,
    UserGroupIcon,
    CameraIcon,
    ExclamationTriangleIcon,
    ArrowLeftIcon,
    LanguageIcon,
    CurrencyDollarIcon,
    BanknotesIcon,
} from '@heroicons/react/24/outline';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface AdvancedSettings {
    id: string;
    // User Limits - USD
    userDailyLimit: number;
    userWeeklyLimit: number;
    userMonthlyLimit: number;
    userRateLimitPer10Min: number;
    // User Limits - SYP
    userDailyLimitSYP: number;
    userWeeklyLimitSYP: number;
    userMonthlyLimitSYP: number;
    // Merchant Limits - USD
    merchantDailyPaymentLimit: number;
    merchantMonthlyLimit: number;
    // Merchant Limits - SYP
    merchantDailyPaymentLimitSYP: number;
    merchantMonthlyLimitSYP: number;
    // Agent Limits - USD
    agentDailyCreditLimit: number;
    agentDailyWithdrawLimit: number;
    agentMaxCashHold: number;
    // Agent Limits - SYP
    agentDailyCreditLimitSYP: number;
    agentDailyWithdrawLimitSYP: number;
    agentMaxCashHoldSYP: number;
    // Risk Thresholds - USD
    riskHighAmountThreshold: number;
    riskRapidTxThreshold: number;
    riskNewDeviceHoldDays: number;
    // Risk Thresholds - SYP
    riskHighAmountThresholdSYP: number;
    // Auto-freeze triggers
    autoFreezeHighAmount: boolean;
    autoFreezeNewDevice: boolean;
    autoFreezeSuspiciousIP: boolean;
    autoFreezeRapidTx: boolean;
    // Snapshot settings
    snapshotEnabled: boolean;
    snapshotTimeHour: number;
    snapshotRetentionDays: number;
}

export default function AdvancedSettingsPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const [settings, setSettings] = useState<AdvancedSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/advanced-settings');
            const data = await res.json();
            setSettings(data.settings);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/advanced-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: t('admin.advancedSettings.success') });
            } else {
                setMessage({ type: 'error', text: t('admin.advancedSettings.error') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'حدث خطأ' });
        }
        setSaving(false);
    };

    const updateSetting = (key: keyof AdvancedSettings, value: number | boolean) => {
        if (!settings) return;
        setSettings({ ...settings, [key]: value });
    };

    // Format number with commas
    const formatNumber = (num: number) => {
        return num.toLocaleString();
    };

    if (!mounted || loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]" suppressHydrationWarning>
                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500">فشل في تحميل الإعدادات</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="btn-ghost btn-icon">
                        <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{t('admin.advancedSettings.title')}</h1>
                        <p className="text-dark-400 mt-1">{t('admin.advancedSettings.subtitle')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary"
                    >
                        {saving ? t('admin.advancedSettings.saving') : t('admin.advancedSettings.save')}
                    </button>
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
            </div>

            {message && (
                <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                {/* User Limits */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">{t('admin.advancedSettings.sections.users')}</h2>
                    </div>

                    {/* USD Section */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                            <span className="text-green-500 font-semibold">USD - دولار أمريكي</span>
                        </div>
                        <div className="grid md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.dailyLimit')}</label>
                                <input
                                    type="number"
                                    value={settings.userDailyLimit}
                                    onChange={(e) => updateSetting('userDailyLimit', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.weeklyLimit')}</label>
                                <input
                                    type="number"
                                    value={settings.userWeeklyLimit}
                                    onChange={(e) => updateSetting('userWeeklyLimit', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.monthlyLimit')}</label>
                                <input
                                    type="number"
                                    value={settings.userMonthlyLimit}
                                    onChange={(e) => updateSetting('userMonthlyLimit', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.rateLimit')}</label>
                                <input
                                    type="number"
                                    value={settings.userRateLimitPer10Min}
                                    onChange={(e) => updateSetting('userRateLimitPer10Min', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SYP Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <BanknotesIcon className="w-5 h-5 text-primary-500" />
                            <span className="text-primary-500 font-semibold">SYP - ليرة سورية</span>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.dailyLimit')}</label>
                                <input
                                    type="number"
                                    value={settings.userDailyLimitSYP}
                                    onChange={(e) => updateSetting('userDailyLimitSYP', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.weeklyLimit')}</label>
                                <input
                                    type="number"
                                    value={settings.userWeeklyLimitSYP}
                                    onChange={(e) => updateSetting('userWeeklyLimitSYP', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.monthlyLimit')}</label>
                                <input
                                    type="number"
                                    value={settings.userMonthlyLimitSYP}
                                    onChange={(e) => updateSetting('userMonthlyLimitSYP', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Merchant Limits */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <BuildingStorefrontIcon className="w-5 h-5 text-purple-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">{t('admin.advancedSettings.sections.merchants')}</h2>
                    </div>

                    {/* USD Section */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                            <span className="text-green-500 font-semibold">USD - دولار أمريكي</span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.merchantDaily')}</label>
                                <input
                                    type="number"
                                    value={settings.merchantDailyPaymentLimit}
                                    onChange={(e) => updateSetting('merchantDailyPaymentLimit', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.merchantMonthly')}</label>
                                <input
                                    type="number"
                                    value={settings.merchantMonthlyLimit}
                                    onChange={(e) => updateSetting('merchantMonthlyLimit', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SYP Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <BanknotesIcon className="w-5 h-5 text-primary-500" />
                            <span className="text-primary-500 font-semibold">SYP - ليرة سورية</span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.merchantDaily')}</label>
                                <input
                                    type="number"
                                    value={settings.merchantDailyPaymentLimitSYP}
                                    onChange={(e) => updateSetting('merchantDailyPaymentLimitSYP', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.merchantMonthly')}</label>
                                <input
                                    type="number"
                                    value={settings.merchantMonthlyLimitSYP}
                                    onChange={(e) => updateSetting('merchantMonthlyLimitSYP', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Agent Limits */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <UserGroupIcon className="w-5 h-5 text-green-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">{t('admin.advancedSettings.sections.agents')}</h2>
                    </div>

                    {/* USD Section */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                            <span className="text-green-500 font-semibold">USD - دولار أمريكي</span>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.agentCredit')}</label>
                                <input
                                    type="number"
                                    value={settings.agentDailyCreditLimit}
                                    onChange={(e) => updateSetting('agentDailyCreditLimit', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.agentWithdraw')}</label>
                                <input
                                    type="number"
                                    value={settings.agentDailyWithdrawLimit}
                                    onChange={(e) => updateSetting('agentDailyWithdrawLimit', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.agentCashHold')}</label>
                                <input
                                    type="number"
                                    value={settings.agentMaxCashHold}
                                    onChange={(e) => updateSetting('agentMaxCashHold', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SYP Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <BanknotesIcon className="w-5 h-5 text-primary-500" />
                            <span className="text-primary-500 font-semibold">SYP - ليرة سورية</span>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.agentCredit')}</label>
                                <input
                                    type="number"
                                    value={settings.agentDailyCreditLimitSYP}
                                    onChange={(e) => updateSetting('agentDailyCreditLimitSYP', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.agentWithdraw')}</label>
                                <input
                                    type="number"
                                    value={settings.agentDailyWithdrawLimitSYP}
                                    onChange={(e) => updateSetting('agentDailyWithdrawLimitSYP', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.agentCashHold')}</label>
                                <input
                                    type="number"
                                    value={settings.agentMaxCashHoldSYP}
                                    onChange={(e) => updateSetting('agentMaxCashHoldSYP', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Risk Thresholds */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">{t('admin.advancedSettings.sections.risk')}</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        {/* USD Risk */}
                        <div className="bg-dark-800/50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                                <span className="text-green-500 font-semibold">USD</span>
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.riskHighAmount')}</label>
                                <input
                                    type="number"
                                    value={settings.riskHighAmountThreshold}
                                    onChange={(e) => updateSetting('riskHighAmountThreshold', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                        </div>

                        {/* SYP Risk */}
                        <div className="bg-dark-800/50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <BanknotesIcon className="w-5 h-5 text-primary-500" />
                                <span className="text-primary-500 font-semibold">SYP</span>
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.riskHighAmount')}</label>
                                <input
                                    type="number"
                                    value={settings.riskHighAmountThresholdSYP}
                                    onChange={(e) => updateSetting('riskHighAmountThresholdSYP', Number(e.target.value))}
                                    className="input w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.riskRapidTx')}</label>
                            <input
                                type="number"
                                value={settings.riskRapidTxThreshold}
                                onChange={(e) => updateSetting('riskRapidTxThreshold', Number(e.target.value))}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.riskNewDevice')}</label>
                            <input
                                type="number"
                                value={settings.riskNewDeviceHoldDays}
                                onChange={(e) => updateSetting('riskNewDeviceHoldDays', Number(e.target.value))}
                                className="input w-full"
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoFreezeHighAmount}
                                onChange={(e) => updateSetting('autoFreezeHighAmount', e.target.checked)}
                                className="w-5 h-5 rounded border-dark-600 bg-dark-800"
                            />
                            <span className="text-white">{t('admin.advancedSettings.labels.autoFreezeHigh')}</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoFreezeNewDevice}
                                onChange={(e) => updateSetting('autoFreezeNewDevice', e.target.checked)}
                                className="w-5 h-5 rounded border-dark-600 bg-dark-800"
                            />
                            <span className="text-white">{t('admin.advancedSettings.labels.autoFreezeDevice')}</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoFreezeSuspiciousIP}
                                onChange={(e) => updateSetting('autoFreezeSuspiciousIP', e.target.checked)}
                                className="w-5 h-5 rounded border-dark-600 bg-dark-800"
                            />
                            <span className="text-white">{t('admin.advancedSettings.labels.autoFreezeIP')}</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoFreezeRapidTx}
                                onChange={(e) => updateSetting('autoFreezeRapidTx', e.target.checked)}
                                className="w-5 h-5 rounded border-dark-600 bg-dark-800"
                            />
                            <span className="text-white">{t('admin.advancedSettings.labels.autoFreezeRapid')}</span>
                        </label>
                    </div>
                </div>

                {/* Snapshot Settings */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                            <CameraIcon className="w-5 h-5 text-cyan-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">{t('admin.advancedSettings.sections.backup')}</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <label className="flex items-center gap-3 cursor-pointer col-span-full">
                            <input
                                type="checkbox"
                                checked={settings.snapshotEnabled}
                                onChange={(e) => updateSetting('snapshotEnabled', e.target.checked)}
                                className="w-5 h-5 rounded border-dark-600 bg-dark-800"
                            />
                            <span className="text-white">{t('admin.advancedSettings.labels.backupEnabled')}</span>
                        </label>
                        <div>
                            <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.backupHour')}</label>
                            <input
                                type="number"
                                min="0"
                                max="23"
                                value={settings.snapshotTimeHour}
                                onChange={(e) => updateSetting('snapshotTimeHour', Number(e.target.value))}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-dark-400 text-sm mb-2">{t('admin.advancedSettings.labels.backupRetention')}</label>
                            <input
                                type="number"
                                value={settings.snapshotRetentionDays}
                                onChange={(e) => updateSetting('snapshotRetentionDays', Number(e.target.value))}
                                className="input w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
