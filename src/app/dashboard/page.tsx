'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowUpIcon,
    ArrowDownIcon,
    ArrowsRightLeftIcon,
    QrCodeIcon,
    BellIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    BuildingStorefrontIcon,
    ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import usePushNotifications from '@/hooks/usePushNotifications';
import { DualBalanceDisplay } from '@/components/CurrencySelector';

import TransactionDetailsModal from '@/components/TransactionDetailsModal';

interface WalletData {
    balance: number;
    frozenBalance: number;
    currency: string;
    isActive: boolean;
    dailyLimit: number;
    monthlyLimit: number;
}

interface MerchantProfile {
    businessName: string;
    businessNameAr: string;
    merchantCode: string;
    qrCode: string;
}

interface Transaction {
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    fee: number;
    netAmount: number;
    status: string;
    description: string;
    descriptionAr: string;
    createdAt: string;
    isOutgoing: boolean;
    counterparty: string;
    senderName?: string;
    receiverName?: string;
}

export default function UserDashboard() {
    const t = useTranslations();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [personalBalances, setPersonalBalances] = useState<{ USD: number; SYP: number }>({ USD: 0, SYP: 0 });
    const [userName, setUserName] = useState<string>('');
    const [businessWallet, setBusinessWallet] = useState<WalletData | null>(null);
    const [businessBalances, setBusinessBalances] = useState<{ USD: number; SYP: number } | null>(null);
    const [merchantProfile, setMerchantProfile] = useState<MerchantProfile | null>(null);
    const [hasMerchantAccount, setHasMerchantAccount] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Push notifications
    const { isSupported, subscribe, notification, clearNotification } = usePushNotifications();

    useEffect(() => {
        setMounted(true);
        fetchWalletData();

        // Subscribe to push notifications
        if (isSupported) {
            subscribe().then(success => {
                if (success) { /* Push notifications enabled */ }
            });
        }
    }, [isSupported, subscribe]);

    const fetchWalletData = async () => {
        try {
            const response = await fetch('/api/wallet');
            if (!response.ok) {
                if (response.status === 401) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed to fetch wallet data');
            }
            const data = await response.json();
            setUserName(data.user?.fullName || data.user?.fullNameAr || '');
            setWallet(data.wallet);

            // Set dual currency balances
            setPersonalBalances({
                USD: data.personalWallets?.USD?.balance || data.wallet?.balance || 0,
                SYP: data.personalWallets?.SYP?.balance || 0,
            });

            setBusinessWallet(data.businessWallet);
            if (data.businessWallets) {
                setBusinessBalances({
                    USD: data.businessWallets?.USD?.balance || 0,
                    SYP: data.businessWallets?.SYP?.balance || 0,
                });
            }

            setMerchantProfile(data.merchantProfile);
            setHasMerchantAccount(data.hasMerchantAccount || false);
            setTransactions(data.recentTransactions);
        } catch (error) {
            console.error('Error fetching wallet:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getTransactionIcon = (type: string, isOutgoing: boolean) => {
        switch (type) {
            case 'DEPOSIT':
                return { icon: ArrowDownIcon, color: 'text-green-500', bg: 'bg-green-500/10' };
            case 'WITHDRAW':
                return { icon: ArrowUpIcon, color: 'text-red-500', bg: 'bg-red-500/10' };
            case 'TRANSFER':
                return isOutgoing
                    ? { icon: ArrowUpIcon, color: 'text-orange-500', bg: 'bg-orange-500/10' }
                    : { icon: ArrowDownIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' };
            case 'QR_PAYMENT':
                return { icon: QrCodeIcon, color: 'text-purple-500', bg: 'bg-purple-500/10' };
            default:
                return { icon: ArrowsRightLeftIcon, color: 'text-gray-500', bg: 'bg-gray-500/10' };
        }
    };

    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Real-time Notification Toast */}
            {notification && (
                <div className="fixed top-4 left-4 right-4 z-50 animate-pulse">
                    <div className="max-w-md mx-auto bg-primary-500 text-dark-900 rounded-xl p-4 shadow-lg">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">🔔</span>
                            <div className="flex-1">
                                <p className="font-bold">{notification.title}</p>
                                <p className="text-sm opacity-80">{notification.body}</p>
                            </div>
                            <button onClick={clearNotification} className="text-dark-900/60 hover:text-dark-900">✕</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="navbar">
                <div className="navbar-container">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xl font-bold text-gradient hidden sm:inline">{t('common.appName')}</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/notifications" className="btn-ghost btn-icon relative">
                            <BellIcon className="w-6 h-6" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        </Link>
                        <Link href="/dashboard/settings" className="btn-ghost btn-icon">
                            <Cog6ToothIcon className="w-6 h-6" />
                        </Link>
                        <button onClick={handleLogout} className="btn-ghost btn-icon text-red-500">
                            <ArrowRightOnRectangleIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-20 pb-24 px-4">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Balance Card */}
                    <div className="card p-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-primary-500/10"></div>
                        <div className="relative">
                            {/* Header with name and balance label */}
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-dark-400">{t('wallet.balance')}</p>
                                <div className="text-end">
                                    <p className="text-primary-500 font-semibold text-lg">{userName}</p>
                                </div>
                            </div>

                            {/* Dual Currency Balances */}
                            <div className="mb-6">
                                <DualBalanceDisplay balances={personalBalances} />
                            </div>

                            {wallet && wallet.frozenBalance > 0 && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-sm mb-4">
                                    <ExclamationCircleIcon className="w-4 h-4" />
                                    <span>{t('wallet.frozen')}: {formatAmount(wallet.frozenBalance)} {t('common.currencySymbol')}</span>
                                </div>
                            )}

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { icon: ArrowDownIcon, label: t('wallet.actions.deposit'), color: 'text-green-500', href: '/dashboard/deposit' },
                                    { icon: ArrowUpIcon, label: t('wallet.actions.withdraw'), color: 'text-red-500', href: '/dashboard/withdraw' },
                                    { icon: ArrowsRightLeftIcon, label: t('wallet.actions.transfer'), color: 'text-blue-500', href: '/dashboard/transfer' },
                                    { icon: QrCodeIcon, label: t('wallet.actions.pay'), color: 'text-purple-500', href: '/dashboard/pay' },
                                ].map((action, index) => (
                                    <Link
                                        key={index}
                                        href={action.href}
                                        className="action-btn"
                                    >
                                        <div className={`action-btn-icon ${action.color}`}>
                                            <action.icon className="w-6 h-6" />
                                        </div>
                                        <span className="action-btn-label">{action.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Business Account Card (if user has merchant account) */}
                    {hasMerchantAccount && businessWallet && merchantProfile && (
                        <Link href="/merchant" className="block group">
                            <div className="card p-6 relative overflow-hidden border-2 border-emerald-500/30 hover:border-emerald-500/60 transition-all">
                                {/* Background gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent"></div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>

                                <div className="relative">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                                <BuildingStorefrontIcon className="w-6 h-6 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-emerald-400 font-bold text-sm">💼 حساب البزنس</p>
                                                <p className="text-white font-semibold">{merchantProfile.businessNameAr || merchantProfile.businessName}</p>
                                            </div>
                                        </div>
                                        <span className="badge-primary text-xs">{merchantProfile.merchantCode}</span>
                                    </div>

                                    {/* Balance */}
                                    <div className="bg-dark-800/50 rounded-xl p-4 mb-4">
                                        <p className="text-dark-400 text-xs mb-1">الرصيد المتاح</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-emerald-400">{formatAmount(businessWallet.balance)}</span>
                                            <span className="text-lg text-dark-400">{t('common.currencySymbol')}</span>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-dark-400 text-xs">
                                            <QrCodeIcon className="w-4 h-4" />
                                            <span>استقبال مدفوعات QR</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-emerald-400 text-sm group-hover:gap-2 transition-all">
                                            <span>إدارة</span>
                                            <span>←</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* Services Quick Link */}
                    <Link href="/dashboard/services" className="card p-4 hover:border-primary-500/40 transition-all group mt-4 mb-4 overflow-hidden block">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">🛍️</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-semibold">الخدمات</h3>
                                <p className="text-dark-400 text-sm">شحن رصيد، دفع فواتير، اشتراكات</p>
                            </div>
                            <div className="text-primary-500 flex-shrink-0">
                                ←
                            </div>
                        </div>
                    </Link>

                    {/* Support Quick Link */}
                    <Link href="/dashboard/support" className="card p-4 hover:border-primary-500/40 transition-all group mb-4 overflow-hidden block">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">🎧</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-semibold">{t('support.title')}</h3>
                                <p className="text-dark-400 text-sm">{t('support.myTickets')}</p>
                            </div>
                            <div className="text-primary-500 flex-shrink-0">
                                ←
                            </div>
                        </div>
                    </Link>


                    {/* Recent Transactions */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">{t('nav.history')}</h2>
                            <Link href="/dashboard/transactions" className="text-primary-500 text-sm hover:text-primary-400 transition-colors">
                                عرض الكل
                            </Link>
                        </div>

                        {transactions.length === 0 ? (
                            <div className="empty-state py-8">
                                <ClockIcon className="empty-state-icon" />
                                <p className="empty-state-title">لا توجد معاملات</p>
                                <p className="empty-state-description">ستظهر معاملاتك هنا</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map((tx) => {
                                    const { icon: Icon, color, bg } = getTransactionIcon(tx.type, tx.isOutgoing);
                                    return (
                                        <button
                                            key={tx.id}
                                            onClick={() => {
                                                setSelectedTransaction(tx);
                                                setIsDetailsModalOpen(true);
                                            }}
                                            className="w-full text-start transaction-item hover:bg-dark-700/50 transition-colors rounded-xl p-2 -mx-2 active:scale-[0.99] flex items-center gap-3"
                                        >
                                            <span className={`transaction-icon ${bg} flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full`}>
                                                <Icon className={`w-6 h-6 ${color}`} />
                                            </span>
                                            <span className="flex-1 min-w-0 block text-start">
                                                <span className="text-white font-medium truncate block">
                                                    {tx.descriptionAr || tx.description}
                                                </span>
                                                <span className="text-dark-400 text-sm block">
                                                    {formatDate(tx.createdAt)}
                                                </span>
                                            </span>
                                            <span className="text-end block flex-shrink-0">
                                                <span className={`font-semibold block ${tx.isOutgoing ? 'text-red-500' : 'text-green-500'}`}>
                                                    {tx.isOutgoing ? '-' : '+'}{formatAmount(tx.amount)} {t('common.currencySymbol')}
                                                </span>
                                                <span className="flex items-center gap-1 justify-end mt-0.5">
                                                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                                    <span className="text-xs text-dark-400">{tx.referenceNumber}</span>
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </main>

            {/* Transfer Modal */}
            {showTransferModal && (
                <TransferModal onClose={() => setShowTransferModal(false)} onSuccess={fetchWalletData} />
            )}

            <TransactionDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                transaction={selectedTransaction}
                userType="USER"
            />
        </div>
    );
}

// Transfer Modal Component
function TransferModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const t = useTranslations();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        recipientPhone: '',
        amount: '',
        note: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/transactions/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientPhone: formData.recipientPhone,
                    amount: parseFloat(formData.amount),
                    note: formData.note || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Transfer failed');
            }

            setSuccess(true);
            onSuccess();
            setTimeout(() => onClose(), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="modal-backdrop" onClick={onClose}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div className="p-8 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                            <CheckCircleIcon className="w-10 h-10 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{t('transaction.transfer.success')}</h3>
                        <p className="text-dark-400">تم تنفيذ التحويل بنجاح</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="text-xl font-semibold text-white">{t('transaction.transfer.title')}</h3>
                    <button onClick={onClose} className="text-dark-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
                            <label className="label">{t('transaction.transfer.recipient')}</label>
                            <input
                                type="tel"
                                className="input"
                                placeholder="09XX XXX XXX"
                                dir="ltr"
                                value={formData.recipientPhone}
                                onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="label">{t('transaction.transfer.amount')}</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="0"
                                dir="ltr"
                                min="1"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="label">{t('transaction.transfer.note')}</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="ملاحظة اختيارية..."
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? <div className="spinner w-5 h-5"></div> : t('transaction.transfer.confirm')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
