'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import AttachmentImage from '@/components/AttachmentImage';

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
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    if (!ticket) {
        return null;
    }

    return (
        <div className="min-h-screen bg-dark-950 flex flex-col">
            {/* Fixed Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-dark-900 border-b border-dark-800 safe-top">
                <div className="px-3 py-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-white hover:bg-dark-700 transition-colors flex-shrink-0"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-sm font-bold text-white truncate leading-tight">
                                {ticket.subject}
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-dark-400">#{ticket.ticketNumber}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ticket.status === 'CLOSED' ? 'bg-gray-500/20 text-gray-400' :
                                        ticket.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                                            'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {t(`support.statuses.${ticket.status}`)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages Area - Full Height with Scroll */}
            <main className="flex-1 overflow-y-auto pt-20 pb-20">
                <div className="px-3 py-4 space-y-3">
                    {ticket.messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${msg.isAdmin
                                        ? 'bg-dark-800 rounded-tr-sm'
                                        : 'bg-primary-500 rounded-tl-sm'
                                    }`}
                            >
                                {msg.isAdmin && (
                                    <p className="text-[10px] text-primary-400 font-medium mb-1">
                                        🛡️ الدعم الفني
                                    </p>
                                )}
                                <p className="text-white text-sm whitespace-pre-wrap break-words leading-relaxed">
                                    {msg.message}
                                </p>

                                {/* Attachments */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className={`grid gap-2 mt-2 ${msg.attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                                        }`}>
                                        {msg.attachments.map((att, idx) => (
                                            <AttachmentImage
                                                key={idx}
                                                src={att.fileUrl}
                                                alt={att.fileName || 'مرفق'}
                                                className="w-full h-24 object-cover rounded-lg"
                                            />
                                        ))}
                                    </div>
                                )}

                                <p className={`text-[10px] mt-1.5 ${msg.isAdmin ? 'text-dark-500' : 'text-white/60'
                                    }`}>
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
            </main>

            {/* Fixed Input at Bottom */}
            {ticket.status !== 'CLOSED' && (
                <div className="fixed bottom-0 left-0 right-0 bg-dark-900 border-t border-dark-800 safe-bottom z-40">
                    <div className="px-3 py-3">
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="اكتب رسالتك..."
                                className="flex-1 bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
                                disabled={isSending}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!message.trim() || isSending}
                                className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center text-dark-900 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 hover:bg-primary-400 transition-colors"
                            >
                                {isSending ? (
                                    <div className="spinner w-5 h-5 border-dark-900"></div>
                                ) : (
                                    <PaperAirplaneIcon className="w-5 h-5 rotate-[-45deg]" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
