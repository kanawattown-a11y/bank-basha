'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ClipboardDocumentListIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowPathIcon,
    UserIcon,
    CurrencyDollarIcon,
    Cog6ToothIcon,
    ShieldCheckIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface AuditLog {
    id: string;
    userId: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    oldValue: string | null;
    newValue: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
        fullName: string;
        fullNameAr: string | null;
        phone: string;
    } | null;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
    LOGIN: 'bg-blue-500/20 text-blue-400',
    LOGOUT: 'bg-gray-500/20 text-gray-400',
    REGISTER: 'bg-green-500/20 text-green-400',
    DEPOSIT_COMPLETED: 'bg-emerald-500/20 text-emerald-400',
    WITHDRAW_COMPLETED: 'bg-orange-500/20 text-orange-400',
    TRANSFER_COMPLETED: 'bg-purple-500/20 text-purple-400',
    QR_PAYMENT_COMPLETED: 'bg-primary-500/20 text-primary-400',
    SETTLEMENT: 'bg-cyan-500/20 text-cyan-400',
    CREDIT_GRANTED: 'bg-yellow-500/20 text-yellow-400',
    USER_BLOCKED: 'bg-red-500/20 text-red-400',
    USER_ACTIVATED: 'bg-green-500/20 text-green-400',
    SETTINGS_UPDATED: 'bg-indigo-500/20 text-indigo-400',
    KYC: 'bg-teal-500/20 text-teal-400',
};

const ENTITY_ICONS: Record<string, typeof UserIcon> = {
    User: UserIcon,
    Transaction: CurrencyDollarIcon,
    Settings: Cog6ToothIcon,
    Session: ShieldCheckIcon,
    Contract: DocumentTextIcon,
};

export default function AuditLogsPage() {
    const t = useTranslations();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: '',
        entity: '',
        userId: '',
        from: '',
        to: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50',
            });
            if (filters.action) params.set('action', filters.action);
            if (filters.entity) params.set('entity', filters.entity);
            if (filters.userId) params.set('userId', filters.userId);
            if (filters.from) params.set('from', filters.from);
            if (filters.to) params.set('to', filters.to);

            const res = await fetch(`/api/admin/audit-logs?${params}`);
            const data = await res.json();
            setLogs(data.logs || []);
            setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleFilter = () => {
        fetchLogs(1);
    };

    const handlePageChange = (newPage: number) => {
        fetchLogs(newPage);
    };

    const getActionColor = (action: string) => {
        for (const [key, color] of Object.entries(ACTION_COLORS)) {
            if (action.includes(key)) return color;
        }
        return 'bg-dark-700 text-dark-300';
    };

    const getEntityIcon = (entity: string) => {
        return ENTITY_ICONS[entity] || ClipboardDocumentListIcon;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('ar-SY', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(date);
    };

    const BackIcon = ArrowRightIcon; // RTL

    return (
        <div className="min-h-screen bg-dark-950 pt-16 lg:pt-0">
            {/* Header */}
            <header className="bg-dark-900/50 backdrop-blur-xl border-b border-dark-800 sticky top-16 lg:top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/admin" className="btn-ghost btn-icon">
                                <BackIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </Link>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">
                                    سجل النشاطات
                                </h1>
                                <p className="text-dark-400 text-sm">
                                    {pagination.total.toLocaleString('ar-SY')} سجل
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`btn-ghost btn-icon ${showFilters ? 'bg-primary-500/20' : ''}`}
                            >
                                <FunnelIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => fetchLogs(pagination.page)} className="btn-ghost btn-icon">
                                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                        <div className="mt-4 p-4 bg-dark-800/50 rounded-xl border border-dark-700">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                <div>
                                    <label className="block text-dark-400 text-xs mb-1">نوع العملية</label>
                                    <select
                                        value={filters.action}
                                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="">الكل</option>
                                        <option value="LOGIN">تسجيل دخول</option>
                                        <option value="LOGOUT">تسجيل خروج</option>
                                        <option value="DEPOSIT">إيداع</option>
                                        <option value="WITHDRAW">سحب</option>
                                        <option value="TRANSFER">تحويل</option>
                                        <option value="QR_PAYMENT">دفع QR</option>
                                        <option value="SETTLEMENT">تسوية</option>
                                        <option value="CREDIT">رصيد</option>
                                        <option value="USER">مستخدم</option>
                                        <option value="SETTINGS">إعدادات</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-dark-400 text-xs mb-1">الكيان</label>
                                    <select
                                        value={filters.entity}
                                        onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="">الكل</option>
                                        <option value="User">المستخدمين</option>
                                        <option value="Transaction">المعاملات</option>
                                        <option value="Session">الجلسات</option>
                                        <option value="Settings">الإعدادات</option>
                                        <option value="Contract">العقود</option>
                                        <option value="AgentProfile">الوكلاء</option>
                                        <option value="Settlement">التسويات</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-dark-400 text-xs mb-1">من تاريخ</label>
                                    <input
                                        type="date"
                                        value={filters.from}
                                        onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-dark-400 text-xs mb-1">إلى تاريخ</label>
                                    <input
                                        type="date"
                                        value={filters.to}
                                        onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button onClick={handleFilter} className="btn-primary w-full">
                                        <MagnifyingGlassIcon className="w-4 h-4 ml-2" />
                                        بحث
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <ArrowPathIcon className="w-10 h-10 animate-spin text-primary-500" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-16">
                        <ClipboardDocumentListIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                        <p className="text-dark-400">لا توجد سجلات</p>
                    </div>
                ) : (
                    <>
                        {/* Logs Table */}
                        <div className="card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-dark-800/50 border-b border-dark-700">
                                            <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">التاريخ</th>
                                            <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">المستخدم</th>
                                            <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">العملية</th>
                                            <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">الكيان</th>
                                            <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">التفاصيل</th>
                                            <th className="text-right text-dark-400 text-xs font-medium px-4 py-3">IP</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dark-800">
                                        {logs.map((log) => {
                                            const EntityIcon = getEntityIcon(log.entity);
                                            return (
                                                <tr key={log.id} className="hover:bg-dark-800/30 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <span className="text-dark-300 text-sm font-mono">
                                                            {formatDate(log.createdAt)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {log.user ? (
                                                            <div>
                                                                <p className="text-white text-sm">
                                                                    {log.user.fullNameAr || log.user.fullName}
                                                                </p>
                                                                <p className="text-dark-500 text-xs" dir="ltr">
                                                                    {log.user.phone}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-dark-500 text-sm">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getActionColor(log.action)}`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <EntityIcon className="w-4 h-4 text-dark-500" />
                                                            <span className="text-dark-300 text-sm">{log.entity}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {log.newValue ? (
                                                            <details className="cursor-pointer">
                                                                <summary className="text-primary-400 text-xs hover:underline">
                                                                    عرض التفاصيل
                                                                </summary>
                                                                <pre className="text-dark-400 text-xs mt-2 bg-dark-900 p-2 rounded max-w-xs overflow-x-auto" dir="ltr">
                                                                    {JSON.stringify(JSON.parse(log.newValue), null, 2)}
                                                                </pre>
                                                            </details>
                                                        ) : (
                                                            <span className="text-dark-500 text-sm">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-dark-500 text-xs font-mono" dir="ltr">
                                                            {log.ipAddress || '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6">
                                <p className="text-dark-400 text-sm">
                                    صفحة {pagination.page} من {pagination.totalPages}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                        className="btn-ghost btn-icon disabled:opacity-50"
                                    >
                                        <ChevronRightIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.totalPages}
                                        className="btn-ghost btn-icon disabled:opacity-50"
                                    >
                                        <ChevronLeftIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
