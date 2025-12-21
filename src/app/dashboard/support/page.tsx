'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
    PlusIcon,
    TicketIcon,
    ClockIcon,
    ArrowLeftIcon,
    ChatBubbleLeftRightIcon,
    PaperClipIcon,
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

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-500/20 text-blue-400';
            case 'IN_PROGRESS': return 'bg-yellow-500/20 text-yellow-400';
            case 'WAITING_USER': return 'bg-purple-500/20 text-purple-400';
            case 'WAITING_ADMIN': return 'bg-orange-500/20 text-orange-400';
            case 'RESOLVED': return 'bg-green-500/20 text-green-400';
            case 'CLOSED': return 'bg-gray-500/20 text-gray-400';
            default: return 'bg-dark-700 text-dark-300';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'URGENT': return '🔥';
            case 'HIGH': return '🔴';
            case 'MEDIUM': return '🟡';
            case 'LOW': return '🟢';
            default: return '';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Fixed Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-dark-900 border-b border-dark-800 safe-top">
                <div className="px-3 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard"
                            className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-white hover:bg-dark-700 transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Link>
                        <h1 className="text-lg font-bold text-white">🎫 {t('support.title')}</h1>
                    </div>
                    <Link
                        href="/dashboard/support/new"
                        className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-dark-900 hover:bg-primary-400 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </Link>
                </div>
            </header>

            <main className="pt-16 pb-24 px-3">
                {/* Filter Pills */}
                <div className="py-3 -mx-3 px-3 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === status
                                        ? 'bg-primary-500 text-dark-900'
                                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                    }`}
                            >
                                {status === 'ALL' ? 'الكل' : t(`support.statuses.${status}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tickets List */}
                {tickets.length === 0 ? (
                    <div className="mt-8 text-center py-12">
                        <div className="w-20 h-20 rounded-full bg-dark-800 flex items-center justify-center mx-auto mb-4">
                            <TicketIcon className="w-10 h-10 text-dark-600" />
                        </div>
                        <p className="text-dark-400 mb-4">{t('support.messages.noTickets')}</p>
                        <Link
                            href="/dashboard/support/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-dark-900 rounded-xl font-medium text-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            تذكرة جديدة
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3 mt-2">
                        {tickets.map((ticket) => (
                            <Link
                                key={ticket.id}
                                href={`/dashboard/support/${ticket.id}`}
                                className="block bg-dark-900 border border-dark-800 rounded-xl p-3 hover:border-dark-700 transition-colors active:bg-dark-800"
                            >
                                {/* Header Row */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-dark-500">#{ticket.ticketNumber}</span>
                                            <span>{getPriorityIcon(ticket.priority)}</span>
                                        </div>
                                        <h3 className="text-white font-medium text-sm truncate">
                                            {ticket.subject}
                                        </h3>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex-shrink-0 ${getStatusStyle(ticket.status)}`}>
                                        {t(`support.statuses.${ticket.status}`)}
                                    </span>
                                </div>

                                {/* Last Message Preview */}
                                {ticket.messages[0] && (
                                    <p className="text-dark-400 text-xs line-clamp-1 mb-2">
                                        {ticket.messages[0].message}
                                    </p>
                                )}

                                {/* Footer */}
                                <div className="flex items-center gap-3 text-[10px] text-dark-500">
                                    <span className="flex items-center gap-1">
                                        <ClockIcon className="w-3 h-3" />
                                        {new Date(ticket.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <ChatBubbleLeftRightIcon className="w-3 h-3" />
                                        {ticket._count.messages}
                                    </span>
                                    {ticket._count.attachments > 0 && (
                                        <span className="flex items-center gap-1">
                                            <PaperClipIcon className="w-3 h-3" />
                                            {ticket._count.attachments}
                                        </span>
                                    )}
                                    <span className="text-dark-600">
                                        {t(`support.categories.${ticket.category}`)}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
