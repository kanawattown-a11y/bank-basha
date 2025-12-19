'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { TicketIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Ticket {
    id: string;
    ticketNumber: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    user?: {
        fullName: string;
        phone: string;
    };
    contactName?: string;
    contactPhone?: string;
    _count: {
        messages: number;
    };
}

export default function AdminSupportPage() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [stats, setStats] = useState<any[]>([]);

    useEffect(() => {
        fetchTickets();
    }, [filter]);

    const fetchTickets = async () => {
        try {
            const url = filter === 'ALL'
                ? '/api/admin/support/tickets'
                : `/api/admin/support/tickets?status=${filter}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setTickets(data.tickets || []);
                setStats(data.stats || []);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'IN_PROGRESS': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'WAITING_USER': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'WAITING_ADMIN': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'RESOLVED': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'CLOSED': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            default: return 'bg-dark-700 text-dark-300 border-dark-600';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'URGENT': return '⚠️';
            case 'HIGH': return '🔴';
            case 'MEDIUM': return '🟡';
            case 'LOW': return '🟢';
            default: return '';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 p-4 lg:p-8 lg:ms-64">
                <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
                    <div className="spinner w-12 h-12"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950 p-4 lg:p-8 lg:ms-64">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {t('support.title')}
                    </h1>
                    <p className="text-dark-400">
                        {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
                    </p>
                </div>

                {/* Stats */}
                {stats.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                        {stats.map((stat) => (
                            <div key={stat.status} className="card p-4">
                                <p className="text-dark-400 text-sm mb-1">
                                    {t(`support.statuses.${stat.status}`)}
                                </p>
                                <p className="text-2xl font-bold text-white">
                                    {stat._count}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_ADMIN', 'WAITING_USER', 'RESOLVED', 'CLOSED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === status
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                }`}
                        >
                            {status === 'ALL' ? t('common.all') : t(`support.statuses.${status}`)}
                        </button>
                    ))}
                </div>

                {/* Tickets List */}
                {tickets.length === 0 ? (
                    <div className="card p-12 text-center">
                        <TicketIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                        <p className="text-dark-400">{t('support.messages.noTickets')}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tickets.map((ticket) => (
                            <Link
                                key={ticket.id}
                                href={`/admin/support/${ticket.id}`}
                                className="card p-4 sm:p-5 block hover:bg-dark-800/50 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="text-dark-400 text-sm">
                                                {t('support.ticketNumber')}{ticket.ticketNumber}
                                            </span>
                                            <span className="text-dark-600">•</span>
                                            <span className="text-sm">
                                                {getPriorityIcon(ticket.priority)}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                                                {t(`support.statuses.${ticket.status}`)}
                                            </span>
                                        </div>

                                        <h3 className="text-white font-semibold mb-2">
                                            {ticket.subject}
                                        </h3>

                                        <div className="flex items-center gap-4 text-sm text-dark-400 flex-wrap">
                                            <div className="flex items-center gap-1">
                                                <UserIcon className="w-4 h-4" />
                                                {ticket.user?.fullName || ticket.contactName || 'Guest'}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                </svg>
                                                {t(`support.categories.${ticket.category}`)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <ClockIcon className="w-4 h-4" />
                                                {new Date(ticket.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                </svg>
                                                {ticket._count.messages}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
