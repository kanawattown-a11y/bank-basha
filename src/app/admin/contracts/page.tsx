'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
    DocumentDuplicateIcon,
    PlusIcon,
    EyeIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    ArrowPathIcon,
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
    signedByAgent: boolean;
    signedByAdmin: boolean;
    createdAt: string;
    agent: {
        id: string;
        agentCode: string;
        businessName: string;
        businessNameAr: string | null;
        user: {
            id: string;
            fullName: string;
            fullNameAr: string | null;
            phone: string;
        };
    };
}

export default function ContractsPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const isRtl = currentLocale === 'ar';

    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [mounted, setMounted] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/contracts');
            const data = await res.json();
            setContracts(data.contracts || []);
        } catch (error) {
            console.error('Error fetching contracts:', error);
        }
        setLoading(false);
    };

    const deleteContract = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا العقد؟')) return;

        setDeleting(id);
        try {
            const res = await fetch(`/api/admin/contracts/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setContracts(contracts.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error('Error deleting contract:', error);
        }
        setDeleting(null);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString(isRtl ? 'ar-SY' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-500/10 text-green-500';
            case 'DRAFT': return 'bg-gray-500/10 text-gray-400';
            case 'PENDING_SIGNATURE': return 'bg-yellow-500/10 text-yellow-500';
            case 'EXPIRED': return 'bg-orange-500/10 text-orange-500';
            case 'TERMINATED': return 'bg-red-500/10 text-red-500';
            case 'CANCELLED': return 'bg-red-500/10 text-red-400';
            default: return 'bg-gray-500/10 text-gray-500';
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACTIVE': return <CheckCircleIcon className="w-4 h-4" />;
            case 'PENDING_SIGNATURE': return <ClockIcon className="w-4 h-4" />;
            case 'TERMINATED':
            case 'CANCELLED': return <XCircleIcon className="w-4 h-4" />;
            default: return <DocumentTextIcon className="w-4 h-4" />;
        }
    };

    const filteredContracts = contracts.filter(contract => {
        // Status filter
        if (filter !== 'ALL' && contract.status !== filter) return false;

        // Type filter
        if (typeFilter !== 'ALL' && contract.type !== typeFilter) return false;

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            const agentName = (contract.agent?.user?.fullNameAr || contract.agent?.user?.fullName || '').toLowerCase();
            const businessName = (contract.agent?.businessNameAr || contract.agent?.businessName || '').toLowerCase();
            const contractNum = contract.contractNumber.toLowerCase();

            if (!agentName.includes(searchLower) &&
                !businessName.includes(searchLower) &&
                !contractNum.includes(searchLower)) {
                return false;
            }
        }

        return true;
    });

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-dark-950 pt-16 lg:pt-0">
            {/* Header */}
            <header className="bg-dark-900/50 backdrop-blur-xl border-b border-dark-800 sticky top-16 lg:top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                                <DocumentDuplicateIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">إدارة العقود</h1>
                                <p className="text-dark-400 text-sm">عقود الوكلاء والمستندات القانونية</p>
                            </div>
                        </div>

                        <Link
                            href="/admin/contracts/new"
                            className="btn-primary flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>إنشاء عقد جديد</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Filters */}
                <div className="card p-4 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="w-5 h-5 text-dark-400 absolute start-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="بحث باسم الوكيل أو رقم العقد..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input w-full ps-10"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <FunnelIcon className="w-5 h-5 text-dark-400" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="input"
                            >
                                <option value="ALL">كل الحالات</option>
                                <option value="DRAFT">مسودة</option>
                                <option value="PENDING_SIGNATURE">بانتظار التوقيع</option>
                                <option value="ACTIVE">نشط</option>
                                <option value="EXPIRED">منتهي</option>
                                <option value="TERMINATED">ملغي</option>
                            </select>
                        </div>

                        {/* Type Filter */}
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="input"
                        >
                            <option value="ALL">كل الأنواع</option>
                            <option value="AGENT_AGREEMENT">عقد وكالة</option>
                            <option value="NDA">اتفاقية سرية</option>
                            <option value="SERVICE_AGREEMENT">اتفاقية خدمة</option>
                            <option value="AMENDMENT">ملحق تعديل</option>
                        </select>

                        {/* Refresh */}
                        <button
                            onClick={fetchContracts}
                            disabled={loading}
                            className="btn-ghost btn-icon"
                        >
                            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    {[
                        { label: 'الكل', value: contracts.length, color: 'text-white' },
                        { label: 'نشط', value: contracts.filter(c => c.status === 'ACTIVE').length, color: 'text-green-500' },
                        { label: 'بانتظار التوقيع', value: contracts.filter(c => c.status === 'PENDING_SIGNATURE').length, color: 'text-yellow-500' },
                        { label: 'مسودة', value: contracts.filter(c => c.status === 'DRAFT').length, color: 'text-gray-400' },
                        { label: 'منتهي/ملغي', value: contracts.filter(c => ['EXPIRED', 'TERMINATED', 'CANCELLED'].includes(c.status)).length, color: 'text-red-500' },
                    ].map((stat, idx) => (
                        <div key={idx} className="card p-4 text-center">
                            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-dark-400 text-sm">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Contracts List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="spinner w-10 h-10"></div>
                    </div>
                ) : filteredContracts.length === 0 ? (
                    <div className="card p-12 text-center">
                        <DocumentDuplicateIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">لا توجد عقود</h3>
                        <p className="text-dark-400 mb-6">ابدأ بإنشاء أول عقد للوكلاء</p>
                        <Link href="/admin/contracts/new" className="btn-primary inline-flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" />
                            إنشاء عقد جديد
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredContracts.map((contract) => (
                            <div key={contract.id} className="card p-4 hover:border-primary-500/30 transition-colors">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                    {/* Contract Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                                                <DocumentTextIcon className="w-6 h-6 text-primary-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-semibold text-white">{contract.titleAr || contract.title}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(contract.status)}`}>
                                                        {getStatusIcon(contract.status)}
                                                        {getStatusLabel(contract.status)}
                                                    </span>
                                                </div>
                                                <p className="text-dark-400 text-sm mt-1">
                                                    رقم العقد: <span className="text-white font-mono">{contract.contractNumber}</span>
                                                </p>
                                                <p className="text-dark-500 text-sm">
                                                    {getTypeLabel(contract.type)} • {formatDate(contract.startDate)}
                                                    {contract.endDate && ` - ${formatDate(contract.endDate)}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Agent Info */}
                                    <div className="lg:w-64 bg-dark-800/50 rounded-xl p-3">
                                        <p className="text-xs text-dark-400 mb-1">الوكيل</p>
                                        <p className="text-white font-medium text-sm">
                                            {contract.agent?.user?.fullNameAr || contract.agent?.user?.fullName}
                                        </p>
                                        <p className="text-dark-400 text-xs">
                                            {contract.agent?.businessNameAr || contract.agent?.businessName}
                                        </p>
                                        <p className="text-dark-500 text-xs font-mono">{contract.agent?.agentCode}</p>
                                    </div>

                                    {/* Signatures */}
                                    <div className="flex items-center gap-4 text-center">
                                        <div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${contract.signedByAdmin ? 'bg-green-500/10' : 'bg-dark-700'}`}>
                                                {contract.signedByAdmin ?
                                                    <CheckCircleIcon className="w-5 h-5 text-green-500" /> :
                                                    <ClockIcon className="w-5 h-5 text-dark-500" />
                                                }
                                            </div>
                                            <p className="text-xs text-dark-400 mt-1">الإدارة</p>
                                        </div>
                                        <div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${contract.signedByAgent ? 'bg-green-500/10' : 'bg-dark-700'}`}>
                                                {contract.signedByAgent ?
                                                    <CheckCircleIcon className="w-5 h-5 text-green-500" /> :
                                                    <ClockIcon className="w-5 h-5 text-dark-500" />
                                                }
                                            </div>
                                            <p className="text-xs text-dark-400 mt-1">الوكيل</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/admin/contracts/${contract.id}`}
                                            className="btn-ghost btn-icon"
                                            title="عرض التفاصيل"
                                        >
                                            <EyeIcon className="w-5 h-5" />
                                        </Link>
                                        {contract.fileUrl && (
                                            <a
                                                href={contract.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-ghost btn-icon text-green-500"
                                                title="تحميل PDF"
                                            >
                                                <ArrowDownTrayIcon className="w-5 h-5" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => deleteContract(contract.id)}
                                            disabled={deleting === contract.id}
                                            className="btn-ghost btn-icon text-red-500"
                                            title="حذف"
                                        >
                                            {deleting === contract.id ? (
                                                <div className="spinner w-5 h-5"></div>
                                            ) : (
                                                <TrashIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
