'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, UserIcon, CheckCircleIcon, MagnifyingGlassIcon, KeyIcon } from '@heroicons/react/24/outline';
import usePushNotifications from '@/hooks/usePushNotifications';

interface User {
    id: string;
    fullName: string;
    fullNameAr: string | null;
    phone: string;
}

export default function TransferPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<'search' | 'amount' | 'otp' | 'success'>('search');
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState('');
    const [recipient, setRecipient] = useState<User | null>(null);
    const [amount, setAmount] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [balance, setBalance] = useState(0);
    const [transferRequestId, setTransferRequestId] = useState('');
    const [otpExpiresIn, setOtpExpiresIn] = useState(300);
    const [remainingAttempts, setRemainingAttempts] = useState(3);

    // Push notifications
    const { notification } = usePushNotifications();

    useEffect(() => {
        setMounted(true);
        fetchBalance();
    }, []);

    // Auto-fill OTP from push notification
    useEffect(() => {
        if (notification?.data?.type === 'TRANSFER_OTP' && notification?.data?.otp) {
            setOtp(notification.data.otp);
        }
    }, [notification]);

    // OTP Timer
    useEffect(() => {
        if (step === 'otp' && otpExpiresIn > 0) {
            const timer = setInterval(() => {
                setOtpExpiresIn(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [step, otpExpiresIn]);

    const fetchBalance = async () => {
        try {
            const res = await fetch('/api/wallet');
            if (res.ok) {
                const data = await res.json();
                setBalance(data.wallet?.balance || 0);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const searchUser = async () => {
        if (!phone || phone.length < 9) {
            setError('الرجاء إدخال رقم هاتف صحيح');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/users/lookup?phone=${phone}`);
            const data = await res.json();
            if (res.ok && data.user) {
                setRecipient(data.user);
                setStep('amount');
            } else {
                setError('لم يتم العثور على المستخدم');
            }
        } catch (error) {
            setError('خطأ في الاتصال');
        }
        setLoading(false);
    };

    const requestOTP = async () => {
        if (!recipient || !amount) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/transactions/transfer/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientPhone: recipient.phone,
                    amount: parseFloat(amount),
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setTransferRequestId(data.transferRequestId);
                setOtpExpiresIn(data.expiresIn || 300);
                setStep('otp');
            } else {
                setError(data.error || 'فشل إرسال OTP');
            }
        } catch (error) {
            setError('خطأ في الاتصال');
        }
        setLoading(false);
    };

    const confirmTransfer = async () => {
        if (!transferRequestId || !otp) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/transactions/transfer/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transferRequestId,
                    otp,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setStep('success');
            } else {
                setError(data.error || 'رمز التأكيد غير صحيح');
                if (data.remainingAttempts !== undefined) {
                    setRemainingAttempts(data.remainingAttempts);
                }
                setOtp(''); // Clear OTP on error
            }
        } catch (error) {
            setError('خطأ في الاتصال');
        }
        setLoading(false);
    };

    const formatAmount = (value: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (step === 'search') router.push('/dashboard');
                                else if (step === 'amount') setStep('search');
                                else if (step === 'otp') setStep('amount');
                            }}
                            className="btn-ghost btn-icon"
                        >
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold text-white">💸 تحويل</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-md mx-auto">
                    {/* Balance */}
                    <div className="card p-4 mb-6 bg-primary-500/10">
                        <p className="text-dark-400 text-sm">رصيدك المتاح</p>
                        <p className="text-2xl font-bold text-primary-500">${formatAmount(balance)}</p>
                    </div>

                    {/* Step: Search */}
                    {step === 'search' && (
                        <div className="card p-6">
                            <h2 className="text-white font-semibold mb-4 text-center">البحث عن المستلم</h2>
                            <div className="relative mb-4">
                                <input
                                    type="tel"
                                    className="input text-center text-xl"
                                    placeholder="رقم الهاتف"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    dir="ltr"
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                            <button
                                onClick={searchUser}
                                disabled={loading || !phone}
                                className="btn-primary w-full"
                            >
                                {loading ? <div className="spinner w-5 h-5"></div> : (
                                    <>
                                        <MagnifyingGlassIcon className="w-5 h-5" />
                                        بحث
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Step: Amount */}
                    {step === 'amount' && recipient && (
                        <div className="card p-6">
                            <div className="flex items-center gap-4 mb-6 p-4 bg-dark-700/50 rounded-xl">
                                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                                    <UserIcon className="w-6 h-6 text-primary-500" />
                                </div>
                                <div>
                                    <p className="text-white font-semibold">{recipient.fullNameAr || recipient.fullName}</p>
                                    <p className="text-dark-400 text-sm" dir="ltr">{recipient.phone}</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-dark-300 text-sm mb-2 text-center">المبلغ ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={balance}
                                    className="input text-center text-3xl font-bold"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

                            <button
                                onClick={requestOTP}
                                disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
                                className="btn-primary w-full"
                            >
                                {loading ? <div className="spinner w-5 h-5"></div> : 'طلب رمز التأكيد'}
                            </button>
                        </div>
                    )}

                    {/* Step: OTP */}
                    {step === 'otp' && recipient && (
                        <div className="card p-6">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                                    <KeyIcon className="w-8 h-8 text-primary-500" />
                                </div>
                                <h2 className="text-white font-semibold text-lg mb-2">أدخل رمز التأكيد</h2>
                                <p className="text-dark-400 text-sm mb-2">تم إرسال رمز التحقق إلى تطبيقك</p>
                                <p className="text-primary-500 text-3xl font-bold mt-2">${formatAmount(parseFloat(amount))}</p>
                                <p className="text-dark-400 text-sm">إلى: {recipient.fullNameAr || recipient.fullName}</p>
                            </div>

                            <div className="mb-6">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    className="input text-center text-4xl tracking-[0.8em] font-mono"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    autoFocus
                                />
                                <div className="flex justify-between items-center mt-2 px-2">
                                    <p className="text-dark-500 text-xs">
                                        محاولات متبقية: {remainingAttempts}
                                    </p>
                                    <p className={`text-xs font-mono ${otpExpiresIn < 60 ? 'text-red-400' : 'text-dark-500'}`}>
                                        {formatTime(otpExpiresIn)}
                                    </p>
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

                            <button
                                onClick={confirmTransfer}
                                disabled={loading || otp.length !== 6 || otpExpiresIn <= 0}
                                className="btn-primary w-full mb-3"
                            >
                                {loading ? <div className="spinner w-5 h-5"></div> : 'تأكيد التحويل'}
                            </button>

                            <button
                                onClick={() => {
                                    setOtp('');
                                    setError('');
                                    requestOTP();
                                }}
                                disabled={loading}
                                className="btn-secondary w-full"
                            >
                                إعادة إرسال الرمز
                            </button>
                        </div>
                    )}

                    {/* Step: Success */}
                    {step === 'success' && (
                        <div className="card p-8 text-center">
                            <CheckCircleIcon className="w-20 h-20 text-green-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">تم التحويل بنجاح!</h2>
                            <p className="text-dark-400 mb-6">
                                تم تحويل ${formatAmount(parseFloat(amount))} إلى {recipient?.fullNameAr || recipient?.fullName}
                            </p>
                            <Link href="/dashboard" className="btn-primary inline-block">
                                العودة للرئيسية
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
