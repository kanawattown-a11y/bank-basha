'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
    ArrowRightIcon,
    ArrowLeftIcon,
    DocumentTextIcon,
    UserIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    PencilIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    PrinterIcon,
    DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

interface Contract {
    id: string;
    contractNumber: string;
    type: string;
    title: string;
    titleAr: string | null;
    status: string;
    startDate: string;
    endDate: string | null;
    fileUrl: string | null;
    depositCommission: number | null;
    withdrawCommission: number | null;
    creditLimit: number | null;
    clauses: string | null;
    customTerms: string | null;
    notes: string | null;
    signedByAgent: boolean;
    signedByAdmin: boolean;
    agentSignedAt: string | null;
    adminSignedAt: string | null;
    terminatedAt: string | null;
    terminatedBy: string | null;
    terminationReason: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    agent: {
        id: string;
        agentCode: string;
        businessName: string;
        businessNameAr: string | null;
        businessAddress: string;
        user: {
            id: string;
            fullName: string;
            fullNameAr: string | null;
            phone: string;
            email: string | null;
            city: string | null;
        };
    };
}

interface Clause {
    title: string;
    titleAr: string;
    content: string;
    contentAr: string;
}

export default function ContractDetailPage() {
    const t = useTranslations();
    const router = useRouter();
    const params = useParams();
    const currentLocale = useLocale();
    const isRtl = currentLocale === 'ar';
    const contractId = params.id as string;

    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (contractId) {
            fetchContract();
        }
    }, [contractId]);

    const fetchContract = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/contracts/${contractId}`);
            const data = await res.json();
            if (res.ok) {
                setContract(data.contract);
            }
        } catch (error) {
            console.error('Error fetching contract:', error);
        }
        setLoading(false);
    };

    const updateStatus = async (newStatus: string, reason?: string) => {
        setUpdating(true);
        try {
            const res = await fetch(`/api/admin/contracts/${contractId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    terminationReason: reason,
                }),
            });
            if (res.ok) {
                fetchContract();
            }
        } catch (error) {
            console.error('Error updating contract:', error);
        }
        setUpdating(false);
    };

    const toggleSignature = async (type: 'admin' | 'agent') => {
        setUpdating(true);
        try {
            const field = type === 'admin' ? 'signedByAdmin' : 'signedByAgent';
            const currentValue = type === 'admin' ? contract?.signedByAdmin : contract?.signedByAgent;

            const res = await fetch(`/api/admin/contracts/${contractId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: !currentValue }),
            });
            if (res.ok) {
                fetchContract();
            }
        } catch (error) {
            console.error('Error updating signature:', error);
        }
        setUpdating(false);
    };

    const deleteContract = async () => {
        if (!confirm('هل أنت متأكد من حذف هذا العقد نهائياً؟')) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/contracts/${contractId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                router.push('/admin/contracts');
            }
        } catch (error) {
            console.error('Error deleting contract:', error);
        }
        setDeleting(false);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString(isRtl ? 'ar-SY' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-500/10 text-green-500 border-green-500/30';
            case 'DRAFT': return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
            case 'PENDING_SIGNATURE': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
            case 'EXPIRED': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
            case 'TERMINATED': return 'bg-red-500/10 text-red-500 border-red-500/30';
            case 'CANCELLED': return 'bg-red-500/10 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            DRAFT: 'مسودة',
            PENDING_SIGNATURE: 'بانتظار التوقيع',
            ACTIVE: 'نشط',
            EXPIRED: 'منتهي',
            TERMINATED: 'ملغي',
            CANCELLED: 'ملغي',
        };
        return labels[status] || status;
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            AGENT_AGREEMENT: 'عقد وكالة',
            NDA: 'اتفاقية سرية',
            SERVICE_AGREEMENT: 'اتفاقية خدمة',
            AMENDMENT: 'ملحق تعديل',
        };
        return labels[type] || type;
    };

    const parseClauses = (): Clause[] => {
        if (!contract?.clauses) return [];
        try {
            return JSON.parse(contract.clauses);
        } catch {
            return [];
        }
    };

    if (!mounted) return null;

    const BackIcon = isRtl ? ArrowRightIcon : ArrowLeftIcon;

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="text-center">
                    <DocumentDuplicateIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">العقد غير موجود</h2>
                    <Link href="/admin/contracts" className="btn-primary mt-4">
                        العودة للعقود
                    </Link>
                </div>
            </div>
        );
    }

    const clauses = parseClauses();

    return (
        <div className="min-h-screen bg-dark-950 pt-16 lg:pt-0">
            {/* Header */}
            <header className="bg-dark-900/50 backdrop-blur-xl border-b border-dark-800 sticky top-16 lg:top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/contracts" className="btn-ghost btn-icon">
                                <BackIcon className="w-5 h-5" />
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                                    <DocumentTextIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">{contract.titleAr || contract.title}</h1>
                                    <p className="text-dark-400 text-sm font-mono">{contract.contractNumber}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {contract.fileUrl && (
                                <a
                                    href={contract.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                    تحميل PDF
                                </a>
                            )}
                            <button
                                onClick={deleteContract}
                                disabled={deleting}
                                className="btn-ghost text-red-500"
                            >
                                {deleting ? <div className="spinner w-5 h-5"></div> : <TrashIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Status Card */}
                <div className={`card p-6 border-2 ${getStatusColor(contract.status)}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {contract.status === 'ACTIVE' && <CheckCircleIcon className="w-10 h-10 text-green-500" />}
                            {contract.status === 'PENDING_SIGNATURE' && <ClockIcon className="w-10 h-10 text-yellow-500" />}
                            {contract.status === 'DRAFT' && <DocumentTextIcon className="w-10 h-10 text-gray-400" />}
                            {['TERMINATED', 'CANCELLED', 'EXPIRED'].includes(contract.status) && <XCircleIcon className="w-10 h-10 text-red-500" />}

                            <div>
                                <h2 className="text-xl font-bold text-white">{getStatusLabel(contract.status)}</h2>
                                <p className="text-dark-400">{getTypeLabel(contract.type)}</p>
                            </div>
                        </div>

                        {/* Status Actions */}
                        <div className="flex flex-wrap gap-2">
                            {contract.status === 'DRAFT' && (
                                <button
                                    onClick={() => updateStatus('PENDING_SIGNATURE')}
                                    disabled={updating}
                                    className="btn-primary text-sm"
                                >
                                    إرسال للتوقيع
                                </button>
                            )}
                            {contract.status === 'PENDING_SIGNATURE' && (
                                <button
                                    onClick={() => updateStatus('ACTIVE')}
                                    disabled={updating}
                                    className="btn-primary text-sm"
                                >
                                    تفعيل العقد
                                </button>
                            )}
                            {['ACTIVE', 'PENDING_SIGNATURE'].includes(contract.status) && (
                                <button
                                    onClick={() => {
                                        const reason = prompt('سبب الإلغاء (اختياري):');
                                        updateStatus('TERMINATED', reason || undefined);
                                    }}
                                    disabled={updating}
                                    className="btn-ghost text-red-500 text-sm"
                                >
                                    إلغاء العقد
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column - Agent & Dates */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Agent Info */}
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-primary-500" />
                                بيانات الوكيل
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-dark-400 text-sm">الاسم</p>
                                    <p className="text-white font-medium">{contract.agent.user.fullNameAr || contract.agent.user.fullName}</p>
                                </div>
                                <div>
                                    <p className="text-dark-400 text-sm">النشاط التجاري</p>
                                    <p className="text-white">{contract.agent.businessNameAr || contract.agent.businessName}</p>
                                </div>
                                <div>
                                    <p className="text-dark-400 text-sm">كود الوكيل</p>
                                    <p className="text-white font-mono">{contract.agent.agentCode}</p>
                                </div>
                                <div>
                                    <p className="text-dark-400 text-sm">الهاتف</p>
                                    <p className="text-white font-mono">{contract.agent.user.phone}</p>
                                </div>
                                {contract.agent.user.city && (
                                    <div>
                                        <p className="text-dark-400 text-sm">المدينة</p>
                                        <p className="text-white">{contract.agent.user.city}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-primary-500" />
                                تواريخ العقد
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-dark-400 text-sm">تاريخ البداية</p>
                                    <p className="text-white">{formatDate(contract.startDate)}</p>
                                </div>
                                {contract.endDate && (
                                    <div>
                                        <p className="text-dark-400 text-sm">تاريخ الانتهاء</p>
                                        <p className="text-white">{formatDate(contract.endDate)}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-dark-400 text-sm">تاريخ الإنشاء</p>
                                    <p className="text-white">{formatDate(contract.createdAt)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">التوقيعات</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${contract.signedByAdmin ? 'bg-green-500/10' : 'bg-dark-700'}`}>
                                            {contract.signedByAdmin ?
                                                <CheckCircleIcon className="w-6 h-6 text-green-500" /> :
                                                <ClockIcon className="w-6 h-6 text-dark-500" />
                                            }
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">توقيع الإدارة</p>
                                            {contract.adminSignedAt && (
                                                <p className="text-dark-400 text-xs">{formatDate(contract.adminSignedAt)}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleSignature('admin')}
                                        disabled={updating}
                                        className="btn-ghost text-xs"
                                    >
                                        {contract.signedByAdmin ? 'إلغاء' : 'توقيع'}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${contract.signedByAgent ? 'bg-green-500/10' : 'bg-dark-700'}`}>
                                            {contract.signedByAgent ?
                                                <CheckCircleIcon className="w-6 h-6 text-green-500" /> :
                                                <ClockIcon className="w-6 h-6 text-dark-500" />
                                            }
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">توقيع الوكيل</p>
                                            {contract.agentSignedAt && (
                                                <p className="text-dark-400 text-xs">{formatDate(contract.agentSignedAt)}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleSignature('agent')}
                                        disabled={updating}
                                        className="btn-ghost text-xs"
                                    >
                                        {contract.signedByAgent ? 'إلغاء' : 'تأكيد'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Financial Terms */}
                        {(contract.depositCommission || contract.withdrawCommission || contract.creditLimit) && (
                            <div className="card p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">الشروط المالية</h3>
                                <div className="space-y-3">
                                    {contract.depositCommission !== null && (
                                        <div className="flex justify-between">
                                            <span className="text-dark-400">عمولة الإيداع</span>
                                            <span className="text-white font-medium">{contract.depositCommission}%</span>
                                        </div>
                                    )}
                                    {contract.withdrawCommission !== null && (
                                        <div className="flex justify-between">
                                            <span className="text-dark-400">عمولة السحب</span>
                                            <span className="text-white font-medium">{contract.withdrawCommission}%</span>
                                        </div>
                                    )}
                                    {contract.creditLimit !== null && (
                                        <div className="flex justify-between">
                                            <span className="text-dark-400">حد الائتمان</span>
                                            <span className="text-white font-medium">${contract.creditLimit.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Clauses */}
                    <div className="lg:col-span-2">
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5 text-primary-500" />
                                بنود العقد
                            </h3>

                            {clauses.length > 0 ? (
                                <div className="space-y-6">
                                    {clauses.map((clause, index) => (
                                        <div key={index} className="border-b border-dark-800 pb-6 last:border-0 last:pb-0">
                                            <h4 className="text-primary-500 font-semibold mb-2">
                                                البند {index + 1}: {clause.titleAr || clause.title}
                                            </h4>
                                            <p className="text-dark-300 leading-relaxed whitespace-pre-wrap">
                                                {clause.contentAr || clause.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-dark-400 text-center py-8">لم يتم إضافة بنود لهذا العقد</p>
                            )}
                        </div>

                        {/* Notes */}
                        {contract.notes && (
                            <div className="card p-6 mt-6">
                                <h3 className="text-lg font-semibold text-white mb-4">ملاحظات</h3>
                                <p className="text-dark-300 whitespace-pre-wrap">{contract.notes}</p>
                            </div>
                        )}

                        {/* Termination Info */}
                        {contract.terminatedAt && (
                            <div className="card p-6 mt-6 border-2 border-red-500/30">
                                <h3 className="text-lg font-semibold text-red-500 mb-4">تم إلغاء العقد</h3>
                                <div className="space-y-2">
                                    <p className="text-dark-400">تاريخ الإلغاء: <span className="text-white">{formatDate(contract.terminatedAt)}</span></p>
                                    {contract.terminationReason && (
                                        <p className="text-dark-400">السبب: <span className="text-white">{contract.terminationReason}</span></p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
