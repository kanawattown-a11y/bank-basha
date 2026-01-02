'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    PhoneIcon,
} from '@heroicons/react/24/outline';

interface Order {
    id: string;
    referenceNumber: string;
    amount: number;
    totalAmount: number;
    phoneNumber: string;
    currency: string;
    status: string;
    sellerResponse: string;
    sellerNotes: string | null;
    createdAt: string;
    service: {
        name: string;
        nameAr: string | null;
        imageUrl: string | null;
    };
    user: {
        fullName: string;
        fullNameAr: string | null;
        phone: string;
    };
}

export default function MerchantOrdersPage() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectNotes, setRejectNotes] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        fetchOrders();
    }, [filter]);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`/api/merchant/orders?status=${filter}`);
            const data = await res.json();
            setOrders(data.orders || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
        setLoading(false);
    };

    const handleApprove = async (orderId: string) => {
        setProcessingId(orderId);
        try {
            const res = await fetch(`/api/merchant/orders/${orderId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (res.ok) {
                fetchOrders();
            }
        } catch (error) {
            console.error('Error approving:', error);
        }
        setProcessingId(null);
    };

    const handleReject = async (orderId: string) => {
        if (!rejectNotes.trim()) return;
        setProcessingId(orderId);
        try {
            const res = await fetch(`/api/merchant/orders/${orderId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: rejectNotes }),
            });
            if (res.ok) {
                setShowRejectModal(null);
                setRejectNotes('');
                fetchOrders();
            }
        } catch (error) {
            console.error('Error rejecting:', error);
        }
        setProcessingId(null);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-SY' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            {/* Header */}
            <header className="bg-black/30 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/dashboard" className="text-white/70 hover:text-white">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </Link>
                    <h1 className="text-xl font-bold text-white">📦 {t('merchant.orders.title')}</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { value: 'PENDING', label: t('common.pending'), icon: ClockIcon },
                        { value: 'APPROVED', label: t('common.approved'), icon: CheckCircleIcon },
                        { value: 'REJECTED', label: t('common.rejected'), icon: XCircleIcon },
                        { value: 'ALL', label: t('common.all'), icon: null },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition whitespace-nowrap ${filter === tab.value
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                                }`}
                        >
                            {tab.icon && <tab.icon className="w-5 h-5" />}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Orders List */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 text-white/50">
                        <p className="text-2xl mb-2">📭</p>
                        <p>{t('common.noData')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-white font-bold text-lg">
                                            {order.currency === 'SYP' ? 'ل.س' : '$'}{order.amount.toFixed(2)}
                                        </p>
                                        <p className="text-white/50 text-sm">
                                            {locale === 'ar' ? (order.service.nameAr || order.service.name) : order.service.name}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${order.sellerResponse === 'PENDING'
                                            ? 'bg-yellow-500/20 text-yellow-300'
                                            : order.sellerResponse === 'APPROVED'
                                                ? 'bg-green-500/20 text-green-300'
                                                : 'bg-red-500/20 text-red-300'
                                            }`}
                                    >
                                        {order.sellerResponse === 'PENDING'
                                            ? t('common.pending')
                                            : order.sellerResponse === 'APPROVED'
                                                ? t('common.approved')
                                                : t('common.rejected')}
                                    </span>
                                </div>

                                {/* Phone Number */}
                                <div className="flex items-center gap-2 mb-3 bg-white/5 rounded-lg px-3 py-2">
                                    <PhoneIcon className="w-5 h-5 text-purple-400" />
                                    <span className="text-white font-mono text-lg">
                                        {order.phoneNumber}
                                    </span>
                                </div>

                                {/* Customer Info */}
                                <div className="flex justify-between text-sm text-white/50 mb-4">
                                    <span>{t('common.name')}: {locale === 'ar' ? (order.user.fullNameAr || order.user.fullName) : order.user.fullName}</span>
                                    <span>{formatDate(order.createdAt)}</span>
                                </div>

                                {/* Action Buttons */}
                                {order.sellerResponse === 'PENDING' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(order.id)}
                                            disabled={processingId === order.id}
                                            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold transition disabled:opacity-50"
                                        >
                                            <CheckCircleIcon className="w-5 h-5" />
                                            {t('common.approved')}
                                        </button>
                                        <button
                                            onClick={() => setShowRejectModal(order.id)}
                                            disabled={processingId === order.id}
                                            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition disabled:opacity-50"
                                        >
                                            <XCircleIcon className="w-5 h-5" />
                                            {t('common.rejected')}
                                        </button>
                                    </div>
                                )}

                                {/* Seller Notes */}
                                {order.sellerNotes && (
                                    <div className="mt-3 p-3 bg-white/5 rounded-lg">
                                        <p className="text-white/70 text-sm">
                                            <span className="font-medium">{t('common.note')}:</span> {order.sellerNotes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-4">{t('common.description')}</h3>
                        <textarea
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder={locale === 'ar' ? 'مثال: لا يوجد رصيد متاح حالياً...' : 'Example: No balance available currently...'}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                            rows={3}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleReject(showRejectModal)}
                                disabled={!rejectNotes.trim() || processingId === showRejectModal}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition disabled:opacity-50"
                            >
                                {t('common.confirm')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectNotes('');
                                }}
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
