'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
    ArrowLeftIcon,
    PaperAirplaneIcon,
    CheckCircleIcon,
    UserIcon,
    MagnifyingGlassIcon,
    KeyIcon,
} from '@heroicons/react/24/outline';

interface User {
    id: string;
    fullName: string;
    phone: string;
}

export default function MerchantTransferPage() {
    const t = useTranslations();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<'search' | 'amount' | 'pin' | 'success'>('search');
    const [loading, setLoading] = useState(false);
    const [businessBalance, setBusinessBalance] = useState(0);

    // Form data
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [formData, setFormData] = useState({
        phone: '',
        amount: '',
        currency: 'USD' as 'USD' | 'SYP', // NEW: Currency selector
        note: '',
    });
    const [recipient, setRecipient] = useState<User | null>(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [newBalance, setNewBalance] = useState(0);

    useEffect(() => {
        setMounted(true);
        fetchBalance();
    }, []);

    const fetchBalance = async () => {
        try {
            const res = await fetch('/api/wallet');
            if (res.ok) {
                const data = await res.json();
                // Get business wallet balance for selected currency
                const balance = data.businessWallets?.[formData.currency]?.balance || data.businessWallet?.balance || 0;
                setBusinessBalance(balance);
            } else if (res.status === 401 || res.status === 403) {
                router.push('/login');
            }
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const searchRecipient = async () => {
        if (!phone.trim()) {
            setError('أدخل رقم الهاتف');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/users/search?phone=${encodeURIComponent(phone)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    setRecipient(data.user);
                    setStep('amount');
                } else {
                    setError('المستخدم غير موجود');
                }
            } else {
                setError('المستخدم غير موجود');
            }
        } catch (err) {
            setError('حدث خطأ. حاول مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    const proceedToPin = () => {
        const amountNum = parseFloat(formData.amount);
        if (!amountNum || amountNum <= 0) {
            setError('أدخل مبلغ صحيح');
            return;
        }
        if (amountNum > businessBalance) {
            setError('رصيد غير كافي في حساب البزنس');
            return;
        }
        setError('');
        setStep('pin');
    };

    const handleTransfer = async () => {
        if (pin.length !== 4) {
            setError('الرمز يجب أن يكون 4 أرقام');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/merchants/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientPhone: formData.phone,
                    amount: parseFloat(formData.amount),
                    currency: formData.currency, // ✅ Send currency
                    pin,
                    note: formData.note || undefined,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setNewBalance(data.newBalance);
                setStep('success');
            } else {
                const data = await res.json();
                setError(data.error || 'فشل التحويل');
            }
        } catch (err) {
            setError('حدث خطأ. حاول مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = (num: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    // Success Screen
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
                <div className="card p-8 text-center max-w-md w-full">
                    <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">تم التحويل بنجاح!</h1>
                    <p className="text-dark-400 mb-4">
                        تم إرسال {formData.currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(parseFloat(formData.amount))} إلى {recipient?.fullName}
                    </p>

                    <div className="bg-dark-800 rounded-xl p-4 mb-6">
                        <p className="text-dark-400 text-sm">رصيد البزنس الجديد ({formData.currency})</p>
                        <p className="text-2xl font-bold text-white">{formData.currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(newBalance)}</p>
                    </div>

                    <div className="flex gap-3">
                        <Link href="/merchant" className="btn-ghost flex-1">
                            العودة
                        </Link>
                        <button onClick={() => {
                            setStep('search');
                            setFormData({ phone: '', amount: '', currency: 'USD', note: '' });
                            setRecipient(null);
                            setPin('');
                        }} className="btn-primary flex-1">
                            تحويل آخر
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/merchant" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <PaperAirplaneIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-500" />
                        <h1 className="text-base sm:text-xl font-bold text-white">تحويل من البزنس</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-md mx-auto space-y-6">

                    {/* Business Balance */}
                    <div className="card p-4 text-center">
                        <p className="text-dark-400 text-sm">رصيد البزنس المتاح ({formData.currency})</p>
                        <p className="text-2xl font-bold text-gradient">{formData.currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(businessBalance)}</p>
                    </div>

                    {/* Step: Search */}
                    {step === 'search' && (
                        <div className="card p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-white">البحث عن المستلم</h2>

                            <div className="relative">
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="input pl-4 pr-12 text-left"
                                    placeholder="09xxxxxxxx"
                                    dir="ltr"
                                />
                                <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 pointer-events-none" />
                            </div>

                            {error && (
                                <p className="text-red-500 text-sm text-center">{error}</p>
                            )}

                            <button
                                onClick={searchRecipient}
                                disabled={loading}
                                className="btn-primary w-full"
                            >
                                {loading ? <div className="spinner w-5 h-5"></div> : 'بحث'}
                            </button>
                        </div>
                    )}

                    {/* Step: Amount */}
                    {step === 'amount' && recipient && (
                        <div className="space-y-4">
                            <div className="card p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                                    <UserIcon className="w-6 h-6 text-primary-500" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">{recipient.fullName}</p>
                                    <p className="text-dark-400 text-sm" dir="ltr">{recipient.phone}</p>
                                </div>
                                <button onClick={() => { setStep('search'); setRecipient(null); }} className="btn-ghost btn-sm mr-auto">
                                    تغيير
                                </button>
                            </div>

                            <div className="card p-6 space-y-4">
                                {/* Currency Selector */}
                                <div>
                                    <label className="block text-dark-400 text-sm mb-2">العملة</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, currency: 'USD' })}
                                            className={`p-3 rounded-xl border-2 transition-all ${formData.currency === 'USD'
                                                ? 'border-primary-500 bg-primary-500/10 text-white'
                                                : 'border-dark-700 bg-dark-800 text-dark-400'}`}
                                        >
                                            💵 USD
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, currency: 'SYP' })}
                                            className={`p-3 rounded-xl border-2 transition-all ${formData.currency === 'SYP'
                                                ? 'border-primary-500 bg-primary-500/10 text-white'
                                                : 'border-dark-700 bg-dark-800 text-dark-400'}`}
                                        >
                                            🇸🇾 SYP
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-dark-400 text-sm mb-2">المبلغ ({formData.currency === 'SYP' ? 'ل.س' : '$'})</label>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="input text-center text-2xl font-bold"
                                        placeholder={formData.currency === 'SYP' ? '10000' : '0.00'}
                                        min="0.01"
                                        step={formData.currency === 'SYP' ? '100' : '0.01'}
                                    />
                                </div>

                                <div>
                                    <label className="block text-dark-400 text-sm mb-2">ملاحظة (اختياري)</label>
                                    <input
                                        type="text"
                                        value={formData.note}
                                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                        className="input"
                                        placeholder="سبب التحويل..."
                                        maxLength={200}
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-500 text-sm text-center">{error}</p>
                                )}

                                <button onClick={proceedToPin} className="btn-primary w-full">
                                    متابعة
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: PIN */}
                    {step === 'pin' && (
                        <div className="card p-6 space-y-4">
                            <div className="text-center mb-4">
                                <KeyIcon className="w-12 h-12 text-primary-500 mx-auto mb-2" />
                                <h2 className="text-lg font-semibold text-white">أدخل رمز الدفع</h2>
                                <p className="text-dark-400 text-sm">الرمز المكون من 4 أرقام</p>
                            </div>

                            <div className="bg-dark-800 rounded-xl p-4 mb-4">
                                <div className="flex justify-between mb-2">
                                    <span className="text-dark-400">المستلم</span>
                                    <span className="text-white">{recipient?.fullName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-dark-400">المبلغ</span>
                                    <span className="text-white font-bold">{formData.currency === 'SYP' ? 'ل.س' : '$'}{formatAmount(parseFloat(formData.amount))}</span>
                                </div>
                            </div>

                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                className="input text-center text-2xl tracking-[0.5em] font-bold"
                                placeholder="• • • •"
                                maxLength={4}
                                inputMode="numeric"
                            />

                            {error && (
                                <p className="text-red-500 text-sm text-center">{error}</p>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => { setStep('amount'); setPin(''); }} className="btn-ghost flex-1">
                                    رجوع
                                </button>
                                <button
                                    onClick={handleTransfer}
                                    disabled={loading || pin.length !== 4}
                                    className="btn-primary flex-1"
                                >
                                    {loading ? <div className="spinner w-5 h-5"></div> : 'تأكيد التحويل'}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
