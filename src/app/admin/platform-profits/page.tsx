'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    BanknotesIcon,
    ArrowPathIcon,
    ArrowTrendingUpIcon,
    ArrowDownTrayIcon,
    CurrencyDollarIcon,
    BuildingLibraryIcon,
    ChartBarIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowRightIcon,
    XMarkIcon,
    DocumentTextIcon,
    CalendarIcon,
} from '@heroicons/react/24/outline';

interface ProfitStats {
    availableBalance: { USD: number; SYP: number };
    periodStats: { feesUSD: number; feesSYP: number; transactionsUSD: number; transactionsSYP: number };
    feesByType: { type: string; currency: string; total: number; count: number }[];
    totalWithdrawn: { USD: number; SYP: number };
    withdrawals: Withdrawal[];
}

interface Withdrawal {
    id: string;
    referenceNumber: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    createdAt: string;
    admin: { fullName: string; fullNameAr: string | null } | null;
}

const TRANSACTION_TYPE_NAMES: Record<string, string> = {
    DEPOSIT: 'إيداع',
    WITHDRAWAL: 'سحب',
    TRANSFER: 'تحويل',
    QR_PAYMENT: 'دفع QR',
    BILL_PAYMENT: 'دفع فاتورة',
    SERVICE_PAYMENT: 'خدمة',
};

const PERIOD_OPTIONS = [
    { value: 'today', label: 'اليوم' },
    { value: 'week', label: 'آخر 7 أيام' },
    { value: 'month', label: 'هذا الشهر' },
    { value: 'year', label: 'هذا العام' },
    { value: 'all', label: 'الكل' },
];

export default function PlatformProfitsPage() {
    const [stats, setStats] = useState<ProfitStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Withdraw form
    const [withdrawForm, setWithdrawForm] = useState({
        amount: '',
        currency: 'USD',
        method: 'USER_WALLET',
        notes: '',
        bankName: '',
        accountNumber: '',
        iban: '',
        phone: '',
        walletType: 'PERSONAL',
    });

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/platform-profits?period=${period}`);
            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStats();
    }, [period]);

    const handleWithdraw = async () => {
        setWithdrawing(true);
        setMessage(null);
        try {
            const amount = parseFloat(withdrawForm.amount);
            if (isNaN(amount) || amount <= 0) {
                setMessage({ type: 'error', text: 'المبلغ غير صالح' });
                setWithdrawing(false);
                return;
            }

            const res = await fetch('/api/admin/platform-profits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    currency: withdrawForm.currency,
                    method: withdrawForm.method,
                    notes: withdrawForm.notes,
                    phone: withdrawForm.phone,
                    walletType: withdrawForm.walletType,
                    bankDetails: {
                        bankName: withdrawForm.bankName,
                        accountNumber: withdrawForm.accountNumber,
                        iban: withdrawForm.iban,
                    },
                }),
            });

            const data = await res.json();
            if (data.success) {
                const successMsg = data.recipientName
                    ? `تم التحويل بنجاح إلى ${data.recipientName}! الرقم المرجعي: ${data.referenceNumber}`
                    : `تم السحب بنجاح! الرقم المرجعي: ${data.referenceNumber}`;
                setMessage({ type: 'success', text: successMsg });
                setShowWithdrawModal(false);
                setWithdrawForm({ amount: '', currency: 'USD', method: 'USER_WALLET', notes: '', bankName: '', accountNumber: '', iban: '', phone: '', walletType: 'PERSONAL' });
                fetchStats();
            } else {
                setMessage({ type: 'error', text: data.error || 'حدث خطأ' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'حدث خطأ' });
        }
        setWithdrawing(false);
    };

    const formatCurrency = (amount: number, currency: string) => {
        if (currency === 'SYP') {
            return `${Math.floor(amount).toLocaleString('ar-SY')} ل.س`;
        }
        return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ar-SY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="min-h-screen bg-dark-950 pt-16 lg:pt-0">
            {/* Header */}
            <header className="bg-dark-900/50 backdrop-blur-xl border-b border-dark-800 sticky top-16 lg:top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/admin" className="btn-ghost btn-icon">
                                <ArrowRightIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </Link>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <BanknotesIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">أرباح المنصة</h1>
                                <p className="text-dark-400 text-sm">إدارة وسحب الأرباح</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="input py-2 text-sm"
                            >
                                {PERIOD_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <button onClick={fetchStats} className="btn-ghost btn-icon">
                                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Message */}
                {message && (
                    <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                        {message.text}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <ArrowPathIcon className="w-10 h-10 animate-spin text-primary-500" />
                    </div>
                ) : stats && (
                    <>
                        {/* Available Balance Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* USD Balance */}
                            <div className="card p-6 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-800/50">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
                                        <CurrencyDollarIcon className="w-7 h-7 text-green-400" />
                                    </div>
                                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                                        USD
                                    </span>
                                </div>
                                <p className="text-dark-400 text-sm mb-1">الرصيد المتاح</p>
                                <p className="text-3xl font-bold text-white mb-4">
                                    ${stats.availableBalance.USD.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                </p>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-dark-400">
                                        تم سحب: ${stats.totalWithdrawn.USD.toFixed(2)}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setWithdrawForm(f => ({ ...f, currency: 'USD' }));
                                            setShowWithdrawModal(true);
                                        }}
                                        className="btn-primary py-2 px-4 text-sm"
                                        disabled={stats.availableBalance.USD <= 0}
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4 ml-1" />
                                        سحب
                                    </button>
                                </div>
                            </div>

                            {/* SYP Balance */}
                            <div className="card p-6 bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-800/50">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                                        <BanknotesIcon className="w-7 h-7 text-blue-400" />
                                    </div>
                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                                        SYP
                                    </span>
                                </div>
                                <p className="text-dark-400 text-sm mb-1">الرصيد المتاح</p>
                                <p className="text-3xl font-bold text-white mb-4">
                                    {Math.floor(stats.availableBalance.SYP).toLocaleString('ar-SY')} ل.س
                                </p>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-dark-400">
                                        تم سحب: {Math.floor(stats.totalWithdrawn.SYP).toLocaleString('ar-SY')} ل.س
                                    </span>
                                    <button
                                        onClick={() => {
                                            setWithdrawForm(f => ({ ...f, currency: 'SYP' }));
                                            setShowWithdrawModal(true);
                                        }}
                                        className="btn-primary py-2 px-4 text-sm"
                                        disabled={stats.availableBalance.SYP <= 0}
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4 ml-1" />
                                        سحب
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Period Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="card p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <ArrowTrendingUpIcon className="w-5 h-5 text-primary-500" />
                                    <span className="text-dark-400 text-sm">أرباح USD</span>
                                </div>
                                <p className="text-xl font-bold text-white">
                                    ${stats.periodStats.feesUSD.toFixed(2)}
                                </p>
                            </div>
                            <div className="card p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <ArrowTrendingUpIcon className="w-5 h-5 text-blue-500" />
                                    <span className="text-dark-400 text-sm">أرباح SYP</span>
                                </div>
                                <p className="text-xl font-bold text-white">
                                    {Math.floor(stats.periodStats.feesSYP).toLocaleString('ar-SY')}
                                </p>
                            </div>
                            <div className="card p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <DocumentTextIcon className="w-5 h-5 text-green-500" />
                                    <span className="text-dark-400 text-sm">معاملات USD</span>
                                </div>
                                <p className="text-xl font-bold text-white">
                                    {stats.periodStats.transactionsUSD}
                                </p>
                            </div>
                            <div className="card p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <DocumentTextIcon className="w-5 h-5 text-purple-500" />
                                    <span className="text-dark-400 text-sm">معاملات SYP</span>
                                </div>
                                <p className="text-xl font-bold text-white">
                                    {stats.periodStats.transactionsSYP}
                                </p>
                            </div>
                        </div>

                        {/* Fees Breakdown */}
                        <div className="card p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <ChartBarIcon className="w-5 h-5 text-primary-500" />
                                توزيع الأرباح حسب نوع العملية
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stats.feesByType.map((item, idx) => (
                                    <div key={idx} className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-medium">
                                                {TRANSACTION_TYPE_NAMES[item.type] || item.type}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs ${item.currency === 'USD' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {item.currency}
                                            </span>
                                        </div>
                                        <p className="text-xl font-bold text-primary-400">
                                            {formatCurrency(item.total, item.currency)}
                                        </p>
                                        <p className="text-dark-500 text-sm">
                                            {item.count} معاملة
                                        </p>
                                    </div>
                                ))}
                                {stats.feesByType.length === 0 && (
                                    <p className="text-dark-400 col-span-full text-center py-8">
                                        لا توجد أرباح في هذه الفترة
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Withdrawal History */}
                        <div className="card p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-primary-500" />
                                سجل عمليات السحب
                            </h2>
                            {stats.withdrawals.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-dark-700">
                                                <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">التاريخ</th>
                                                <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">الرقم المرجعي</th>
                                                <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">المبلغ</th>
                                                <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">الطريقة</th>
                                                <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">الحالة</th>
                                                <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">بواسطة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-dark-800">
                                            {stats.withdrawals.map((w) => (
                                                <tr key={w.id} className="hover:bg-dark-800/30">
                                                    <td className="px-4 py-3 text-dark-300 text-sm">
                                                        {formatDate(w.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3 text-white text-sm font-mono">
                                                        {w.referenceNumber}
                                                    </td>
                                                    <td className="px-4 py-3 text-primary-400 font-medium">
                                                        {formatCurrency(w.amount, w.currency)}
                                                    </td>
                                                    <td className="px-4 py-3 text-dark-300 text-sm">
                                                        {w.method === 'USER_WALLET' ? '📱 محفظة مستخدم' : w.method === 'BANK_TRANSFER' ? 'تحويل بنكي' : w.method === 'CASH' ? 'نقداً' : 'عملات رقمية'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${w.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                            {w.status === 'COMPLETED' ? 'مكتمل' : 'معلق'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-dark-400 text-sm">
                                                        {w.admin?.fullNameAr || w.admin?.fullName || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <BanknotesIcon className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                                    <p className="text-dark-400">لا توجد عمليات سحب بعد</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="card p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">سحب الأرباح</h3>
                            <button onClick={() => setShowWithdrawModal(false)} className="btn-ghost btn-icon">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Currency */}
                            <div>
                                <label className="block text-dark-400 text-sm mb-1">العملة</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setWithdrawForm(f => ({ ...f, currency: 'USD' }))}
                                        className={`flex-1 py-3 rounded-xl border transition-all ${withdrawForm.currency === 'USD' ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-dark-700 text-dark-400'}`}
                                    >
                                        <CurrencyDollarIcon className="w-5 h-5 mx-auto mb-1" />
                                        USD
                                    </button>
                                    <button
                                        onClick={() => setWithdrawForm(f => ({ ...f, currency: 'SYP' }))}
                                        className={`flex-1 py-3 rounded-xl border transition-all ${withdrawForm.currency === 'SYP' ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-dark-700 text-dark-400'}`}
                                    >
                                        <BanknotesIcon className="w-5 h-5 mx-auto mb-1" />
                                        SYP
                                    </button>
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-dark-400 text-sm mb-1">المبلغ</label>
                                <input
                                    type="number"
                                    value={withdrawForm.amount}
                                    onChange={(e) => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                                    className="input w-full"
                                    placeholder={withdrawForm.currency === 'USD' ? '$0.00' : '0 ل.س'}
                                />
                                <p className="text-dark-500 text-xs mt-1">
                                    المتاح: {formatCurrency(stats?.availableBalance[withdrawForm.currency as 'USD' | 'SYP'] || 0, withdrawForm.currency)}
                                </p>
                            </div>

                            {/* Method */}
                            <div>
                                <label className="block text-dark-400 text-sm mb-1">طريقة السحب</label>
                                <select
                                    value={withdrawForm.method}
                                    onChange={(e) => setWithdrawForm(f => ({ ...f, method: e.target.value }))}
                                    className="input w-full"
                                >
                                    <option value="USER_WALLET">📱 تحويل لمحفظة مستخدم</option>
                                    <option value="BANK_TRANSFER">🏦 تحويل بنكي</option>
                                    <option value="CASH">💵 نقداً</option>
                                    <option value="CRYPTO">₿ عملات رقمية</option>
                                </select>
                            </div>

                            {/* Phone (if user wallet) */}
                            {withdrawForm.method === 'USER_WALLET' && (
                                <>
                                    <div>
                                        <label className="block text-dark-400 text-sm mb-1">رقم هاتف المستخدم</label>
                                        <input
                                            type="tel"
                                            value={withdrawForm.phone}
                                            onChange={(e) => setWithdrawForm(f => ({ ...f, phone: e.target.value }))}
                                            className="input w-full"
                                            placeholder="+963 9xx xxx xxx"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-dark-400 text-sm mb-1">نوع المحفظة</label>
                                        <select
                                            value={withdrawForm.walletType}
                                            onChange={(e) => setWithdrawForm(f => ({ ...f, walletType: e.target.value }))}
                                            className="input w-full"
                                        >
                                            <option value="PERSONAL">شخصية</option>
                                            <option value="BUSINESS">تجارية</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Bank Details (if bank transfer) */}
                            {withdrawForm.method === 'BANK_TRANSFER' && (
                                <>
                                    <div>
                                        <label className="block text-dark-400 text-sm mb-1">اسم البنك</label>
                                        <input
                                            type="text"
                                            value={withdrawForm.bankName}
                                            onChange={(e) => setWithdrawForm(f => ({ ...f, bankName: e.target.value }))}
                                            className="input w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-dark-400 text-sm mb-1">رقم الحساب / IBAN</label>
                                        <input
                                            type="text"
                                            value={withdrawForm.iban}
                                            onChange={(e) => setWithdrawForm(f => ({ ...f, iban: e.target.value }))}
                                            className="input w-full"
                                            dir="ltr"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="block text-dark-400 text-sm mb-1">ملاحظات (اختياري)</label>
                                <textarea
                                    value={withdrawForm.notes}
                                    onChange={(e) => setWithdrawForm(f => ({ ...f, notes: e.target.value }))}
                                    className="input w-full"
                                    rows={2}
                                />
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleWithdraw}
                                disabled={withdrawing || !withdrawForm.amount}
                                className="btn-primary w-full py-3"
                            >
                                {withdrawing ? (
                                    <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto" />
                                ) : (
                                    <>
                                        <ArrowDownTrayIcon className="w-5 h-5 ml-2" />
                                        تأكيد السحب
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
