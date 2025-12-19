'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
        <div className="min-h-screen bg-dark-950 pt-20 pb-24 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.back()} className="btn-ghost btn-icon">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">
                        {t('support.createTicket')}
                    </h1>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="card p-6 space-y-6">
                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            {t('support.subject')} *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.subject}
                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                            className="input w-full"
                            placeholder={t('support.subject')}
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            {t('support.category')} *
                        </label>
                        <select
                            required
                            value={formData.category}
                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                            className="input w-full"
                        >
                            {['ACCOUNT_ISSUE', 'PAYMENT_ISSUE', 'TECHNICAL_ISSUE', 'KYC_VERIFICATION', 'SUSPENSION_APPEAL', 'FEATURE_REQUEST', 'OTHER'].map(cat => (
                                <option key={cat} value={cat}>
                                    {t(`support.categories.${cat}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            {t('support.priority')}
                        </label>
                        <select
                            value={formData.priority}
                            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                            className="input w-full"
                        >
                            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(pri => (
                                <option key={pri} value={pri}>
                                    {t(`support.priorities.${pri}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            {t('support.description')} *
                        </label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="input w-full min-h-[150px]"
                            placeholder={t('support.description')}
                        />
                    </div>

                    {/* Attachments */}
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            {t('support.attachments')}
                        </label>
                        <div className="space-y-3">
                            <label className="btn-secondary cursor-pointer inline-flex">
                                <PaperClipIcon className="w-5 h-5" />
                                {uploading ? t('common.loading') : t('support.addAttachment')}
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
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {attachments.map((url, idx) => (
                                        <div key={idx} className="relative group">
                                            <img
                                                src={url}
                                                alt={`Attachment ${idx + 1}`}
                                                className="w-full h-24 object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <XMarkIcon className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="btn-secondary flex-1 sm:flex-none"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary flex-1 sm:flex-none"
                        >
                            {isSubmitting ? t('common.loading') : t('common.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
