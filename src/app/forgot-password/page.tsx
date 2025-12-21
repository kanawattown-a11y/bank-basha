'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PhoneIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function ForgotPasswordPage() {
    const t = useTranslations();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [ticketNumber, setTicketNumber] = useState('');
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        phone: '',
        message: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'حدث خطأ');
            }

            setTicketNumber(data.ticketNumber);
            setSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ');
        } finally {
            setIsLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
                <div className="w-full max-w-md text-center">
                    <div className="card p-8">
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                            <CheckCircleIcon className="w-10 h-10 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-4">
                            تم إرسال طلبك بنجاح
                        </h1>
                        <p className="text-dark-400 mb-6">
                            رقم الطلب: <span className="text-primary-500 font-bold">{ticketNumber}</span>
                        </p>
                        <p className="text-dark-400 text-sm mb-8">
                            سيتم مراجعة طلبك من قبل فريق الدعم. ستتلقى إشعاراً عند الموافقة على طلبك لإعادة تعيين كلمة المرور.
                        </p>
                        <Link href="/login" className="btn-primary w-full">
                            العودة لتسجيل الدخول
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Back Button */}
                <Link href="/login" className="flex items-center gap-2 text-dark-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>العودة لتسجيل الدخول</span>
                </Link>

                <div className="card p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">
                            نسيت كلمة المرور؟
                        </h1>
                        <p className="text-dark-400 text-sm">
                            أدخل رقم هاتفك وسنقوم بإرسال طلب لإعادة تعيين كلمة المرور
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                رقم الهاتف *
                            </label>
                            <div className="relative">
                                <PhoneIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-500" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="input pr-12 text-right"
                                    placeholder="09xxxxxxxx"
                                    required
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                ملاحظات إضافية (اختياري)
                            </label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                className="input h-24 resize-none"
                                placeholder="أي معلومات إضافية تساعدنا في التحقق من هويتك"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !formData.phone}
                            className="btn-primary w-full"
                        >
                            {isLoading ? (
                                <div className="spinner w-5 h-5"></div>
                            ) : (
                                'إرسال طلب استعادة كلمة المرور'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-dark-500 text-xs mt-6">
                        سيتم التواصل معك عبر رقم الهاتف المسجل للتحقق من هويتك
                    </p>
                </div>
            </div>
        </div>
    );
}
