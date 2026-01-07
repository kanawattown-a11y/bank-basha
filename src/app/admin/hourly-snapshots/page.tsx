'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowRightIcon,
    ArrowPathIcon,
    ClockIcon,
    CheckCircleIcon,
    ShieldCheckIcon,
    CurrencyDollarIcon,
    BanknotesIcon,
    CloudArrowUpIcon,
} from '@heroicons/react/24/outline';

interface HourlySnapshot {
    id: string;
    snapshotHour: string;
    totalWalletsUSD: number;
    totalWalletsSYP: number;
    totalAgentCredit: number;
    totalAgentCreditSYP: number;
    totalAgentCash: number;
    totalAgentCashSYP: number;
    systemReserveUSD: number;
    systemReserveSYP: number;
    feesCollectedUSD: number;
    feesCollectedSYP: number;
    walletCount: number;
    agentCount: number;
    checksum: string;
    createdAt: string;
}

export default function HourlySnapshotsPage() {
    const [snapshots, setSnapshots] = useState<HourlySnapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchSnapshots = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/cron/hourly-snapshot?hours=48');
            const data = await res.json();
            setSnapshots(data.snapshots || []);
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    const createSnapshot = async () => {
        setCreating(true);
        setMessage(null);
        try {
            const res = await fetch('/api/cron/hourly-snapshot', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: `✅ تم إنشاء الـ Snapshot بنجاح! ${data.snapshot.walletCount} محفظة` });
                fetchSnapshots();
            } else {
                setMessage({ type: 'success', text: data.message || 'Snapshot موجود لهذه الساعة' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'حدث خطأ' });
        }
        setCreating(false);
    };

    useEffect(() => {
        fetchSnapshots();
    }, []);

    const formatAmount = (amount: number, currency: string) => {
        if (currency === 'SYP') {
            return `${Math.floor(amount).toLocaleString('ar-SY')} ل.س`;
        }
        return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('ar-SY', {
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
                                <ArrowRightIcon className="w-5 h-5" />
                            </Link>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <ClockIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Hourly Snapshots</h1>
                                <p className="text-dark-400 text-sm">نسخ احتياطية للأرصدة كل ساعة</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchSnapshots} className="btn-ghost btn-icon">
                                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={createSnapshot}
                                disabled={creating}
                                className="btn-primary"
                            >
                                {creating ? (
                                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CloudArrowUpIcon className="w-5 h-5 ml-2" />
                                        إنشاء Snapshot الآن
                                    </>
                                )}
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

                {/* Info Card */}
                <div className="card p-4 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border-purple-800/50">
                    <div className="flex items-start gap-3">
                        <ShieldCheckIcon className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-white font-medium mb-1">نظام النسخ الاحتياطي التلقائي</h3>
                            <p className="text-dark-400 text-sm">
                                يتم حفظ نسخة من جميع الأرصدة (المحافظ، الوكلاء، الحسابات الداخلية) كل ساعة مع SHA-256 checksum لضمان سلامة البيانات.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Latest Snapshot Summary */}
                {snapshots.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                                <span className="text-dark-400 text-sm">إجمالي المحافظ USD</span>
                            </div>
                            <p className="text-xl font-bold text-white">
                                {formatAmount(snapshots[0].totalWalletsUSD, 'USD')}
                            </p>
                        </div>
                        <div className="card p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <BanknotesIcon className="w-5 h-5 text-blue-500" />
                                <span className="text-dark-400 text-sm">إجمالي المحافظ SYP</span>
                            </div>
                            <p className="text-xl font-bold text-white">
                                {formatAmount(snapshots[0].totalWalletsSYP, 'SYP')}
                            </p>
                        </div>
                        <div className="card p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-dark-400 text-sm">عدد المحافظ</span>
                            </div>
                            <p className="text-xl font-bold text-white">{snapshots[0].walletCount}</p>
                        </div>
                        <div className="card p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-dark-400 text-sm">عدد الوكلاء</span>
                            </div>
                            <p className="text-xl font-bold text-white">{snapshots[0].agentCount}</p>
                        </div>
                    </div>
                )}

                {/* Snapshots Table */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">سجل النسخ الاحتياطية</h2>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <ArrowPathIcon className="w-10 h-10 animate-spin text-primary-500" />
                        </div>
                    ) : snapshots.length === 0 ? (
                        <div className="text-center py-12">
                            <ClockIcon className="w-16 h-16 text-dark-600 mx-auto mb-3" />
                            <p className="text-dark-400">لا توجد نسخ احتياطية بعد</p>
                            <button onClick={createSnapshot} className="btn-primary mt-4">
                                إنشاء أول Snapshot
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-dark-700">
                                        <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">الوقت</th>
                                        <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">المحافظ USD</th>
                                        <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">المحافظ SYP</th>
                                        <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">الوكلاء</th>
                                        <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">الأرباح</th>
                                        <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">Checksum</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-800">
                                    {snapshots.map((s) => (
                                        <tr key={s.id} className="hover:bg-dark-800/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                                    <span className="text-white text-sm">{formatDate(s.snapshotHour)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-green-400 font-medium">
                                                {formatAmount(s.totalWalletsUSD, 'USD')}
                                            </td>
                                            <td className="px-4 py-3 text-blue-400 font-medium">
                                                {formatAmount(s.totalWalletsSYP, 'SYP')}
                                            </td>
                                            <td className="px-4 py-3 text-dark-300">
                                                ${s.totalAgentCredit.toFixed(0)} رصيد
                                            </td>
                                            <td className="px-4 py-3 text-primary-400">
                                                ${s.feesCollectedUSD.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <code className="text-xs text-dark-500 bg-dark-800 px-2 py-1 rounded">
                                                    {s.checksum.substring(0, 12)}...
                                                </code>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Cron Setup Info */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">⚙️ إعداد التشغيل التلقائي</h3>
                    <p className="text-dark-400 mb-4">لتشغيل النسخ الاحتياطي تلقائياً كل ساعة، أضف هذا الأمر في crontab:</p>
                    <pre className="bg-dark-800 p-4 rounded-xl text-sm overflow-x-auto">
                        <code className="text-green-400">
                            {`# Hourly Balance Snapshot
0 * * * * curl -X POST https://bankbasha.com/api/cron/hourly-snapshot \\
  -H "x-cron-secret: YOUR_CRON_SECRET"`}
                        </code>
                    </pre>
                    <p className="text-dark-500 text-xs mt-3">
                        أضف CRON_SECRET في ملف .env على السيرفر
                    </p>
                </div>
            </main>
        </div>
    );
}
