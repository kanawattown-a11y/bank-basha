'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
    ArrowLeftIcon,
    ArrowsRightLeftIcon,
    CheckCircleIcon,
    BanknotesIcon,
    BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

interface WalletData {
    personal: number;
    business: number;
}

export default function InternalTransferPage() {
    const t = useTranslations();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [wallets, setWallets] = useState<WalletData>({ personal: 0, business: 0 });
    const [direction, setDirection] = useState<'to_personal' | 'to_business'>('to_personal');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            const res = await fetch('/api/wallet');
            if (res.ok) {
                const data = await res.json();
                console.log('Wallet data:', data); // Debug log
                setWallets({
                    personal: data.wallet?.balance || 0,
                    business: data.businessWallet?.balance || 0,
                });
            } else if (res.status === 401 || res.status === 403) {
                router.push('/login');
            }
        } catch (err) {
            console.error('Error fetching wallets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async () => {
        setError('');
        const amountNum = parseFloat(amount);

        if (!amountNum || amountNum <= 0) {
            setError('أدخل مبلغ صحيح');
            return;
        }

        const sourceBalance = direction === 'to_personal' ? wallets.business : wallets.personal;
        if (amountNum > sourceBalance) {
            setError('رصيد غير كافي');
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch('/api/wallet/internal-transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromWallet: direction === 'to_personal' ? 'business' : 'personal',
                    toWallet: direction === 'to_personal' ? 'personal' : 'business',
                    amount: amountNum,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setWallets({
                    personal: data.balances.personal,
                    business: data.balances.business,
                });
                setSuccess(true);
            } else {
                const data = await res.json();
                setError(data.error || 'فشل التحويل');
            }
        } catch (err) {
            setError('حدث خطأ. حاول مرة أخرى.');
        } finally {
            setProcessing(false);
        }
    };

    const formatAmount = (num: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
                <div className="card p-8 text-center max-w-md w-full">
                    <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">تم التحويل بنجاح!</h1>
                    <p className="text-dark-400 mb-6">
                        {direction === 'to_personal'
                            ? 'تم تحويل المبلغ من البزنس للحساب الشخصي'
                            : 'تم تحويل المبلغ من الحساب الشخصي للبزنس'
                        }
                    </p>

                    <div className="bg-dark-800 rounded-xl p-4 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-dark-400">💼 البزنس</span>
                            <span className="text-white font-bold">${formatAmount(wallets.business)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-dark-400">👤 الشخصي</span>
                            <span className="text-white font-bold">${formatAmount(wallets.personal)}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Link href="/merchant" className="btn-ghost flex-1">
                            العودة للبزنس
                        </Link>
                        <button onClick={() => { setSuccess(false); setAmount(''); }} className="btn-primary flex-1">
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
                        <ArrowsRightLeftIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-500" />
                        <h1 className="text-base sm:text-xl font-bold text-white">تحويل بين حساباتي</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-md mx-auto space-y-6">

                    {/* Wallet Balances */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`card p-4 text-center cursor-pointer transition-all ${direction === 'to_personal' ? 'ring-2 ring-primary-500' : ''}`}
                            onClick={() => setDirection('to_personal')}>
                            <BuildingStorefrontIcon className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                            <p className="text-dark-400 text-xs mb-1">البزنس</p>
                            <p className="text-white font-bold">${formatAmount(wallets.business)}</p>
                            {direction === 'to_personal' && <p className="text-xs text-primary-500 mt-1">← المصدر</p>}
                        </div>
                        <div className={`card p-4 text-center cursor-pointer transition-all ${direction === 'to_business' ? 'ring-2 ring-primary-500' : ''}`}
                            onClick={() => setDirection('to_business')}>
                            <BanknotesIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-dark-400 text-xs mb-1">الشخصي</p>
                            <p className="text-white font-bold">${formatAmount(wallets.personal)}</p>
                            {direction === 'to_business' && <p className="text-xs text-primary-500 mt-1">← المصدر</p>}
                        </div>
                    </div>

                    {/* Direction Selector */}
                    <div className="card p-4">
                        <p className="text-dark-400 text-sm mb-3">اتجاه التحويل:</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setDirection('to_personal')}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${direction === 'to_personal'
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                    }`}
                            >
                                البزنس → الشخصي
                            </button>
                            <button
                                onClick={() => setDirection('to_business')}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${direction === 'to_business'
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                    }`}
                            >
                                الشخصي → البزنس
                            </button>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="card p-6">
                        <label className="block text-dark-400 text-sm mb-2">المبلغ ($)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="input text-center text-2xl font-bold"
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                        />
                        <p className="text-dark-500 text-xs mt-2 text-center">
                            الرصيد المتاح: ${formatAmount(direction === 'to_personal' ? wallets.business : wallets.personal)}
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleTransfer}
                        disabled={processing || !amount}
                        className="btn-primary w-full py-4 text-lg"
                    >
                        {processing ? (
                            <div className="spinner w-6 h-6 mx-auto"></div>
                        ) : (
                            <>
                                <ArrowsRightLeftIcon className="w-6 h-6" />
                                <span>تحويل</span>
                            </>
                        )}
                    </button>

                    <p className="text-dark-500 text-xs text-center">
                        ✓ التحويل فوري بين حساباتك بدون رسوم
                    </p>
                </div>
            </main>
        </div>
    );
}
