'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    QrCodeIcon,
    CheckCircleIcon,
    CameraIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import CurrencySelector, { type Currency, formatCurrencyAmount } from '@/components/CurrencySelector';

// Dynamic import for QR Scanner (to avoid SSR issues)
const QRScanner = lazy(() => import('@/components/QRScanner'));

interface Merchant {
    id: string;
    businessName: string;
    businessNameAr: string | null;
    merchantCode: string;
}

interface WalletBalances {
    USD: number;
    SYP: number;
}

export default function PayPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<'method' | 'code' | 'amount' | 'pin' | 'success'>('method');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [merchant, setMerchant] = useState<Merchant | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [currency, setCurrency] = useState<Currency>('USD');
    const [balances, setBalances] = useState<WalletBalances>({ USD: 0, SYP: 0 });
    const [formData, setFormData] = useState({
        merchantCode: '',
        amount: '',
        pin: '',
    });

    useEffect(() => {
        setMounted(true);
        fetchBalances();
    }, []);

    const fetchBalances = async () => {
        try {
            const res = await fetch('/api/wallet');
            if (res.ok) {
                const data = await res.json();
                setBalances({
                    USD: data.personalWallets?.USD?.balance || data.wallet?.balance || 0,
                    SYP: data.personalWallets?.SYP?.balance || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching balances:', error);
        }
    };

    const lookupMerchant = async (code?: string) => {
        const merchantCode = code || formData.merchantCode;
        if (!merchantCode) return;
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/merchants/lookup?code=${merchantCode}`);
            const data = await res.json();
            if (res.ok && data.merchant) {
                setMerchant(data.merchant);
                setFormData(prev => ({ ...prev, merchantCode: data.merchant.merchantCode }));
                setStep('amount');
            } else {
                setError('لم يتم العثور على التاجر');
            }
        } catch (err) {
            setError('خطأ في الاتصال');
        }
        setIsLoading(false);
    };

    const handleQRScan = (result: string) => {
        setShowScanner(false);
        // Parse QR result - could be merchant code or URL
        let code = result;

        // If it's a URL, extract merchant code
        if (result.includes('BB-') || result.includes('M')) {
            const match = result.match(/(BB-\w+|M\d+)/);
            if (match) {
                code = match[1];
            }
        }

        // Set merchant code and lookup
        setFormData(prev => ({ ...prev, merchantCode: code }));
        lookupMerchant(code);
    };

    const processPayment = async () => {
        if (!merchant || !formData.amount || !formData.pin) return;
        setIsLoading(true);
        setError('');

        try {
            // Verify PIN first
            const pinRes = await fetch('/api/user/payment-pin', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: formData.pin }),
            });

            const pinData = await pinRes.json();
            if (!pinRes.ok) {
                if (pinData.requiresSetup) {
                    router.push('/dashboard/settings/payment-pin');
                    return;
                }
                setError(pinData.error || 'رمز الدفع غير صحيح');
                setIsLoading(false);
                return;
            }

            // Process payment with currency
            const response = await fetch('/api/transactions/qr-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantCode: formData.merchantCode,
                    amount: parseFloat(formData.amount),
                    currency, // Add currency to request
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'فشل الدفع');
            }

            setStep('success');
            setTimeout(() => router.push('/dashboard'), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ');
        }
        setIsLoading(false);
    };

    const formatAmount = (value: string) => {
        const num = parseFloat(value);
        if (isNaN(num)) return '0.00';
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    };

    if (!mounted) {
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
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => {
                                if (step === 'method') router.push('/dashboard');
                                else if (step === 'code') setStep('method');
                                else if (step === 'amount') setStep('code');
                                else if (step === 'pin') setStep('amount');
                            }}
                            className="btn-ghost btn-icon"
                        >
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <h1 className="text-lg font-semibold text-white">💳 الدفع للتاجر</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-md mx-auto">
                    {/* Step: Select Method */}
                    {step === 'method' && (
                        <div className="space-y-4">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                                    <QrCodeIcon className="w-10 h-10 text-purple-500" />
                                </div>
                                <h2 className="text-xl font-semibold text-white">الدفع للتاجر</h2>
                                <p className="text-dark-400 mt-2">اختر طريقة الدفع</p>
                            </div>

                            <button
                                onClick={() => setStep('code')}
                                className="card p-5 w-full text-right hover:border-primary-500/50 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                        <MagnifyingGlassIcon className="w-6 h-6 text-primary-500" />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold">إدخال رمز التاجر</p>
                                        <p className="text-dark-400 text-sm">BB-XXXXXX</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setShowScanner(true)}
                                className="card p-5 w-full text-right hover:border-purple-500/50 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                        <CameraIcon className="w-6 h-6 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold">مسح QR Code</p>
                                        <p className="text-dark-400 text-sm">استخدم الكاميرا</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Step: Enter Code */}
                    {step === 'code' && (
                        <div className="card p-6">
                            <h2 className="text-white font-semibold text-lg mb-4 text-center">أدخل رمز التاجر</h2>
                            <input
                                type="text"
                                className="input text-center text-xl tracking-widest mb-4"
                                placeholder="BB-XXXXXX"
                                value={formData.merchantCode}
                                onChange={(e) => setFormData({ ...formData, merchantCode: e.target.value.toUpperCase() })}
                                autoFocus
                            />
                            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                            <button
                                onClick={() => lookupMerchant()}
                                disabled={isLoading || !formData.merchantCode}
                                className="btn-primary w-full"
                            >
                                {isLoading ? <div className="spinner w-5 h-5"></div> : 'بحث'}
                            </button>
                        </div>
                    )}

                    {/* Step: Enter Amount */}
                    {step === 'amount' && merchant && (
                        <div className="card p-6">
                            <div className="text-center mb-6">
                                <div className="w-14 h-14 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-3">
                                    <QrCodeIcon className="w-7 h-7 text-primary-500" />
                                </div>
                                <h2 className="text-white font-semibold">{merchant.businessNameAr || merchant.businessName}</h2>
                                <p className="text-dark-400 text-sm">{merchant.merchantCode}</p>
                            </div>

                            {/* Currency Selector */}
                            <div className="mb-6">
                                <label className="block text-dark-300 text-sm mb-3 text-center">اختر العملة</label>
                                <CurrencySelector
                                    value={currency}
                                    onChange={setCurrency}
                                    balances={balances}
                                    showBalances={true}
                                    size="sm"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-dark-300 text-sm mb-2 text-center">
                                    المبلغ ({currency === 'SYP' ? 'ل.س' : '$'})
                                </label>
                                <input
                                    type="number"
                                    step={currency === 'SYP' ? '1000' : '0.01'}
                                    min={currency === 'SYP' ? '1000' : '0.01'}
                                    className="input text-center text-3xl font-bold"
                                    placeholder={currency === 'SYP' ? '0' : '0.00'}
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    autoFocus
                                />
                                {formData.amount && parseFloat(formData.amount) > 0 && (
                                    <p className="text-dark-400 text-xs text-center mt-2">
                                        رصيدك: {formatCurrencyAmount(balances[currency], currency)}
                                    </p>
                                )}
                                {formData.amount && parseFloat(formData.amount) > balances[currency] && (
                                    <p className="text-red-400 text-sm text-center mt-2">⚠️ رصيدك غير كافٍ</p>
                                )}
                            </div>

                            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

                            <button
                                onClick={() => setStep('pin')}
                                disabled={!formData.amount || parseFloat(formData.amount) <= 0 || parseFloat(formData.amount) > balances[currency]}
                                className="btn-primary w-full"
                            >
                                متابعة
                            </button>
                        </div>
                    )}

                    {/* Step: Enter PIN */}
                    {step === 'pin' && merchant && (
                        <div className="card p-6">
                            <div className="text-center mb-6">
                                <h2 className="text-white font-semibold text-lg mb-2">تأكيد الدفع</h2>
                                <p className="text-dark-400">{merchant.businessNameAr || merchant.businessName}</p>
                                <p className="text-primary-500 text-3xl font-bold mt-2">{formatCurrencyAmount(parseFloat(formData.amount), currency)}</p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-dark-300 text-sm mb-2 text-center">رمز الدفع (4 أرقام)</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    className="input text-center text-3xl tracking-[0.8em]"
                                    placeholder="••••"
                                    value={formData.pin}
                                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                                    autoFocus
                                />
                            </div>

                            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

                            <button
                                onClick={processPayment}
                                disabled={isLoading || formData.pin.length !== 4}
                                className="btn-primary w-full"
                            >
                                {isLoading ? <div className="spinner w-5 h-5"></div> : 'تأكيد الدفع'}
                            </button>
                        </div>
                    )}

                    {/* Step: Success */}
                    {step === 'success' && (
                        <div className="card p-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                                <CheckCircleIcon className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">تم الدفع بنجاح!</h2>
                            <p className="text-dark-400 mb-4">
                                تم دفع {formatCurrencyAmount(parseFloat(formData.amount), currency)} إلى {merchant?.businessNameAr || merchant?.businessName}
                            </p>
                            <p className="text-dark-500 text-sm">جاري التحويل للصفحة الرئيسية...</p>
                        </div>
                    )}
                </div>
            </main>

            {/* QR Scanner Modal */}
            {showScanner && (
                <Suspense fallback={
                    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                        <div className="spinner w-12 h-12"></div>
                    </div>
                }>
                    <QRScanner
                        onScan={handleQRScan}
                        onClose={() => setShowScanner(false)}
                    />
                </Suspense>
            )}
        </div>
    );
}
