'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface TransactionDetail {
    id: string;
    referenceNumber: string;
    type: string;
    status: string;
    amount: number;
    fee: number;
    platformFee: number;
    agentFee: number;
    netAmount: number;
    description: string;
    descriptionAr: string;
    createdAt: string;
    completedAt: string | null;
    sender: {
        id: string;
        fullName: string;
        phone: string;
        userType: string;
        hasMerchantAccount?: boolean;
    } | null;
    receiver: {
        id: string;
        fullName: string;
        phone: string;
        userType: string;
        hasMerchantAccount?: boolean;
    } | null;
}

export default function AdminTransactionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const transactionId = params.id as string;

    const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTransaction();
    }, [transactionId]);

    const fetchTransaction = async () => {
        try {
            const response = await fetch(`/api/admin/transactions/${transactionId}`);
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const data = await response.json();
            setTransaction(data.transaction);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(new Date(dateString));
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <span className="badge-success">مكتمل</span>;
            case 'PENDING':
                return <span className="badge-warning">معلق</span>;
            case 'FAILED':
                return <span className="badge-error">فشل</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'DEPOSIT': return 'إيداع';
            case 'WITHDRAW': return 'سحب';
            case 'TRANSFER': return 'تحويل';
            case 'QR_PAYMENT': return 'دفع QR';
            case 'CREDIT_GRANT': return 'منح ائتمان';
            default: return type;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    if (!transaction) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-dark-300">المعاملة غير موجودة</p>
                    <Link href="/admin/transactions" className="btn-primary mt-4">
                        العودة للمعاملات
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/transactions" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </Link>
                        <DocumentTextIcon className="w-8 h-8 text-primary-500" />
                        <div>
                            <h1 className="text-xl font-bold text-white">تفاصيل المعاملة</h1>
                            <p className="text-sm text-dark-400">{transaction.referenceNumber}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Status & Type */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-dark-400 text-sm mb-1">نوع العملية</p>
                                <p className="text-2xl font-bold text-white">{getTypeLabel(transaction.type)}</p>
                            </div>
                            <div className="text-end">
                                <p className="text-dark-400 text-sm mb-1">الحالة</p>
                                {getStatusBadge(transaction.status)}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-dark-400 text-sm">رقم المرجع</p>
                                <p className="text-white font-mono">{transaction.referenceNumber}</p>
                            </div>
                            <div>
                                <p className="text-dark-400 text-sm">تاريخ الإنشاء</p>
                                <p className="text-white">{formatDate(transaction.createdAt)}</p>
                            </div>
                            {transaction.completedAt && (
                                <div>
                                    <p className="text-dark-400 text-sm">تاريخ الإتمام</p>
                                    <p className="text-white">{formatDate(transaction.completedAt)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Amount Details */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">تفاصيل المبالغ</h3>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center pb-3 border-b border-dark-800">
                                <span className="text-dark-300">المبلغ الأساسي</span>
                                <span className="text-xl font-bold text-white">${formatAmount(transaction.amount)}</span>
                            </div>

                            {transaction.fee > 0 && (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-dark-300">رسوم المنصة</span>
                                        <span className="text-red-400">${formatAmount(transaction.platformFee)}</span>
                                    </div>

                                    {transaction.agentFee > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-dark-300">عمولة الوكيل</span>
                                            <span className="text-red-400">${formatAmount(transaction.agentFee)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pb-3 border-b border-dark-800">
                                        <span className="text-dark-300">إجمالي الرسوم</span>
                                        <span className="text-red-400">${formatAmount(transaction.fee)}</span>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-lg font-semibold text-white">صافي المبلغ</span>
                                <span className="text-2xl font-bold text-green-400">${formatAmount(transaction.netAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Parties */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Sender */}
                        {transaction.sender && (
                            <div className="card p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">المُرسل</h3>
                                <Link
                                    href={`/admin/users/${transaction.sender.id}`}
                                    className="block hover:bg-dark-800/50 -m-2 p-2 rounded-lg transition-colors"
                                >
                                    <p className="text-white font-medium mb-1">{transaction.sender.fullName}</p>
                                    <p className="text-dark-400 text-sm mb-2">{transaction.sender.phone}</p>
                                    {transaction.sender.userType === 'AGENT' ? (
                                        <span className="badge badge-primary">وكيل</span>
                                    ) : transaction.sender.hasMerchantAccount ? (
                                        <span className="badge badge-purple">حساب بزنس</span>
                                    ) : (
                                        <span className="badge">مستخدم</span>
                                    )}
                                </Link>
                            </div>
                        )}

                        {/* Receiver */}
                        {transaction.receiver && (
                            <div className="card p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">المُستلم</h3>
                                <Link
                                    href={`/admin/users/${transaction.receiver.id}`}
                                    className="block hover:bg-dark-800/50 -m-2 p-2 rounded-lg transition-colors"
                                >
                                    <p className="text-white font-medium mb-1">{transaction.receiver.fullName}</p>
                                    <p className="text-dark-400 text-sm mb-2">{transaction.receiver.phone}</p>
                                    {transaction.receiver.userType === 'AGENT' ? (
                                        <span className="badge badge-primary">وكيل</span>
                                    ) : transaction.receiver.hasMerchantAccount ? (
                                        <span className="badge badge-purple">حساب بزنس</span>
                                    ) : (
                                        <span className="badge">مستخدم</span>
                                    )}
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {(transaction.description || transaction.descriptionAr) && (
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">الوصف</h3>
                            <p className="text-dark-300">{transaction.descriptionAr || transaction.description}</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
