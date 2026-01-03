'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    HomeIcon,
    UsersIcon,
    BuildingStorefrontIcon,
    UserGroupIcon,
    DocumentTextIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    PlusIcon,
    CheckIcon,
    XMarkIcon,
    BanknotesIcon,
    BuildingLibraryIcon,
    ShieldExclamationIcon,
    ExclamationTriangleIcon,
    Bars3Icon,
    LanguageIcon,
    TrashIcon,
    TicketIcon,
} from '@heroicons/react/24/outline';

interface AdminStats {
    totalUsers: number;
    totalAgents: number;
    totalMerchants: number;
    todayVolume: { USD: number; SYP: number } | number;
    totalBalance?: { USD: number; SYP: number };
    pendingKYC: number;
    pendingSettlements: number;
}

interface PendingKYC {
    id: string;
    fullName: string;
    phone: string;
    createdAt: string;
}

interface PendingSettlement {
    id: string;
    agentCode: string;
    businessName: string;
    amountDue: number;
    createdAt: string;
}

export default function AdminDashboard() {
    const t = useTranslations();
    const currentLocale = useLocale();
    const isRtl = currentLocale === 'ar';
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [pendingKYC, setPendingKYC] = useState<PendingKYC[]>([]);
    const [pendingSettlements, setPendingSettlements] = useState<PendingSettlement[]>([]);
    const [activeSection, setActiveSection] = useState('overview');
    const [showGrantCreditModal, setShowGrantCreditModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        try {
            const response = await fetch('/api/admin/dashboard');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed to fetch data');
            }
            const data = await response.json();
            setStats(data.stats);
            setPendingKYC(data.pendingKYC || []);
            setPendingSettlements(data.pendingSettlements || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKYCAction = async (userId: string, action: 'approve' | 'reject') => {
        try {
            await fetch('/api/admin/kyc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action }),
            });
            fetchAdminData();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleSettlementAction = async (settlementId: string, action: 'approve' | 'reject') => {
        try {
            await fetch('/api/admin/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settlementId, action }),
            });
            fetchAdminData();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    const sidebarItems = [
        { id: 'overview', icon: HomeIcon, label: t('admin.dashboard.overview'), link: '/admin' },
        { id: 'central-bank', icon: BuildingLibraryIcon, label: t('admin.centralBank.title'), link: '/admin/central-bank' },
        { id: 'internal-accounts', icon: BanknotesIcon, label: t('admin.internalAccounts.title'), link: '/admin/internal-accounts' },
        { id: 'risk-management', icon: ShieldExclamationIcon, label: t('admin.riskManagement.title'), link: '/admin/risk-management' },
        { id: 'users', icon: UsersIcon, label: t('admin.users.title'), link: '/admin/users' },
        { id: 'agents', icon: UserGroupIcon, label: t('admin.agents.title'), link: '/admin/agents' },
        { id: 'merchants', icon: BuildingStorefrontIcon, label: t('admin.merchants.title'), link: '/admin/merchants' },
        { id: 'merchant-requests', icon: BuildingStorefrontIcon, label: t('admin.merchants.requestsTitle'), link: '/admin/merchant-requests' },
        { id: 'services', icon: DocumentTextIcon, label: t('admin.services.title'), link: '/admin/services' },
        { id: 'transactions', icon: DocumentTextIcon, label: t('admin.transactions.title'), link: '/admin/transactions' },
        { id: 'monitor', icon: ChartBarIcon, label: t('admin.monitor.title'), link: '/admin/monitor' },
        { id: 'settlements', icon: DocumentTextIcon, label: t('admin.settlements.title'), link: '/admin/settlements' },
        { id: 'support', icon: TicketIcon, label: t('support.title'), link: '/admin/support' },
        { id: 'password-requests', icon: ShieldExclamationIcon, label: t('admin.passwordRequests.title'), link: '/admin/password-requests' },
        { id: 'ledger', icon: ChartBarIcon, label: t('admin.ledger.title'), link: '/admin/ledger' },
        { id: 'advanced-settings', icon: ExclamationTriangleIcon, label: t('admin.settings.advancedSettings'), link: '/admin/advanced-settings' },
        { id: 'bin', icon: TrashIcon, label: t('admin.bin.title'), link: '/admin/bin' },
        { id: 'settings', icon: Cog6ToothIcon, label: t('admin.settings.title'), link: '/admin/settings' },
    ];

    const sidebarTranslateClass = sidebarOpen
        ? 'translate-x-0'
        : (isRtl ? 'translate-x-full' : '-translate-x-full');

    return (
        <div className="min-h-screen bg-dark-950" suppressHydrationWarning>
            {/* Mobile Header with Hamburger */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-dark-900 border-b border-dark-800 px-4 py-3 flex items-center justify-between">
                <button onClick={() => setSidebarOpen(true)} className="btn-ghost btn-icon">
                    <Bars3Icon className="w-6 h-6" />
                </button>
                <Link href="/admin" className="flex items-center gap-2">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
                    <span className="text-lg font-bold text-gradient">{t('common.appName')}</span>
                </Link>
                <div className="w-10"></div>
            </div>

            {/* Mobile Sidebar Backdrop */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-40"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`w-64 bg-dark-900 border-e border-dark-800 fixed top-0 bottom-0 start-0 flex flex-col z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarTranslateClass}`}>
                {/* Logo */}
                <div className="p-6 border-b border-dark-800 flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <span className="text-xl font-bold text-gradient">{t('common.appName')}</span>
                            <p className="text-xs text-dark-400">{t('admin.dashboard.title')}</p>
                        </div>
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden btn-ghost btn-icon">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.link}
                            onClick={() => setSidebarOpen(false)}
                            className={`sidebar-item w-full ${activeSection === item.id ? 'active' : ''}`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Language Switcher & Logout */}
                <div className="p-4 border-t border-dark-800 space-y-2">
                    <button
                        onClick={() => {
                            const newLocale = currentLocale === 'ar' ? 'en' : 'ar';
                            document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
                            router.refresh();
                        }}
                        className="sidebar-item w-full text-dark-300 hover:text-white hover:bg-dark-800"
                    >
                        <LanguageIcon className="w-5 h-5" />
                        <span>{currentLocale === 'ar' ? 'English' : 'العربية'}</span>
                    </button>
                    <button onClick={handleLogout} className="sidebar-item w-full text-red-500 hover:bg-red-500/10">
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                        <span>{t('nav.logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ms-64 p-4 lg:p-8 pt-20 lg:pt-8">
                <div className="max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white">{t('admin.dashboard.title')}</h1>
                            <p className="text-dark-400 mt-1">{t('admin.dashboard.subtitle')}</p>
                        </div>
                        <button
                            onClick={() => setShowGrantCreditModal(true)}
                            className="btn-primary"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>{t('admin.agents.grantCredit')}</span>
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[
                            { label: t('admin.dashboard.totalUsers'), value: stats?.totalUsers || 0, icon: UsersIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                            { label: t('admin.dashboard.totalAgents'), value: stats?.totalAgents || 0, icon: UserGroupIcon, color: 'text-green-500', bg: 'bg-green-500/10' },
                            { label: t('admin.dashboard.totalMerchants'), value: stats?.totalMerchants || 0, icon: BuildingStorefrontIcon, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                            { label: t('admin.dashboard.pendingKYC'), value: stats?.pendingKYC || 0, icon: DocumentTextIcon, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                        ].map((stat, index) => (
                            <div key={index} className="card p-6">
                                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                                <div className="text-dark-400 text-sm">{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Dual Currency Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                    <BanknotesIcon className="w-5 h-5 text-green-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-white">{t('admin.dashboard.todayVolume')}</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                                    <p className="text-dark-400 text-xs mb-1">USD</p>
                                    <p className="text-2xl font-bold text-green-400">
                                        ${formatAmount(typeof stats?.todayVolume === 'object' ? stats.todayVolume.USD : (stats?.todayVolume || 0))}
                                    </p>
                                </div>
                                <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                                    <p className="text-dark-400 text-xs mb-1">SYP</p>
                                    <p className="text-2xl font-bold text-blue-400">
                                        {formatAmount(typeof stats?.todayVolume === 'object' ? stats.todayVolume.SYP : 0)} ل.س
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                    <BanknotesIcon className="w-5 h-5 text-primary-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-white">{t('admin.dashboard.totalBalance') || 'إجمالي الأرصدة'}</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                                    <p className="text-dark-400 text-xs mb-1">USD</p>
                                    <p className="text-2xl font-bold text-primary-400">
                                        ${formatAmount(stats?.totalBalance?.USD || 0)}
                                    </p>
                                </div>
                                <div className="bg-dark-800/50 rounded-xl p-4 text-center">
                                    <p className="text-dark-400 text-xs mb-1">SYP</p>
                                    <p className="text-2xl font-bold text-purple-400">
                                        {formatAmount(stats?.totalBalance?.SYP || 0)} ل.س
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Pending KYC */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">{t('admin.users.pending')}</h2>
                            <span className="badge-warning">{stats?.pendingKYC || 0}</span>
                        </div>

                        {pendingKYC.length === 0 ? (
                            <div className="text-center py-8 text-dark-400">
                                {t('admin.dashboard.noPendingKYC')}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingKYC.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50">
                                        <div>
                                            <p className="text-white font-medium">{user.fullName}</p>
                                            <p className="text-dark-400 text-sm">{user.phone}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleKYCAction(user.id, 'approve')}
                                                className="btn-icon bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                            >
                                                <CheckIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleKYCAction(user.id, 'reject')}
                                                className="btn-icon bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Settlements */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">{t('admin.settlements.pending')}</h2>
                            <span className="badge-warning">{stats?.pendingSettlements || 0}</span>
                        </div>

                        {pendingSettlements.length === 0 ? (
                            <div className="text-center py-8 text-dark-400">
                                {t('admin.dashboard.noPendingSettlements')}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingSettlements.map((settlement) => (
                                    <div key={settlement.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50">
                                        <div>
                                            <p className="text-white font-medium">{settlement.businessName}</p>
                                            <p className="text-dark-400 text-sm">
                                                {settlement.agentCode} • {formatAmount(settlement.amountDue)} $
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSettlementAction(settlement.id, 'approve')}
                                                className="btn-icon bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                            >
                                                <CheckIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleSettlementAction(settlement.id, 'reject')}
                                                className="btn-icon bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Grant Credit Modal */}
            {showGrantCreditModal && (
                <GrantCreditModal onClose={() => setShowGrantCreditModal(false)} onSuccess={fetchAdminData} />
            )}
        </div>
    );
}

// Grant Credit Modal
function GrantCreditModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const t = useTranslations();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currency, setCurrency] = useState<'USD' | 'SYP'>('USD');
    const [formData, setFormData] = useState({ agentPhone: '', amount: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/agents/credit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentPhone: formData.agentPhone,
                    amount: parseFloat(formData.amount),
                    currency,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Operation failed');
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="text-xl font-semibold text-white">{t('admin.agents.grantCredit')}</h3>
                    <button onClick={onClose} className="text-dark-400 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="label">{t('admin.agents.agentPhone')}</label>
                            <input
                                type="tel"
                                className="input"
                                placeholder="09XX XXX XXX"
                                dir="ltr"
                                value={formData.agentPhone}
                                onChange={(e) => setFormData({ ...formData, agentPhone: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="label">العملة</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrency('USD')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${currency === 'USD'
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                        }`}
                                >
                                    💵 USD
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrency('SYP')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${currency === 'SYP'
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                        }`}
                                >
                                    🇸🇾 SYP
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="label">{t('admin.agents.amount')}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="0"
                                    dir="ltr"
                                    min="1"
                                    step={currency === 'SYP' ? '1' : '0.01'}
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">
                                    {currency === 'SYP' ? 'ل.س' : '$'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? <div className="spinner w-5 h-5"></div> : t('common.confirm')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
