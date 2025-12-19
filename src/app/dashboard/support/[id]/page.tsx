'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeftIcon, PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/outline';

interface Message {
    id: string;
    message: string;
    isAdmin: boolean;
    createdAt: string;
    user?: {
        fullName: string;
    };
    attachments: Array<{
        fileUrl: string;
        fileName: string;
    }>;
}

interface Ticket {
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
    category: string;
    priority: string;
    createdAt: string;
    user?: {
        fullName: string;
    };
    messages: Message[];
}

export default function TicketDetailPage() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const params = useParams();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        fetchTicket();
    }, [params.id]);

    useEffect(() => {
        scrollToBottom();
    }, [ticket?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTicket = async () => {
        try {
            const response = await fetch(`/api/support/tickets/${params.id}`);
            if (response.ok) {
                const data = await response.json();
                setTicket(data.ticket);
            } else {
                router.push('/dashboard/support');
            }
        } catch (error) {
            console.error('Error fetching ticket:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        setIsSending(true);
        try {
            const response = await fetch(`/api/support/tickets/${params.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message.trim() }),
            });

            if (response.ok) {
                setMessage('');
                fetchTicket();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 pt-20 pb-24 px-4 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    if (!ticket) {
        return null;
    }

    return (
        <div className="min-h-screen bg-dark-950 flex flex-col">
            {/* Header */}
            <div className="bg-dark-900 border-b border-dark-800 pt-20 px-4 pb-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-3">
                        <button onClick={() => router.back()} className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-bold text-white truncate">
                                {ticket.subject}
                            </h1>
                            <p className="text-sm text-dark-400">
                                {t('support.ticketNumber')}{ticket.ticketNumber}
                            </p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${ticket.status === 'CLOSED' ? 'bg-gray-500/20 text-gray-400' :
                                ticket.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                                    'bg-blue-500/20 text-blue-400'
                            }`}>
                            {t(`support.statuses.${ticket.status}`)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-4xl mx-auto space-y-4">
                    {ticket.messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
                        >
                            <div className={`max-w-[80%] sm:max-w-[70%] ${msg.isAdmin ? 'bg-dark-800' : 'bg-primary-500'} rounded-2xl px-4 py-3`}>
                                {msg.isAdmin && (
                                    <p className="text-xs text-dark-400 mb-1">
                                        {t('support.title')} {msg.user?.fullName && `• ${msg.user.fullName}`}
                                    </p>
                                )}
                                <p className="text-white text-sm whitespace-pre-wrap break-words">
                                    {msg.message}
                                </p>
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {msg.attachments.map((att, idx) => (
                                            <img
                                                key={idx}
                                                src={att.fileUrl}
                                                alt={att.fileName}
                                                className="w-full h-24 object-cover rounded-lg cursor-pointer"
                                                onClick={() => window.open(att.fileUrl, '_blank')}
                                            />
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-dark-400 mt-1">
                                    {new Date(msg.createdAt).toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            {ticket.status !== 'CLOSED' && (
                <div className="bg-dark-900 border-t border-dark-800 p-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={t('support.reply')}
                                className="input flex-1"
                                disabled={isSending}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!message.trim() || isSending}
                                className="btn-primary"
                            >
                                <PaperAirplaneIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
