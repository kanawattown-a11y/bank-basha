'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    PhoneIcon,
    CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface Order {
    id: string;
    referenceNumber: string;
    status: string;
    amount: number;
    totalAmount: number;
    netAmount: number;
    fee: number;
    currency: string; // NEW: Currency field
    phoneNumber: string;
    userInput?: string;
    sellerResponse?: string;
    createdAt: string;
    completedAt?: string;
    service: {
        id: string;
        name: string;
        nameAr: string | null;
        price: number;
    };
    user: {
        id: string;
        fullName: string;
        fullNameAr: string | null;
        phone: string;
    };
}

interface Stats {
    pending: number;
    completed: number;
    cancelled: number;
    total: number;
    totalEarnings: number;
}

export default function MyOrdersPage() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<Stats>({ pending: 0, completed: 0, cancelled: 0, total: 0, totalEarnings: 0 });
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('ALL');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        setMounted(true);
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/user/orders');
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
                setStats(data.stats || { pending: 0, completed: 0, cancelled: 0, total: 0, totalEarnings: 0 });
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    const handleAction = async (orderId: string, action: 'complete' | 'cancel') => {
        setProcessingId(orderId);
        setMessage(null);

        try {
            const res = await fetch('/api/user/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, action }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                fetchOrders();
            } else {
                setMessage({ type: 'error', text: data.error || 'حدث خطأ' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'خطأ في الاتصال' });
        }

        setProcessingId(null);
        setTimeout(() => setMessage(null), 3000);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-yellow-500/10 text-yellow-400">
                        <ClockIcon className="w-4 h-4" />
                        قيد الانتظار
                    </span>
                );
            case 'COMPLETED':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-green-500/10 text-green-400">
                        <CheckCircleIcon className="w-4 h-4" />
                        مكتمل
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-red-500/10 text-red-400">
                        <XCircleIcon className="w-4 h-4" />
                        ملغي
                    </span>
                );
            default:
                return null;
        }
    };

    const filteredOrders = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

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
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href="/dashboard/settings/my-services" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-lg sm:text-xl font-bold text-white">📦 طلباتي الواردة</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <div className="card p-4 text-center">
                            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                            <p className="text-dark-400 text-xs">قيد الانتظار</p>
                        </div>
                        <div className="card p-4 text-center">
                            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                            <p className="text-dark-400 text-xs">مكتمل</p>
                        </div>
                        <div className="card p-4 text-center">
                            <p className="text-2xl font-bold text-red-400">{stats.cancelled}</p>
                            <p className="text-dark-400 text-xs">ملغي</p>
                        </div>
                        <div className="card p-4 text-center">
                            <p className="text-2xl font-bold text-primary-400">
                                {stats.totalEarnings > 0 ? stats.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0'}
                            </p>
                            <p className="text-dark-400 text-xs">الأرباح (الإجمالي)</p>
                        </div>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className={`p-4 rounded-xl mb-4 ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {(['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === status
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                    }`}
                            >
                                {status === 'ALL' ? 'الكل' :
                                    status === 'PENDING' ? 'قيد الانتظار' :
                                        status === 'COMPLETED' ? 'مكتمل' : 'ملغي'}
                            </button>
                        ))}
                    </div>

                    {/* Orders List */}
                    {filteredOrders.length === 0 ? (
                        <div className="card p-12 text-center">
                            <p className="text-dark-400 mb-2">لا توجد طلبات {filter !== 'ALL' && 'في هذا التصنيف'}</p>
                            <Link href="/dashboard/settings/my-services" className="text-primary-500 text-sm">
                                ← العودة للخدمات
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrders.map((order) => (
                                <div key={order.id} className="card p-5">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="text-dark-400 text-xs mb-1">#{order.referenceNumber}</p>
                                            <h3 className="text-white font-semibold">
                                                {order.service.nameAr || order.service.name}
                                            </h3>
                                        </div>
                                        {getStatusBadge(order.status)}
                                    </div>

                                    {/* Details */}
                                    <div className="bg-dark-800/50 rounded-xl p-3 mb-3 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-dark-400 flex items-center gap-1">
                                                <PhoneIcon className="w-4 h-4" />
                                                الرقم
                                            </span>
                                            <span className="text-white font-mono">{order.phoneNumber}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-dark-400 flex items-center gap-1">
                                                <CurrencyDollarIcon className="w-4 h-4" />
                                                المبلغ
                                            </span>
                                            <span className="text-primary-500 font-bold">
                                                {order.currency === 'SYP' ? 'ل.س' : '$'}{order.totalAmount.toFixed(order.currency === 'SYP' ? 0 : 2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-dark-400">صافي ربحك</span>
                                            <span className="text-green-400 font-bold">
                                                {order.currency === 'SYP' ? 'ل.س' : '$'}{order.netAmount.toFixed(order.currency === 'SYP' ? 0 : 2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-dark-400">المشتري</span>
                                            <span className="text-white">{order.user.fullNameAr || order.user.fullName}</span>
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <p className="text-dark-500 text-xs mb-3">
                                        {new Date(order.createdAt).toLocaleString('ar-SA')}
                                    </p>

                                    {/* Actions for pending orders */}
                                    {order.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAction(order.id, 'complete')}
                                                disabled={processingId === order.id}
                                                className="flex-1 btn-primary py-2 text-sm flex items-center justify-center gap-2"
                                            >
                                                {processingId === order.id ? (
                                                    <div className="spinner w-4 h-4"></div>
                                                ) : (
                                                    <>
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                        تم التنفيذ
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleAction(order.id, 'cancel')}
                                                disabled={processingId === order.id}
                                                className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 py-2 rounded-xl text-sm flex items-center justify-center gap-2"
                                            >
                                                <XCircleIcon className="w-4 h-4" />
                                                إلغاء وإرجاع
                                            </button>
                                        </div>
                                    )}

                                    {/* Response for completed/cancelled */}
                                    {order.sellerResponse && order.status !== 'PENDING' && (
                                        <div className={`mt-3 p-2 rounded-lg text-xs ${order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {order.sellerResponse}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
