'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function NewTicketPage() {
    const t = useTranslations();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        category: 'ACCOUNT_ISSUE',
        priority: 'MEDIUM',
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/support/upload-attachment', {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.fileUrl;
                }
                return null;
            });

            const urls = await Promise.all(uploadPromises);
            setAttachments(prev => [...prev, ...urls.filter(Boolean)]);
        } catch (error) {
            console.error('Upload error:', error);
            alert(t('support.messages.uploadError'));
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/support/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    attachments,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                router.push(`/dashboard/support/${data.ticket.id}`);
            } else {
                throw new Error('Failed to create ticket');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            alert('Failed to create ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Fixed Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-dark-900 border-b border-dark-800 safe-top">
                <div className="px-3 py-3 flex items-center gap-3">
                    <Link
                        href="/dashboard/support"
                        className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-white hover:bg-dark-700 transition-colors flex-shrink-0"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-bold text-white">
                        ✏️ {t('support.createTicket')}
                    </h1>
                </div>
            </header>

            {/* Form */}
            <main className="pt-16 pb-8 px-3">
                <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">

                    {/* Subject */}
                    <div className="bg-dark-900 rounded-xl p-4 border border-dark-800">
                        <label className="block text-xs font-medium text-dark-400 mb-2">
                            {t('support.subject')} *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.subject}
                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
                            placeholder="عنوان مشكلتك..."
                        />
                    </div>

                    {/* Category & Priority Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-dark-900 rounded-xl p-4 border border-dark-800">
                            <label className="block text-xs font-medium text-dark-400 mb-2">
                                {t('support.category')}
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                            >
                                {['ACCOUNT_ISSUE', 'PAYMENT_ISSUE', 'TECHNICAL_ISSUE', 'KYC_VERIFICATION', 'SUSPENSION_APPEAL', 'FEATURE_REQUEST', 'OTHER'].map(cat => (
                                    <option key={cat} value={cat}>
                                        {t(`support.categories.${cat}`)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-dark-900 rounded-xl p-4 border border-dark-800">
                            <label className="block text-xs font-medium text-dark-400 mb-2">
                                {t('support.priority')}
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                            >
                                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(pri => (
                                    <option key={pri} value={pri}>
                                        {t(`support.priorities.${pri}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-dark-900 rounded-xl p-4 border border-dark-800">
                        <label className="block text-xs font-medium text-dark-400 mb-2">
                            {t('support.description')} *
                        </label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors min-h-[120px] resize-none"
                            placeholder="اشرح مشكلتك بالتفصيل..."
                        />
                    </div>

                    {/* Attachments */}
                    <div className="bg-dark-900 rounded-xl p-4 border border-dark-800">
                        <label className="block text-xs font-medium text-dark-400 mb-3">
                            {t('support.attachments')}
                        </label>

                        <label className="flex items-center justify-center gap-2 w-full py-3 bg-dark-800 border border-dashed border-dark-600 rounded-lg text-dark-400 text-sm cursor-pointer hover:border-primary-500 hover:text-primary-500 transition-colors">
                            <PaperClipIcon className="w-5 h-5" />
                            {uploading ? 'جاري الرفع...' : 'إضافة صورة'}
                            <input
                                type="file"
                                multiple
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                        </label>

                        {attachments.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                {attachments.map((url, idx) => (
                                    <div key={idx} className="relative aspect-square">
                                        <img
                                            src={url}
                                            alt={`مرفق ${idx + 1}`}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                                        >
                                            <XMarkIcon className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 py-3 bg-dark-800 text-dark-300 rounded-xl font-medium text-sm hover:bg-dark-700 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.subject || !formData.description}
                            className="flex-1 py-3 bg-primary-500 text-dark-900 rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-400 transition-colors"
                        >
                            {isSubmitting ? 'جاري الإرسال...' : t('common.submit')}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
