'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CurrencyDollarIcon, ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

interface ExchangeRate {
    id: string;
    type: 'DEPOSIT' | 'WITHDRAW';
    rate: number;
    isActive: boolean;
    updatedAt: string;
    updatedBy: string | null;
}

export default function ExchangeRatesPage() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rates, setRates] = useState<ExchangeRate[]>([]);
    const [depositRate, setDepositRate] = useState('');
    const [withdrawRate, setWithdrawRate] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        setMounted(true);
        fetchRates();
    }, []);

    const fetchRates = async () => {
        try {
            const res = await fetch('/api/admin/exchange-rates');
            if (res.ok) {
                const data = await res.json();
                setRates(data.rates || []);

                // Set form values
                const deposit = data.rates?.find((r: ExchangeRate) => r.type === 'DEPOSIT');
                const withdraw = data.rates?.find((r: ExchangeRate) => r.type === 'WITHDRAW');
                if (deposit) setDepositRate(deposit.rate.toString());
                if (withdraw) setWithdrawRate(withdraw.rate.toString());
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!depositRate || !withdrawRate) {
            setMessage({ type: 'error', text: 'يرجى إدخال كلا السعرين' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/exchange-rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    depositRate: parseFloat(depositRate),
                    withdrawRate: parseFloat(withdrawRate),
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'تم تحديث أسعار الصرف بنجاح' });
                fetchRates();
            } else {
                setMessage({ type: 'error', text: data.error || 'حدث خطأ' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'خطأ في الاتصال' });
        }
        setSaving(false);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('ar-SY').format(num);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </Link>
                        <h1 className="text-xl font-bold text-white">💱 أسعار الصرف</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Info Banner */}
                    <div className="card p-6 mb-6 border-primary-500/30">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center">
                                <CurrencyDollarIcon className="w-8 h-8 text-primary-500" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">سعر صرف الليرة السورية</h2>
                                <p className="text-dark-400 text-sm">تحديد سعر الصرف للإيداع والسحب</p>
                            </div>
                        </div>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Rate Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Deposit Rate */}
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                                    <ArrowDownIcon className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold">سعر الإيداع</h3>
                                    <p className="text-dark-400 text-xs">1 دولار = ؟ ليرة سورية</p>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={depositRate}
                                    onChange={(e) => setDepositRate(e.target.value)}
                                    className="input text-center text-2xl font-bold"
                                    placeholder="15000"
                                    min="1"
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 text-sm">ل.س</span>
                            </div>
                            {rates.find(r => r.type === 'DEPOSIT') && (
                                <p className="text-dark-500 text-xs mt-2 text-center">
                                    آخر تحديث: {formatDate(rates.find(r => r.type === 'DEPOSIT')!.updatedAt)}
                                </p>
                            )}
                        </div>

                        {/* Withdraw Rate */}
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                    <ArrowUpIcon className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold">سعر السحب</h3>
                                    <p className="text-dark-400 text-xs">1 دولار = ؟ ليرة سورية</p>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={withdrawRate}
                                    onChange={(e) => setWithdrawRate(e.target.value)}
                                    className="input text-center text-2xl font-bold"
                                    placeholder="14900"
                                    min="1"
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 text-sm">ل.س</span>
                            </div>
                            {rates.find(r => r.type === 'WITHDRAW') && (
                                <p className="text-dark-500 text-xs mt-2 text-center">
                                    آخر تحديث: {formatDate(rates.find(r => r.type === 'WITHDRAW')!.updatedAt)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="card p-6 mb-6 bg-gradient-to-r from-primary-500/10 to-purple-500/10">
                        <h3 className="text-white font-semibold mb-4 text-center">معاينة العرض للمستخدمين</h3>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-dark-400 text-sm">سعر الإيداع</p>
                                <p className="text-2xl font-bold text-green-400">
                                    {depositRate ? formatNumber(parseFloat(depositRate)) : '---'} ل.س
                                </p>
                                <p className="text-dark-500 text-xs">لكل 1$</p>
                            </div>
                            <div>
                                <p className="text-dark-400 text-sm">سعر السحب</p>
                                <p className="text-2xl font-bold text-red-400">
                                    {withdrawRate ? formatNumber(parseFloat(withdrawRate)) : '---'} ل.س
                                </p>
                                <p className="text-dark-500 text-xs">لكل 1$</p>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary w-full py-4 text-lg"
                    >
                        {saving ? (
                            <div className="spinner w-6 h-6"></div>
                        ) : (
                            '💾 حفظ أسعار الصرف'
                        )}
                    </button>
                </div>
            </main>
        </div>
    );
}
