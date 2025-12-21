'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    BuildingStorefrontIcon,
    ArrowLeftIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    EyeIcon,
    DocumentIcon,
    LanguageIcon,
    PhotoIcon,
} from '@heroicons/react/24/outline';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import AttachmentImage from '@/components/AttachmentImage';
import ImageLightbox from '@/components/ImageLightbox';

interface MerchantRequest {
    id: string;
    userId: string;
    businessName: string;
    businessNameAr: string | null;
    businessType: string;
    businessAddress: string;
    businessPhone: string | null;
    businessEmail: string | null;
    businessDescription: string | null;
    licenseUrl: string | null;
    idPhotoUrl: string | null;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
    reviewedAt: string | null;
    user: {
        id: string;
        fullName: string;
        phone: string;
        email: string | null;
        kycStatus: string;
    };
}

const businessTypeLabels: { [key: string]: string } = {
    RETAIL: 'تجارة تجزئة',
    RESTAURANT: 'مطعم / مقهى',
    SERVICE: 'خدمات',
    ONLINE: 'تجارة إلكترونية',
    OTHER: 'أخرى',
};

export default function MerchantRequestsPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const [pendingRequests, setPendingRequests] = useState<MerchantRequest[]>([]);
    const [recentProcessed, setRecentProcessed] = useState<MerchantRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<MerchantRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [mounted, setMounted] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<{ src: string; alt: string }[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    useEffect(() => {
        setMounted(true);
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/admin/merchant-requests');
            if (res.ok) {
                const data = await res.json();
                setPendingRequests(data.pendingRequests || []);
                setRecentProcessed(data.recentProcessed || []);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
        setLoading(false);
    };

    const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
        if (action === 'reject' && !rejectionReason.trim()) {
            alert(t('admin.merchantRequests.details.rejectionReason'));
            return;
        }

        setProcessing(requestId);
        try {
            const res = await fetch('/api/admin/merchant-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId,
                    action,
                    rejectionReason: action === 'reject' ? rejectionReason : undefined,
                }),
            });

            if (res.ok) {
                fetchRequests();
                setSelectedRequest(null);
                setRejectionReason('');
            }
        } catch (error) {
            console.error('Error processing request:', error);
        }
        setProcessing(null);
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <BuildingStorefrontIcon className="w-8 h-8 text-primary-500" />
                        <h1 className="text-xl font-bold text-white">{t('admin.merchantRequests.title')}</h1>
                    </div>
                    <button
                        onClick={() => {
                            const newLocale = currentLocale === 'ar' ? 'en' : 'ar';
                            document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
                            router.refresh();
                        }}
                        className="btn-ghost btn-icon"
                    >
                        <LanguageIcon className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Pending Requests */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <ClockIcon className="w-6 h-6 text-yellow-500" />
                            {t('admin.merchantRequests.pending')} ({pendingRequests.length})
                        </h2>

                        {pendingRequests.length === 0 ? (
                            <div className="card p-8 text-center">
                                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <p className="text-dark-400">{t('admin.merchantRequests.empty')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingRequests.map((req) => (
                                    <div key={req.id} className="card p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-bold text-white">
                                                        {req.businessName}
                                                    </h3>
                                                    <span className="px-2 py-1 text-xs rounded-lg bg-primary-500/10 text-primary-500">
                                                        {t(`admin.merchantRequests.types.${req.businessType}`)}
                                                    </span>
                                                </div>
                                                <p className="text-dark-400 text-sm mb-2">
                                                    {t('admin.merchantRequests.details.applicant')}: {req.user.fullName} ({req.user.phone})
                                                </p>
                                                <p className="text-dark-500 text-sm">
                                                    {t('admin.merchantRequests.details.address')}: {req.businessAddress}
                                                </p>
                                                <p className="text-dark-500 text-xs mt-2">
                                                    {t('admin.transactionDetails.info.createdAt')}: {new Date(req.createdAt).toLocaleDateString(currentLocale === 'ar' ? 'ar-SA' : 'en-US')}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="btn-ghost btn-sm"
                                                >
                                                    <EyeIcon className="w-5 h-5" />
                                                    {t('admin.merchantRequests.actions.view')}
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, 'approve')}
                                                    disabled={processing === req.id}
                                                    className="btn-sm bg-green-500 text-white hover:bg-green-600"
                                                >
                                                    {processing === req.id ? (
                                                        <div className="spinner w-4 h-4"></div>
                                                    ) : (
                                                        <CheckCircleIcon className="w-5 h-5" />
                                                    )}
                                                    {t('admin.merchantRequests.actions.approve')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Processed */}
                    {recentProcessed.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-4">{t('admin.merchantRequests.recent')}</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-dark-400 text-sm border-b border-dark-700">
                                            <th className={`py-3 px-4 ${currentLocale === 'ar' ? 'text-right' : 'text-left'}`}>{t('admin.merchantRequests.table.business')}</th>
                                            <th className={`py-3 px-4 ${currentLocale === 'ar' ? 'text-right' : 'text-left'}`}>{t('admin.merchantRequests.table.applicant')}</th>
                                            <th className={`py-3 px-4 ${currentLocale === 'ar' ? 'text-right' : 'text-left'}`}>{t('admin.merchantRequests.table.status')}</th>
                                            <th className={`py-3 px-4 ${currentLocale === 'ar' ? 'text-right' : 'text-left'}`}>{t('admin.merchantRequests.table.reviewedAt')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentProcessed.map((req) => (
                                            <tr key={req.id} className="border-b border-dark-800">
                                                <td className="py-3 px-4 text-white">{req.businessName}</td>
                                                <td className="py-3 px-4 text-dark-400">{req.user.fullName}</td>
                                                <td className="py-3 px-4">
                                                    {req.status === 'APPROVED' ? (
                                                        <span className="text-green-500 flex items-center gap-1">
                                                            <CheckCircleIcon className="w-4 h-4" /> {t('admin.merchantRequests.actions.approve')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-500 flex items-center gap-1">
                                                            <XCircleIcon className="w-4 h-4" /> {t('admin.merchantRequests.actions.reject')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-dark-500 text-sm">
                                                    {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString(currentLocale === 'ar' ? 'ar-SA' : 'en-US') : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Detail Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-dark-700">
                            <h2 className="text-xl font-bold text-white">{t('admin.merchantRequests.details.title')}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-dark-500 text-sm">{t('admin.merchantRequests.details.businessTo')}</label>
                                    <p className="text-white font-medium">{selectedRequest.businessName}</p>
                                </div>
                                <div>
                                    <label className="text-dark-500 text-sm">{t('admin.merchantRequests.details.type')}</label>
                                    <p className="text-white">{t(`admin.merchantRequests.types.${selectedRequest.businessType}`)}</p>
                                </div>
                                <div>
                                    <label className="text-dark-500 text-sm">{t('admin.merchantRequests.details.address')}</label>
                                    <p className="text-white">{selectedRequest.businessAddress}</p>
                                </div>
                                <div>
                                    <label className="text-dark-500 text-sm">{t('admin.merchantRequests.details.phone')}</label>
                                    <p className="text-white">{selectedRequest.businessPhone || '-'}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-dark-500 text-sm">{t('admin.merchantRequests.details.applicant')}</label>
                                <p className="text-white">
                                    {selectedRequest.user.fullName} - {selectedRequest.user.phone}
                                </p>
                                <p className="text-dark-400 text-sm">
                                    KYC: {selectedRequest.user.kycStatus === 'APPROVED' ? `✓ ${t('admin.agentDetails.stats.status')}` : `${t('admin.agentDetails.stats.status')}`}
                                </p>
                            </div>

                            {selectedRequest.businessDescription && (
                                <div>
                                    <label className="text-dark-500 text-sm">{t('admin.merchantRequests.details.description')}</label>
                                    <p className="text-dark-300">{selectedRequest.businessDescription}</p>
                                </div>
                            )}

                            {(selectedRequest.licenseUrl || selectedRequest.idPhotoUrl) && (
                                <div>
                                    <label className="text-dark-500 text-sm mb-2 block">{t('admin.merchantRequests.details.documents')}</label>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        {selectedRequest.licenseUrl && (
                                            <div
                                                className="cursor-pointer"
                                                onClick={() => {
                                                    const images = [];
                                                    if (selectedRequest.licenseUrl) images.push({ src: selectedRequest.licenseUrl, alt: t('admin.merchantRequests.details.license') });
                                                    if (selectedRequest.idPhotoUrl) images.push({ src: selectedRequest.idPhotoUrl, alt: t('admin.merchantRequests.details.idPhoto') });
                                                    setLightboxImages(images);
                                                    setLightboxIndex(0);
                                                    setLightboxOpen(true);
                                                }}
                                            >
                                                <p className="text-dark-400 text-xs mb-1">{t('admin.merchantRequests.details.license')}</p>
                                                <AttachmentImage
                                                    src={selectedRequest.licenseUrl}
                                                    alt={t('admin.merchantRequests.details.license')}
                                                    className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity"
                                                />
                                            </div>
                                        )}
                                        {selectedRequest.idPhotoUrl && (
                                            <div
                                                className="cursor-pointer"
                                                onClick={() => {
                                                    const images = [];
                                                    if (selectedRequest.licenseUrl) images.push({ src: selectedRequest.licenseUrl, alt: t('admin.merchantRequests.details.license') });
                                                    if (selectedRequest.idPhotoUrl) images.push({ src: selectedRequest.idPhotoUrl, alt: t('admin.merchantRequests.details.idPhoto') });
                                                    setLightboxImages(images);
                                                    setLightboxIndex(selectedRequest.licenseUrl ? 1 : 0);
                                                    setLightboxOpen(true);
                                                }}
                                            >
                                                <p className="text-dark-400 text-xs mb-1">{t('admin.merchantRequests.details.idPhoto')}</p>
                                                <AttachmentImage
                                                    src={selectedRequest.idPhotoUrl}
                                                    alt={t('admin.merchantRequests.details.idPhoto')}
                                                    className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Rejection Reason */}
                            <div>
                                <label className="text-dark-500 text-sm mb-2 block">{t('admin.merchantRequests.details.rejectionReason')}</label>
                                <textarea
                                    className="input min-h-[100px]"
                                    placeholder={t('admin.userDetails.kyc.reasonPlaceholder')}
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-dark-700 flex gap-4">
                            <button
                                onClick={() => {
                                    setSelectedRequest(null);
                                    setRejectionReason('');
                                }}
                                className="btn-ghost flex-1"
                            >
                                {t('admin.merchantRequests.actions.cancel')}
                            </button>
                            <button
                                onClick={() => handleAction(selectedRequest.id, 'reject')}
                                disabled={processing === selectedRequest.id || !rejectionReason.trim()}
                                className="btn-sm bg-red-500 text-white hover:bg-red-600 flex-1"
                            >
                                <XCircleIcon className="w-5 h-5" />
                                {t('admin.merchantRequests.actions.reject')}
                            </button>
                            <button
                                onClick={() => handleAction(selectedRequest.id, 'approve')}
                                disabled={processing === selectedRequest.id}
                                className="btn-primary flex-1"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                {t('admin.merchantRequests.actions.approve')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Image Lightbox */}
            <ImageLightbox
                images={lightboxImages}
                initialIndex={lightboxIndex}
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
            />
        </div>
    );
}
