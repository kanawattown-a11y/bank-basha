'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeftIcon,
    UserIcon,
    BanknotesIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    XCircleIcon,
    PauseCircleIcon,
    LanguageIcon,
} from '@heroicons/react/24/outline';
import { useTranslations, useLocale } from 'next-intl';

interface AgentDetail {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    dateOfBirth: string | null;
    city: string | null;
    address: string | null;
    kycStatus: string;
    isActive: boolean;
    idPhotoUrl: string | null;
    selfiePhotoUrl: string | null;
    kycSubmittedAt: string | null;
    kycReviewedAt: string | null;
    kycRejectionReason: string | null;
    createdAt: string;
    wallet: { balance: number };
    agentProfile: {
        agentCode: string;
        businessName: string;
        currentCredit: number;
        cashCollected: number;
        totalDeposits: number;
        totalWithdrawals: number;
    };
}

interface Transaction {
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    fee: number;
    status: string;
    description: string;
    descriptionAr: string;
    createdAt: string;
    isOutgoing: boolean;
    counterparty: string;
}

interface Settlement {
    id: string;
    amountDue: number;
    status: string;
    createdAt: string;
    processedAt: string | null;
}

export default function AdminAgentDetailPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const params = useParams();
    const agentId = params.id as string;

    const [agent, setAgent] = useState<AgentDetail | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showImageModal, setShowImageModal] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'transactions' | 'settlements'>('info');

    useEffect(() => {
        fetchAgent();
    }, [agentId]);

    const fetchAgent = async () => {
        try {
            const response = await fetch(`/api/admin/agents/${agentId}`);
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const data = await response.json();
            setAgent(data.agent);
            setTransactions(data.transactions || []);
            setSettlements(data.settlements || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!agent) return;

        const confirm = window.confirm(
            agent.isActive
                ? t('admin.agentDetails.toggleStatus.confirmSuspend')
                : t('admin.agentDetails.toggleStatus.confirmActivate')
        );

        if (!confirm) return;

        setIsProcessing(true);
        try {
            await fetch('/api/admin/users/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: agent.id, isActive: !agent.isActive }),
            });
            fetchAgent();
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat(currentLocale === 'ar' ? 'ar-SA' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    const getKYCBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <span className="badge-success">{t('admin.agentDetails.stats.status')}</span>;
            case 'PENDING':
                return <span className="badge-warning">{t('admin.agentDetails.stats.status')}</span>;
            case 'REJECTED':
                return <span className="badge-error">{t('admin.agentDetails.stats.status')}</span>;
            default:
                return <span className="badge">{t('admin.agentDetails.stats.status')}</span>;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    if (!agent) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-dark-300">{t('admin.agentDetails.empty.notFound')}</p>
                    <Link href="/admin/agents" className="btn-primary mt-4">
                        {t('admin.agentDetails.empty.back')}
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
                        <Link href="/admin/agents" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </Link>
                        <UserIcon className="w-8 h-8 text-primary-500" />
                        <div>
                            <h1 className="text-xl font-bold text-white">{agent.fullName}</h1>
                            <p className="text-sm text-dark-400">{agent.agentProfile.agentCode}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleToggleStatus}
                            disabled={isProcessing}
                            className={`btn ${agent.isActive ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                        >
                            {agent.isActive ? (
                                <>
                                    <PauseCircleIcon className="w-5 h-5" />
                                    <span>{t('admin.agentDetails.toggleStatus.suspend')}</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span>{t('admin.agentDetails.toggleStatus.activate')}</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                const newLocale = currentLocale === 'ar' ? 'en' : 'ar';
                                document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
                                router.refresh();
                            }}
                            className="btn-ghost btn-icon"
                        >
                            <LanguageIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-6xl mx-auto">

                    {/* Status Cards */}
                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                        <div className="card p-4">
                            <p className="text-dark-400 text-sm mb-1">{t('admin.agentDetails.stats.status')}</p>
                            <div className="flex items-center gap-2">
                                {agent.isActive ? (
                                    <>
                                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                        <span className="text-green-400 font-medium">{t('admin.agentDetails.stats.active')}</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircleIcon className="w-5 h-5 text-red-500" />
                                        <span className="text-red-400 font-medium">{t('admin.agentDetails.stats.inactive')}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="card p-4">
                            <p className="text-dark-400 text-sm mb-1">{t('admin.agentDetails.stats.digitalBalance')}</p>
                            <p className="text-2xl font-bold text-primary-400">${formatAmount(agent.agentProfile.currentCredit)}</p>
                        </div>

                        <div className="card p-4">
                            <p className="text-dark-400 text-sm mb-1">{t('admin.agentDetails.stats.cashCollected')}</p>
                            <p className="text-2xl font-bold text-green-400">${formatAmount(agent.agentProfile.cashCollected)}</p>
                        </div>

                        <div className="card p-4">
                            <p className="text-dark-400 text-sm mb-1">{t('admin.agentDetails.stats.walletBalance')}</p>
                            <p className="text-2xl font-bold text-white">${formatAmount(agent.wallet.balance)}</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="card mb-6">
                        <div className="flex border-b border-dark-800">
                            <button
                                className={`px-6 py-4 font-medium transition-colors ${activeTab === 'info'
                                    ? 'text-primary-500 border-b-2 border-primary-500'
                                    : 'text-dark-400 hover:text-white'
                                    }`}
                                onClick={() => setActiveTab('info')}
                            >
                                {t('admin.agentDetails.tabs.info')}
                            </button>
                            <button
                                className={`px-6 py-4 font-medium transition-colors ${activeTab === 'transactions'
                                    ? 'text-primary-500 border-b-2 border-primary-500'
                                    : 'text-dark-400 hover:text-white'
                                    }`}
                                onClick={() => setActiveTab('transactions')}
                            >
                                {t('admin.agentDetails.tabs.transactions')} ({transactions.length})
                            </button>
                            <button
                                className={`px-6 py-4 font-medium transition-colors ${activeTab === 'settlements'
                                    ? 'text-primary-500 border-b-2 border-primary-500'
                                    : 'text-dark-400 hover:text-white'
                                    }`}
                                onClick={() => setActiveTab('settlements')}
                            >
                                {t('admin.agentDetails.tabs.settlements')} ({settlements.length})
                            </button>
                        </div>
                    </div>

                    {/* Info Tab */}
                    {activeTab === 'info' && (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="card p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">{t('admin.agentDetails.info.title')}</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.info.fullName')}</p>
                                        <p className="text-white">{agent.fullName}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.info.phone')}</p>
                                        <p className="text-white">{agent.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.info.email')}</p>
                                        <p className="text-white">{agent.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.info.dob')}</p>
                                        <p className="text-white">{agent.dateOfBirth ? formatDate(agent.dateOfBirth) : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.info.city')}</p>
                                        <p className="text-white">{agent.city || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.info.address')}</p>
                                        <p className="text-white">{agent.address || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.info.businessName')}</p>
                                        <p className="text-white">{agent.agentProfile.businessName}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.info.agentCode')}</p>
                                        <p className="text-white font-mono">{agent.agentProfile.agentCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.info.kycStatus')}</p>
                                        {getKYCBadge(agent.kycStatus)}
                                    </div>
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.info.joinedAt')}</p>
                                        <p className="text-white">{formatDate(agent.createdAt)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* KYC Documents */}
                            <div className="card p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">{t('admin.agentDetails.docs.title')}</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {agent.idPhotoUrl && (
                                        <div>
                                            <p className="text-dark-400 text-sm mb-2">{t('admin.agentDetails.docs.idPhoto')}</p>
                                            <img
                                                src={agent.idPhotoUrl}
                                                alt="ID"
                                                className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setShowImageModal(agent.idPhotoUrl!)}
                                            />
                                        </div>
                                    )}
                                    {agent.selfiePhotoUrl && (
                                        <div>
                                            <p className="text-dark-400 text-sm mb-2">{t('admin.agentDetails.docs.selfie')}</p>
                                            <img
                                                src={agent.selfiePhotoUrl}
                                                alt="Selfie"
                                                className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setShowImageModal(agent.selfiePhotoUrl!)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Statistics */}
                            <div className="card p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">{t('admin.monitor.stats.title')}</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.stats.totalDeposits')}</p>
                                        <p className="text-2xl font-bold text-green-400">${formatAmount(agent.agentProfile.totalDeposits)}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.stats.totalWithdrawals')}</p>
                                        <p className="text-2xl font-bold text-red-400">${formatAmount(agent.agentProfile.totalWithdrawals)}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-400 text-sm">{t('admin.agentDetails.stats.txCount')}</p>
                                        <p className="text-2xl font-bold text-white">{transactions.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Transactions Tab */}
                    {activeTab === 'transactions' && (
                        <div className="space-y-3">
                            {transactions.length === 0 ? (
                                <div className="card p-12 text-center">
                                    <p className="text-dark-300">{t('admin.agentDetails.empty.noTx')}</p>
                                </div>
                            ) : (
                                transactions.map((tx) => (
                                    <Link
                                        key={tx.id}
                                        href={`/admin/transactions/${tx.id}`}
                                        className="card p-4 block hover:border-primary-500/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <p className="text-white font-medium">
                                                        {tx.descriptionAr || tx.description}
                                                    </p>
                                                    <span className={`badge ${tx.status === 'COMPLETED' ? 'badge-success' : tx.status === 'PENDING' ? 'badge-warning' : 'badge-error'}`}>
                                                        {tx.status === 'COMPLETED' ? 'مكتمل' : tx.status === 'PENDING' ? 'معلق' : 'فشل'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-dark-400">
                                                    <span>{tx.counterparty}</span>
                                                    <span>•</span>
                                                    <span>{tx.referenceNumber}</span>
                                                    <span>•</span>
                                                    <span>{formatDate(tx.createdAt)}</span>
                                                </div>
                                            </div>
                                            <div className="text-end">
                                                <p className={`font-bold ${tx.isOutgoing ? 'text-red-500' : 'text-green-500'}`}>
                                                    {tx.isOutgoing ? '-' : '+'}{formatAmount(tx.amount)} $
                                                </p>
                                                {tx.fee > 0 && (
                                                    <p className="text-dark-500 text-xs">رسوم: {formatAmount(tx.fee)} $</p>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    )}

                    {/* Settlements Tab */}
                    {activeTab === 'settlements' && (
                        <div className="space-y-3">
                            {settlements.length === 0 ? (
                                <div className="card p-12 text-center">
                                    <p className="text-dark-300">{t('admin.agentDetails.empty.noSettlements')}</p>
                                </div>
                            ) : (
                                settlements.map((settlement) => (
                                    <div key={settlement.id} className="card p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-medium mb-1">
                                                    تسوية ${formatAmount(settlement.amountDue)}
                                                </p>
                                                <p className="text-dark-400 text-sm">
                                                    {formatDate(settlement.createdAt)}
                                                </p>
                                            </div>
                                            <span className={`badge ${settlement.status === 'APPROVED' ? 'badge-success' : settlement.status === 'PENDING' ? 'badge-warning' : 'badge-error'}`}>
                                                {settlement.status === 'APPROVED' ? 'موافق' : settlement.status === 'PENDING' ? 'معلق' : 'مرفوض'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Image Modal */}
            {showImageModal && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowImageModal(null)}
                >
                    <img
                        src={showImageModal}
                        alt="Document"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            )}
        </div>
    );
}
