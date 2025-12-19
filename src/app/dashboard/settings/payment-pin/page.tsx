'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CreditCardIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function PaymentPinSettingsPage() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasPin, setHasPin] = useState(false);
    const [step, setStep] = useState<'idle' | 'enter'>('idle');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [currentPin, setCurrentPin] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setMounted(true);
        checkPinStatus();
    }, []);

    const checkPinStatus = async () => {
        try {
            const res = await fetch('/api/user/payment-pin');
            if (res.ok) {
                const data = await res.json();
                setHasPin(data.hasPaymentPin);
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    const handlePinChange = (value: string, type: 'pin' | 'confirm' | 'current') => {
        const numericValue = value.replace(/\D/g, '').slice(0, 4);
        if (type === 'pin') setPin(numericValue);
        else if (type === 'confirm') setConfirmPin(numericValue);
        else setCurrentPin(numericValue);
        setError('');
    };

    const handleSubmit = async () => {
        if (pin.length !== 4) {
            setError('الرمز يجب أن يكون 4 أرقام');
            return;
        }
        if (pin !== confirmPin) {
            setError('الرمز غير متطابق');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/user/payment-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pin,
                    currentPin: hasPin ? currentPin : undefined
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setStep('idle');
                    setPin('');
                    setConfirmPin('');
                    setCurrentPin('');
                    setSuccess(false);
                    setHasPin(true);
                }, 2000);
            } else {
                setError(data.error || 'حدث خطأ');
            }
        } catch (error) {
            setError('خطأ في الاتصال');
        }
        setSubmitting(false);
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/settings" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </Link>
                        <h1 className="text-xl font-bold text-white">💳 رمز الدفع</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-md mx-auto">
                    {success ? (
                        <div className="card p-8 text-center">
                            <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
                            <p className="text-white text-lg">تم تعيين رمز الدفع بنجاح!</p>
                        </div>
                    ) : step === 'idle' ? (
                        <div className="card p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                                    <CreditCardIcon className="w-8 h-8 text-purple-500" />
                                </div>
                                <div>
                                    <h2 className="text-white font-semibold">رمز الدفع</h2>
                                    <p className="text-dark-400 text-sm">
                                        {hasPin ? '✅ مُفعّل' : '⚠️ غير مُفعّل'}
                                    </p>
                                </div>
                            </div>

                            <p className="text-dark-300 text-sm mb-6">
                                رمز الدفع هو رمز سري مكون من 4 أرقام يُطلب عند كل عملية دفع أو تحويل لتأكيد هويتك وحماية أموالك.
                            </p>

                            {!hasPin && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                                    <p className="text-yellow-400 text-sm">
                                        ⚠️ يجب تعيين رمز الدفع لتتمكن من إجراء عمليات الدفع والتحويل
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => setStep('enter')}
                                className="btn-primary w-full"
                            >
                                {hasPin ? 'تغيير الرمز' : 'تعيين رمز الدفع'}
                            </button>
                        </div>
                    ) : (
                        <div className="card p-6">
                            {hasPin && (
                                <div className="mb-6">
                                    <label className="block text-dark-300 text-sm mb-2">الرمز الحالي</label>
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        className="input text-center text-3xl tracking-[0.8em]"
                                        value={currentPin}
                                        onChange={(e) => handlePinChange(e.target.value, 'current')}
                                        placeholder="••••"
                                        maxLength={4}
                                    />
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-dark-300 text-sm mb-2">الرمز الجديد (4 أرقام)</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    className="input text-center text-3xl tracking-[0.8em]"
                                    value={pin}
                                    onChange={(e) => handlePinChange(e.target.value, 'pin')}
                                    placeholder="••••"
                                    maxLength={4}
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-dark-300 text-sm mb-2">تأكيد الرمز</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    className="input text-center text-3xl tracking-[0.8em]"
                                    value={confirmPin}
                                    onChange={(e) => handlePinChange(e.target.value, 'confirm')}
                                    placeholder="••••"
                                    maxLength={4}
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm text-center mb-4">{error}</p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || pin.length !== 4 || confirmPin.length !== 4}
                                    className="btn-primary flex-1"
                                >
                                    {submitting ? <div className="spinner w-5 h-5"></div> : 'حفظ'}
                                </button>
                                <button
                                    onClick={() => { setStep('idle'); setPin(''); setConfirmPin(''); setCurrentPin(''); setError(''); }}
                                    className="btn-ghost flex-1"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
