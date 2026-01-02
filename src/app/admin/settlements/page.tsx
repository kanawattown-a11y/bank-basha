'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    BanknotesIcon,
    PlusCircleIcon,
    ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface Agent {
    agentCode: string;
    businessName: string;
    businessNameAr?: string;
    cashCollected: number;
}

interface Settlement {
    id: string;
    settlementNumber: string;
    type: string;
    requestedAmount: number;
    cashCollected?: number;
    platformShare?: number;
    agentShare?: number;
    amountDue?: number;
    creditGiven?: number;
    cashToReceive?: number;
    creditDeducted?: number;
    deliveryMethod?: string;
    deliveryStatus?: string;
    sourceAgentId?: string;
    status: string;
    createdAt: string;
    agent: {
        agentCode: string;
        businessName: string;
        businessNameAr?: string;
    };
    sourceAgent?: {
        agentCode: string;
        businessName: string;
        businessNameAr?: string;
    };
}

export default function AdminSettlementsPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING');
    const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
    const [deliveryMethod, setDeliveryMethod] = useState('');
    const [sourceAgentId, setSourceAgentId] = useState('');
    const [agentsWithCash, setAgentsWithCash] = useState<Agent[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchSettlements();
    }, []);

    const fetchSettlements = async () => {
        try {
            const response = await fetch('/api/admin/settlements/all');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const data = await response.json();
            setSettlements(data.settlements || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAgentsWithCash = async (minAmount: number) => {
        try {
            const response = await fetch(`/api/admin/agents/with-cash?minAmount=${minAmount}`);
            if (response.ok) {
                const data = await response.json();
                setAgentsWithCash(data.agents || []);
            }
        } catch (error) {
            console.error('Error fetching agents:', error);
        }
    };

    const handleAction = async (settlementId: string, action: 'approve' | 'reject' | 'confirm_delivery', notes?: string) => {
        setIsProcessing(true);
        try {
            const body: any = { settlementId, action };

            if (action === 'approve' && selectedSettlement?.type === 'CASH_REQUEST') {
                body.deliveryMethod = deliveryMethod;
                if (deliveryMethod === 'FROM_AGENT') {
                    body.sourceAgentId = sourceAgentId;
                }
            }

            if (notes) {
                body.notes = notes;
            }

            await fetch('/api/admin/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            setSelectedSettlement(null);
            setDeliveryMethod('');
            setSourceAgentId('');
            fetchSettlements();
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
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="badge-warning">{t('admin.settlements.status.pending')}</span>;
            case 'APPROVED':
                return <span className="badge-info">{t('admin.settlements.status.approved')}</span>;
            case 'COMPLETED':
                return <span className="badge-success">{t('admin.settlements.status.completed')}</span>;
            case 'REJECTED':
                return <span className="badge-error">{t('admin.settlements.status.rejected')}</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    const getTypeBadge = (type: string) => {
        const typeKey = type as 'CASH_TO_CREDIT' | 'CREDIT_REQUEST' | 'CASH_REQUEST';
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${type === 'CASH_TO_CREDIT' ? 'bg-primary-500/20 text-primary-400' :
                    type === 'CREDIT_REQUEST' ? 'bg-secondary-500/20 text-secondary-400' :
                        'bg-accent-500/20 text-accent-400'
                }`}>
                {type === 'CASH_TO_CREDIT' && '💵→💳 '}
                {type === 'CREDIT_REQUEST' && '📈 '}
                {type === 'CASH_REQUEST' && '💰 '}
                {t(`admin.settlements.types.${typeKey}`)}
            </span>
        );
    };

    const openSettlementModal = async (settlement: Settlement) => {
        setSelectedSettlement(settlement);
        if (settlement.type === 'CASH_REQUEST' && settlement.cashToReceive) {
            await fetchAgentsWithCash(settlement.cashToReceive);
        }
    };

    const filteredSettlements = settlements.filter(s => filter === 'all' || s.status === filter);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
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
                        <h1 className="text-lg font-semibold text-white">{t('admin.settlements.title')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Filters */}
                    <div className="flex gap-2 mb-6 overflow-x-auto">
                        {['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED', 'all'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${filter === f
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                    }`}
                            >
                                {t(`admin.settlements.filters.${f === 'all' ? 'all' : f.toLowerCase()}`)}
                            </button>
                        ))}
                    </div>

                    {/* Settlements Table */}
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-dark-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-300">
                                            {t('admin.settlements.labels.requestedAmount')}
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-300">Type</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-300">
                                            {t('admin.settlements.agent')}
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-300">
                                            {t('admin.settlements.amount')}
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-300">
                                            {t('admin.settlements.status')}
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-300">
                                            {t('admin.settlements.date')}
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-300">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-800">
                                    {filteredSettlements.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-dark-400">
                                                <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>{t('admin.settlements.empty')}</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSettlements.map((settlement) => (
                                            <tr key={settlement.id} className="hover:bg-dark-800/50">
                                                <td className="px-4 py-3 text-white font-mono">
                                                    {settlement.settlementNumber}
                                                </td>
                                                <td className="px-4 py-3">{getTypeBadge(settlement.type)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="text-white font-medium">
                                                        {settlement.agent.businessNameAr || settlement.agent.businessName}
                                                    </div>
                                                    <div className="text-sm text-dark-400">
                                                        {settlement.agent.agentCode}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-primary-500 font-semibold">
                                                        ${formatAmount(settlement.requestedAmount)}
                                                    </div>
                                                    {settlement.deliveryStatus && (
                                                        <div className="text-xs text-blue-400 mt-1">
                                                            {settlement.deliveryStatus}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">{getStatusBadge(settlement.status)}</td>
                                                <td className="px-4 py-3 text-sm text-dark-400">
                                                    {formatDate(settlement.createdAt)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => openSettlementModal(settlement)}
                                                        className="btn-ghost btn-sm"
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Settlement Modal */}
            {selectedSettlement && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">
                                    Settlement Details
                                </h2>
                                <button
                                    onClick={() => setSelectedSettlement(null)}
                                    className="btn-ghost btn-icon"
                                >
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Type & Amount */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-dark-400 mb-1">Type</div>
                                        {getTypeBadge(selectedSettlement.type)}
                                    </div>
                                    <div>
                                        <div className="text-sm text-dark-400 mb-1">Requested Amount</div>
                                        <div className="text-2xl font-bold text-primary-500">
                                            ${formatAmount(selectedSettlement.requestedAmount)}
                                        </div>
                                    </div>
                                </div>

                                {/* Type-specific details */}
                                {selectedSettlement.type === 'CASH_TO_CREDIT' && (
                                    <div className="bg-dark-800 p-4 rounded-xl space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-dark-400">Cash Collected:</span>
                                            <span className="text-white">${formatAmount(selectedSettlement.cashCollected || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-dark-400">Platform Fee:</span>
                                            <span className="text-red-400">-${formatAmount(selectedSettlement.platformShare || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-dark-400">Agent Fee:</span>
                                            <span className="text-red-400">-${formatAmount(selectedSettlement.agentShare || 0)}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold border-t border-dark-700 pt-2">
                                            <span className="text-dark-300">Credit to Give:</span>
                                            <span className="text-green-400">${formatAmount(selectedSettlement.amountDue || 0)}</span>
                                        </div>
                                    </div>
                                )}

                                {selectedSettlement.type === 'CREDIT_REQUEST' && (
                                    <div className="bg-dark-800 p-4 rounded-xl">
                                        <div className="flex justify-between">
                                            <span className="text-dark-400">Credit to Give:</span>
                                            <span className="text-green-400 font-semibold">
                                                ${formatAmount(selectedSettlement.creditGiven || 0)}
                                            </span>
                                        </div>
                                        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                            <p className="text-xs text-orange-400">⚠️ This is a loan - agent must repay later</p>
                                        </div>
                                    </div>
                                )}

                                {selectedSettlement.type === 'CASH_REQUEST' && (
                                    <>
                                        <div className="bg-dark-800 p-4 rounded-xl space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-dark-400">Cash Needed:</span>
                                                <span className="text-white">${formatAmount(selectedSettlement.cashToReceive || 0)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-dark-400">Credit Deducted:</span>
                                                <span className="text-red-400">-${formatAmount(selectedSettlement.creditDeducted || 0)}</span>
                                            </div>
                                        </div>

                                        {/* Delivery Method Selector */}
                                        {selectedSettlement.status === 'PENDING' && (
                                            <div>
                                                <label className="block text-sm text-dark-300 mb-2">
                                                    Delivery Method *
                                                </label>
                                                <select
                                                    value={deliveryMethod}
                                                    onChange={(e) => {
                                                        setDeliveryMethod(e.target.value);
                                                        setSourceAgentId('');
                                                    }}
                                                    className="input w-full"
                                                >
                                                    <option value="">Select method...</option>
                                                    <option value="FROM_PLATFORM">From Platform Office</option>
                                                    <option value="FROM_ADMIN">Direct from Admin</option>
                                                    <option value="FROM_AGENT">From Another Agent</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Agent Selector */}
                                        {deliveryMethod === 'FROM_AGENT' && selectedSettlement.status === 'PENDING' && (
                                            <div>
                                                <label className="block text-sm text-dark-300 mb-2">
                                                    Select Source Agent *
                                                </label>
                                                <select
                                                    value={sourceAgentId}
                                                    onChange={(e) => setSourceAgentId(e.target.value)}
                                                    className="input w-full"
                                                >
                                                    <option value="">Select agent...</option>
                                                    {agentsWithCash.map(agent => (
                                                        <option key={agent.agentCode} value={agent.agentCode}>
                                                            {agent.businessNameAr || agent.businessName} -
                                                            Cash: ${formatAmount(agent.cashCollected)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Show delivery info if approved */}
                                        {selectedSettlement.deliveryMethod && (
                                            <div className="bg-blue-500/10 p-4 rounded-xl">
                                                <div className="text-sm text-blue-400 mb-2">Delivery Info:</div>
                                                <div className="text-white">
                                                    Method: {selectedSettlement.deliveryMethod}
                                                </div>
                                                {selectedSettlement.sourceAgent && (
                                                    <div className="text-dark-300 text-sm">
                                                        From: {selectedSettlement.sourceAgent.businessName}
                                                    </div>
                                                )}
                                                <div className="text-dark-300 text-sm mt-2">
                                                    Status: {selectedSettlement.deliveryStatus}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    {selectedSettlement.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => handleAction(selectedSettlement.id, 'approve')}
                                                disabled={
                                                    isProcessing ||
                                                    (selectedSettlement.type === 'CASH_REQUEST' && !deliveryMethod) ||
                                                    (deliveryMethod === 'FROM_AGENT' && !sourceAgentId)
                                                }
                                                className="btn-success flex-1"
                                            >
                                                {isProcessing ? <div className="spinner w-5 h-5" /> : (
                                                    <>
                                                        <CheckCircleIcon className="w-5 h-5" />
                                                        <span>Approve</span>
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleAction(selectedSettlement.id, 'reject')}
                                                disabled={isProcessing}
                                                className="btn-error flex-1"
                                            >
                                                <XCircleIcon className="w-5 h-5" />
                                                <span>Reject</span>
                                            </button>
                                        </>
                                    )}

                                    {selectedSettlement.status === 'APPROVED' &&
                                        selectedSettlement.type === 'CASH_REQUEST' &&
                                        selectedSettlement.deliveryStatus === 'PENDING' && (
                                            <button
                                                onClick={() => handleAction(selectedSettlement.id, 'confirm_delivery')}
                                                disabled={isProcessing}
                                                className="btn-primary w-full"
                                            >
                                                {isProcessing ? <div className="spinner w-5 h-5" /> : (
                                                    <>
                                                        <CheckCircleIcon className="w-5 h-5" />
                                                        <span>Confirm Delivery</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
