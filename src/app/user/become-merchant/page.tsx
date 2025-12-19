'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
    BuildingStorefrontIcon,
    ArrowLeftIcon,
    DocumentIcon,
    PhotoIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';

interface MerchantRequest {
    id: string;
    status: string;
    businessName: string;
    createdAt: string;
    rejectionReason?: string;
}

export default function BecomeMerchantPage() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const [existingRequest, setExistingRequest] = useState<MerchantRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [mounted, setMounted] = useState(false);

    const businessTypes = locale === 'ar' ? [
        { value: 'RETAIL', label: 'تجارة تجزئة' },
        { value: 'RESTAURANT', label: 'مطعم / مقهى' },
        { value: 'SERVICE', label: 'خدمات' },
        { value: 'ONLINE', label: 'تجارة إلكترونية' },
        { value: 'OTHER', label: 'أخرى' },
    ] : [
        { value: 'RETAIL', label: 'Retail' },
        { value: 'RESTAURANT', label: 'Restaurant/Cafe' },
        { value: 'SERVICE', label: 'Services' },
        { value: 'ONLINE', label: 'Online/E-commerce' },
        { value: 'OTHER', label: 'Other' },
    ];

    const [formData, setFormData] = useState({
        businessName: '',
        businessNameAr: '',
        businessType: 'RETAIL',
        businessAddress: '',
        businessPhone: '',
        businessEmail: '',
        businessDescription: '',
    });

    const [files, setFiles] = useState<{
        license: File | null;
        idPhoto: File | null;
    }>({
        license: null,
        idPhoto: null,
    });

    useEffect(() => {
        setMounted(true);
        fetchExistingRequest();
    }, []);

    const fetchExistingRequest = async () => {
        try {
            const res = await fetch('/api/merchant-request');
            if (res.ok) {
                const data = await res.json();
                if (data.request) {
                    setExistingRequest(data.request);
                }
            }
        } catch (error) {
            console.error('Error fetching request:', error);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);

        try {
            const data = new FormData();
            data.append('businessName', formData.businessName);
            data.append('businessNameAr', formData.businessNameAr);
            data.append('businessType', formData.businessType);
            data.append('businessAddress', formData.businessAddress);
            data.append('businessPhone', formData.businessPhone);
            data.append('businessEmail', formData.businessEmail);
            data.append('businessDescription', formData.businessDescription);

            if (files.license) {
                data.append('license', files.license);
            }
            if (files.idPhoto) {
                data.append('idPhoto', files.idPhoto);
            }

            const res = await fetch('/api/merchant-request', {
                method: 'POST',
                body: data,
            });

            const result = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: t('common.success') });
                setExistingRequest(result.request);
            } else {
                setMessage({ type: 'error', text: result.error || t('errors.transactionFailed') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: t('errors.networkError') });
        }

        setSubmitting(false);
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    // Show existing request status
    if (existingRequest) {
        return (
            <div className="min-h-screen bg-dark-950">
                <header className="navbar">
                    <div className="navbar-container">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard" className="btn-ghost btn-icon">
                                <ArrowLeftIcon className="w-6 h-6" />
                            </Link>
                            <BuildingStorefrontIcon className="w-8 h-8 text-primary-500" />
                            <h1 className="text-xl font-bold text-white">{t('common.businessAccount')}</h1>
                        </div>
                    </div>
                </header>

                <main className="pt-24 pb-8 px-4">
                    <div className="max-w-xl mx-auto">
                        <div className="card p-8 text-center">
                            {existingRequest.status === 'PENDING' && (
                                <>
                                    <ClockIcon className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-white mb-2">{t('merchant.becomemerchant.pendingReview')}</h2>
                                    <p className="text-dark-400 mb-4">
                                        {existingRequest.businessName}
                                    </p>
                                    <p className="text-dark-500 text-sm">
                                        {new Date(existingRequest.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                                    </p>
                                </>
                            )}
                            {existingRequest.status === 'APPROVED' && (
                                <>
                                    <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-white mb-2">{t('common.approved')} 🎉</h2>
                                    <p className="text-dark-400 mb-6">
                                        {t('merchant.becomemerchant.subtitle')}
                                    </p>
                                    <Link href="/dashboard" className="btn-primary">
                                        {t('nav.dashboard')}
                                    </Link>
                                </>
                            )}
                            {existingRequest.status === 'REJECTED' && (
                                <>
                                    <XCircleIcon className="w-20 h-20 text-red-500 mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-white mb-2">{t('common.rejected')}</h2>
                                    <p className="text-red-400 bg-red-500/10 p-4 rounded-xl mb-6">
                                        {existingRequest.rejectionReason || t('common.noData')}
                                    </p>
                                    <button
                                        onClick={() => setExistingRequest(null)}
                                        className="btn-primary"
                                    >
                                        {t('common.submit')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </Link>
                        <BuildingStorefrontIcon className="w-8 h-8 text-primary-500" />
                        <h1 className="text-xl font-bold text-white">{t('merchant.becomemerchant.title')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-2xl mx-auto">
                    {message && (
                        <div className={`card p-4 mb-6 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <p className={`text-center ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {message.text}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Business Info */}
                        <div className="card p-6">
                            <h3 className="text-lg font-bold text-white mb-4">{t('merchant.becomemerchant.businessName')}</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">
                                        {t('merchant.becomemerchant.businessName')} (English) *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="input"
                                        placeholder="My Store"
                                        value={formData.businessName}
                                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">
                                        {t('merchant.becomemerchant.businessNameAr')}
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder={locale === 'ar' ? 'متجري' : 'My Store (Arabic)'}
                                        value={formData.businessNameAr}
                                        onChange={(e) => setFormData({ ...formData, businessNameAr: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">
                                        {t('merchant.becomemerchant.businessType')} *
                                    </label>
                                    <select
                                        className="input"
                                        value={formData.businessType}
                                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                                    >
                                        {businessTypes.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">
                                        {t('common.description')} *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="input"
                                        placeholder={locale === 'ar' ? 'المدينة - الحي - الشارع' : 'City - Area - Street'}
                                        value={formData.businessAddress}
                                        onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-dark-300 text-sm mb-2">
                                            {t('common.phone')}
                                        </label>
                                        <input
                                            type="tel"
                                            className="input"
                                            placeholder="+963..."
                                            value={formData.businessPhone}
                                            onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-dark-300 text-sm mb-2">
                                            {t('common.email')}
                                        </label>
                                        <input
                                            type="email"
                                            className="input"
                                            placeholder="store@example.com"
                                            value={formData.businessEmail}
                                            onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">
                                        {t('common.description')}
                                    </label>
                                    <textarea
                                        className="input min-h-[100px]"
                                        placeholder={locale === 'ar' ? 'صف نشاطك التجاري باختصار...' : 'Describe your business briefly...'}
                                        value={formData.businessDescription}
                                        onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="card p-6">
                            <h3 className="text-lg font-bold text-white mb-4">📄 {t('merchant.becomemerchant.license')}</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">
                                        {t('merchant.becomemerchant.license')} ({t('common.optional')})
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="border-2 border-dashed border-dark-600 rounded-xl p-6 text-center hover:border-primary-500 transition-colors">
                                                <DocumentIcon className="w-10 h-10 text-dark-500 mx-auto mb-2" />
                                                <p className="text-dark-400 text-sm">
                                                    {files.license ? files.license.name : t('common.upload')}
                                                </p>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*,.pdf"
                                                className="hidden"
                                                onChange={(e) => setFiles({ ...files, license: e.target.files?.[0] || null })}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">
                                        {t('merchant.becomemerchant.idPhoto')}
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="border-2 border-dashed border-dark-600 rounded-xl p-6 text-center hover:border-primary-500 transition-colors">
                                                <PhotoIcon className="w-10 h-10 text-dark-500 mx-auto mb-2" />
                                                <p className="text-dark-400 text-sm">
                                                    {files.idPhoto ? files.idPhoto.name : t('common.upload')}
                                                </p>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => setFiles({ ...files, idPhoto: e.target.files?.[0] || null })}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn-primary w-full py-4 text-lg"
                        >
                            {submitting ? (
                                <div className="spinner w-6 h-6"></div>
                            ) : (
                                t('merchant.becomemerchant.submit')
                            )}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
