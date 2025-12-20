'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
    PlusIcon,
    TicketIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface Ticket {
    id: string;
    ticketNumber: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    _count: {
        messages: number;
        attachments: number;
    };
    messages: {
        message: string;
        createdAt: string;
    }[];
}

export default function SupportPage() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        fetchTickets();
    }, [filter]);

    const fetchTickets = async () => {
        try {
            const url = filter === 'ALL'
                ? '/api/support/tickets'
                : `/api/support/tickets?status=${filter}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setTickets(data.tickets || []);
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
            <div className="min-h-screen bg-dark-950 pt-20 pb-24 px-4">
                <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
                    <div className="spinner w-12 h-12"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href="/dashboard" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-lg sm:text-xl font-bold text-white">{t('support.title')}</h1>
                    </div>
                    <Link
                        href="/dashboard/support/new"
                        className="btn-primary btn-sm text-xs sm:text-sm"
                    >
                        <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">{t('support.newTicket')}</span>
                        <span className="sm:hidden">+</span>
                    </Link>
                </div>
            </header>

            <main className="pt-20 pb-24 px-4">
                <div className="max-w-4xl mx-auto">

                    {/* Filters */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'].map((status) => (
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
                        <div className="space-y-4">
                            {tickets.map((ticket) => (
                                <Link
                                    key={ticket.id}
                                    href={`/dashboard/support/${ticket.id}`}
                                    className="card p-4 sm:p-6 block hover:bg-dark-800/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-dark-400 text-sm">
                                                    {t('support.ticketNumber')}{ticket.ticketNumber}
                                                </span>
                                                <span className="text-dark-600">•</span>
                                                <span className="text-sm">
                                                    {getPriorityIcon(ticket.priority)}
                                                </span>
                                            </div>
                                            <h3 className="text-white font-semibold mb-1 truncate">
                                                {ticket.subject}
                                            </h3>
                                            <p className="text-dark-400 text-sm">
                                                {t(`support.categories.${ticket.category}`)}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                                            {t(`support.statuses.${ticket.status}`)}
                                        </span>
                                    </div>

                                    {ticket.messages[0] && (
                                        <p className="text-dark-400 text-sm mb-3 line-clamp-2">
                                            {ticket.messages[0].message}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-4 text-sm text-dark-500">
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
                                        {ticket._count.attachments > 0 && (
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                {ticket._count.attachments}
                                            </div>
                                        )}
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
