'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    PhoneIcon,
    UserIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface PasswordResetRequest {
    id: string;
    ticketNumber: string;
    status: string;
    message: string | null;
    createdAt: string;
    expiresAt: string;
    user: {
        id: string;
        fullName: string;
        phone: string;
        email: string | null;
        status: string;
    };
}

export default function PasswordRequestsPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING');
    const [processing, setProcessing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const fetchRequests = async () => {
        try {
            const url = filter === 'ALL'
                ? '/api/admin/password-requests'
                : `/api/admin/password-requests?status=${filter}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('هل تريد الموافقة على هذا الطلب؟ سيتمكن المستخدم من إعادة تعيين كلمة المرور.')) return;

        setProcessing(id);
        try {
            const response = await fetch(`/api/admin/password-requests/${id}/approve`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                alert(`تمت الموافقة! رابط إعادة التعيين:\n${data.resetLink}`);
                fetchRequests();
            } else {
                const data = await response.json();
                alert(data.error || 'حدث خطأ');
            }
        } catch (error) {
            alert('حدث خطأ في الموافقة');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('سبب الرفض:');
        if (!reason) return;

        setProcessing(id);
        try {
            const response = await fetch(`/api/admin/password-requests/${id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });

            if (response.ok) {
                alert('تم رفض الطلب');
                fetchRequests();
            } else {
                const data = await response.json();
                alert(data.error || 'حدث خطأ');
            }
        } catch (error) {
            alert('حدث خطأ');
        } finally {
            setProcessing(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs">معلق</span>;
            case 'APPROVED':
                return <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs">تمت الموافقة</span>;
            case 'REJECTED':
                return <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs">مرفوض</span>;
            case 'USED':
                return <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs">مستخدم</span>;
            case 'EXPIRED':
                return <span className="px-2 py-1 rounded-lg bg-gray-500/20 text-gray-400 text-xs">منتهي</span>;
            default:
                return <span className="px-2 py-1 rounded-lg bg-dark-700 text-dark-400 text-xs">{status}</span>;
        }
    };

    const filteredRequests = requests.filter(req =>
        req.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.user.phone.includes(searchQuery) ||
        req.ticketNumber.includes(searchQuery)
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-lg sm:text-xl font-bold text-white">طلبات استعادة كلمة المرور</h1>
                    </div>
                </div>
            </header>

            <main className="pt-20 pb-8 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {['PENDING', 'APPROVED', 'REJECTED', 'USED', 'ALL'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === status
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                        }`}
                                >
                                    {status === 'ALL' ? 'الكل' :
                                        status === 'PENDING' ? 'معلق' :
                                            status === 'APPROVED' ? 'موافق عليه' :
                                                status === 'REJECTED' ? 'مرفوض' : 'مستخدم'}
                                </button>
                            ))}
                        </div>

                        <div className="relative flex-1 min-w-[200px]">
                            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                            <input
                                type="text"
                                placeholder="بحث بالاسم أو الهاتف أو رقم الطلب..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-field pr-10 w-full"
                            />
                        </div>
                    </div>

                    {/* Requests List */}
                    {filteredRequests.length === 0 ? (
                        <div className="card p-12 text-center">
                            <ClockIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                            <p className="text-dark-400">لا توجد طلبات</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredRequests.map((request) => (
                                <div key={request.id} className="card p-6">
                                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-dark-400 text-sm">#{request.ticketNumber}</span>
                                                {getStatusBadge(request.status)}
                                            </div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <UserIcon className="w-5 h-5 text-dark-500" />
                                                <span className="text-white font-medium">{request.user.fullName}</span>
                                                {request.user.status !== 'ACTIVE' && (
                                                    <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">
                                                        {request.user.status}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-dark-400 text-sm">
                                                <PhoneIcon className="w-4 h-4" />
                                                <span dir="ltr">{request.user.phone}</span>
                                            </div>
                                        </div>

                                        <div className="text-right text-sm text-dark-500">
                                            <p>تاريخ الطلب: {new Date(request.createdAt).toLocaleDateString('ar-SA')}</p>
                                            <p>ينتهي: {new Date(request.expiresAt).toLocaleDateString('ar-SA')}</p>
                                        </div>
                                    </div>

                                    {request.message && (
                                        <div className="bg-dark-800/50 rounded-lg p-3 mb-4">
                                            <p className="text-dark-300 text-sm">{request.message}</p>
                                        </div>
                                    )}

                                    {request.status === 'PENDING' && (
                                        <div className="flex gap-3 pt-4 border-t border-dark-700">
                                            <button
                                                onClick={() => handleApprove(request.id)}
                                                disabled={processing === request.id}
                                                className="btn-primary flex-1 sm:flex-none"
                                            >
                                                {processing === request.id ? (
                                                    <div className="spinner w-5 h-5"></div>
                                                ) : (
                                                    <>
                                                        <CheckCircleIcon className="w-5 h-5" />
                                                        موافقة
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleReject(request.id)}
                                                disabled={processing === request.id}
                                                className="btn-ghost text-red-500 border border-red-500/30 flex-1 sm:flex-none"
                                            >
                                                <XCircleIcon className="w-5 h-5" />
                                                رفض
                                            </button>
                                            <Link
                                                href={`/admin/users/${request.user.id}`}
                                                className="btn-ghost border border-dark-600 flex-1 sm:flex-none"
                                            >
                                                عرض المستخدم
                                            </Link>
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
