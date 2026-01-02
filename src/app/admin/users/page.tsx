'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

interface User {
    id: string;
    fullName: string;
    phone: string;
    address?: string; // NEW: Address field
    userType: string;
    kycStatus: string;
    isActive: boolean;
    hasMerchantAccount: boolean;
    createdAt: string;
    wallet: {
        balance: number;
    };
    merchantProfile?: {
        businessName: string;
        businessType: string;
    } | null;
}

export default function AdminUsersPage() {
    const t = useTranslations();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [kycFilter, setKycFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        setMounted(true);
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const data = await response.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await fetch('/api/admin/users/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isActive: !currentStatus }),
            });
            fetchUsers();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(dateString));
    };

    const getKYCBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <span className="badge-success">{t('admin.users.kycStatus.approved')}</span>;
            case 'PENDING':
                return <span className="badge-warning">{t('admin.users.kycStatus.pending')}</span>;
            case 'REJECTED':
                return <span className="badge-error">{t('admin.users.kycStatus.rejected')}</span>;
            default:
                return <span className="badge">{t('common.unverifiedAccount')}</span>;
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone.includes(searchTerm);

        // Fix filter logic: 'business' means USER with hasMerchantAccount
        let matchesUserType = filter === 'all';
        if (filter === 'USER') matchesUserType = user.userType === 'USER' && !user.hasMerchantAccount;
        if (filter === 'BUSINESS') matchesUserType = user.userType === 'USER' && user.hasMerchantAccount;
        if (filter === 'AGENT') matchesUserType = user.userType === 'AGENT';

        const matchesKYC = kycFilter === 'all' || user.kycStatus === kycFilter;
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && user.isActive) ||
            (statusFilter === 'inactive' && !user.isActive);
        return matchesSearch && matchesUserType && matchesKYC && matchesStatus;
    });

    if (!mounted) {
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
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-base sm:text-lg font-semibold text-white">{t('admin.users.title')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-6xl mx-auto">

                    {/* Search and Filters */}
                    <div className="card p-4 mb-6">
                        <div className="flex flex-col gap-4">
                            {/* Search */}
                            <div className="relative">
                                <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
                                <input
                                    type="text"
                                    className="input pr-10"
                                    placeholder={t('admin.users.searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Filters Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <select
                                    className="input"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                >
                                    <option value="all">{t('admin.users.filter.allTypes')}</option>
                                    <option value="USER">{t('admin.users.filter.users')}</option>
                                    <option value="BUSINESS">{t('admin.users.filter.business')}</option>
                                    <option value="AGENT">{t('admin.users.filter.agents')}</option>
                                </select>

                                <select
                                    className="input"
                                    value={kycFilter}
                                    onChange={(e) => setKycFilter(e.target.value)}
                                >
                                    <option value="all">{t('admin.users.filter.allKyc')}</option>
                                    <option value="PENDING">{t('admin.users.kycStatus.pending')}</option>
                                    <option value="APPROVED">{t('admin.users.kycStatus.approved')}</option>
                                    <option value="REJECTED">{t('admin.users.kycStatus.rejected')}</option>
                                    <option value="NOT_SUBMITTED">{t('admin.users.kycStatus.notSubmitted')}</option>
                                </select>

                                <select
                                    className="input"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">{t('admin.users.filter.allStatus')}</option>
                                    <option value="active">{t('common.active')}</option>
                                    <option value="inactive">{t('common.inactive')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Users List */}
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner w-10 h-10"></div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="card p-12 text-center">
                            <p className="text-xl font-semibold text-dark-300">{t('common.noResults')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredUsers.map((user) => (
                                <Link
                                    key={user.id}
                                    href={`/admin/users/${user.id}`}
                                    className="card p-4 block hover:border-primary-500/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="text-white font-medium">{user.fullName}</p>
                                            <p className="text-dark-400 text-sm">{user.phone}</p>
                                            {user.address && (
                                                <p className="text-dark-500 text-xs mt-1 flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    </svg>
                                                    {user.address}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 flex-wrap mt-2">
                                                {getKYCBadge(user.kycStatus)}
                                                {/* User Type Badge - Enhanced */}
                                                {user.userType === 'AGENT' ? (
                                                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                        🏪 {t('admin.users.roles.agent')}
                                                    </span>
                                                ) : user.hasMerchantAccount ? (
                                                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                        💼 {t('admin.users.filter.business')}
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-dark-700 text-dark-400 border border-dark-600">
                                                        👤 {t('admin.users.roles.user')}
                                                    </span>
                                                )}
                                                {/* Status Badge - Enhanced */}
                                                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${user.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                                    {user.isActive ? `✓ ${t('common.active')}` : `✗ ${t('common.inactive')}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-dark-400">
                                                <span>{user.phone}</span>
                                                <span>•</span>
                                                <span>{t('wallet.balance')}: {formatAmount(user.wallet?.balance || 0)} $</span>
                                                <span>•</span>
                                                <span>{formatDate(user.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
