'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface Message {
    id: string;
    message: string;
    isAdmin: boolean;
    createdAt: string;
    user?: { fullName: string; userType: string };
}

interface Ticket {
    id: string;
    ticketNumber: string;
    subject: string;
    description: string;
    status: string;
    category: string;
    priority: string;
    createdAt: string;
    user?: {
        id: string;
        fullName: string;
        phone: string;
        email: string;
        userType: string;
        kycStatus: string;
    };
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    messages: Message[];
}

export default function AdminTicketDetailPage() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const params = useParams();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [newStatus, setNewStatus] = useState('');

    useEffect(() => {
        fetchTicket();
    }, [params.id]);

    useEffect(() => {
        scrollToBottom();
    }, [ticket?.messages]);

    useEffect(() => {
        if (ticket) {
            setNewStatus(ticket.status);
        }
    }, [ticket]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTicket = async () => {
        try {
            const response = await fetch(`/api/admin/support/tickets/${params.id}`);
            if (response.ok) {
                const data = await response.json();
                setTicket(data.ticket);
            }
        } catch (error) {
            console.error('Error fetching ticket:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!message.trim()) return;

        setIsSending(true);
        try {
            const response = await fetch(`/api/admin/support/tickets/${params.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message.trim(),
                    updateStatus: newStatus !== ticket?.status ? newStatus : undefined,
                }),
            });

            if (response.ok) {
                setMessage('');
                fetchTicket();
            }
        } catch (error) {
            console.error('Error sending reply:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 p-4 lg:p-8 lg:ms-64 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    if (!ticket) {
        return null;
    }

    return (
        <div className="min-h-screen bg-dark-950 p-4 lg:p-8 lg:ms-64">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.back()} className="btn-ghost btn-icon">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-white mb-1">
                            {ticket.subject}
                        </h1>
                        <p className="text-sm text-dark-400">
                            {t('support.ticketNumber')}{ticket.ticketNumber}
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Messages */}
                        <div className="card p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">
                                {t('support.messages.messages') || 'Messages'}
                            </h2>
                            <div className="space-y-3 mb-6 max-h-[500px] overflow-y-auto">
                                {ticket.messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
                                    >
                                        <div className={`max-w-[80%] ${msg.isAdmin ? 'bg-dark-800' : 'bg-primary-500'} rounded-2xl px-4 py-3`}>
                                            {msg.user && (
                                                <p className="text-xs text-dark-400 mb-1">
                                                    {msg.user.fullName}
                                                    {msg.isAdmin && ' (Support)'}
                                                </p>
                                            )}
                                            <p className="text-white text-sm whitespace-pre-wrap">
                                                {msg.message}
                                            </p>
                                            <p className="text-xs text-dark-400 mt-1">
                                                {new Date(msg.createdAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply Box */}
                            {ticket.status !== 'CLOSED' && (
                                <div className="space-y-3 border-t border-dark-800 pt-4">
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder={t('support.reply')}
                                        className="input w-full min-h-[100px]"
                                        disabled={isSending}
                                    />
                                    <div className="flex gap-3">
                                        <select
                                            value={newStatus}
                                            onChange={(e) => setNewStatus(e.target.value)}
                                            className="input"
                                        >
                                            {['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'WAITING_ADMIN', 'RESOLVED', 'CLOSED'].map(status => (
                                                <option key={status} value={status}>
                                                    {t(`support.statuses.${status}`)}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleSendReply}
                                            disabled={!message.trim() || isSending}
                                            className="btn-primary"
                                        >
                                            <PaperAirplaneIcon className="w-5 h-5" />
                                            {t('support.send')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* User Info */}
                        <div className="card p-4">
                            <h3 className="text-sm font-semibold text-white mb-3">
                                {t('support.contactInfo')}
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <p className="text-dark-400">Name</p>
                                    <p className="text-white">{ticket.user?.fullName || ticket.contactName}</p>
                                </div>
                                <div>
                                    <p className="text-dark-400">Phone</p>
                                    <p className="text-white">{ticket.user?.phone || ticket.contactPhone}</p>
                                </div>
                                {(ticket.user?.email || ticket.contactEmail) && (
                                    <div>
                                        <p className="text-dark-400">Email</p>
                                        <p className="text-white">{ticket.user?.email || ticket.contactEmail}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Ticket Info */}
                        <div className="card p-4">
                            <h3 className="text-sm font-semibold text-white mb-3">Ticket Info</h3>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <p className="text-dark-400">Category</p>
                                    <p className="text-white">{t(`support.categories.${ticket.category}`)}</p>
                                </div>
                                <div>
                                    <p className="text-dark-400">Priority</p>
                                    <p className="text-white">{t(`support.priorities.${ticket.priority}`)}</p>
                                </div>
                                <div>
                                    <p className="text-dark-400">Status</p>
                                    <p className="text-white">{t(`support.statuses.${ticket.status}`)}</p>
                                </div>
                                <div>
                                    <p className="text-dark-400">Created</p>
                                    <p className="text-white">{new Date(ticket.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
