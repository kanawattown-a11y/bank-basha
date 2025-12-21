'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
    ArrowLeftIcon,
    BuildingStorefrontIcon,
    PhoneIcon,
    EnvelopeIcon,
    QrCodeIcon,
    CurrencyDollarIcon,
    DocumentTextIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import AttachmentImage from '@/components/AttachmentImage';
import ImageLightbox from '@/components/ImageLightbox';

interface MerchantDetail {
    id: string;
    fullName: string;
    fullNameAr: string | null;
    phone: string;
    email: string | null;
    isActive: boolean;
    createdAt: string;
    balance: number;

    businessName: string;
    businessNameAr: string | null;
    merchantCode: string;
    qrCode: string;
    businessType: string | null;
    businessAddress: string | null;
    totalSales: number;
    totalTransactions: number;

    licenseUrl: string | null;
    idPhotoUrl: string | null;
    businessDescription: string | null;
}

interface Transaction {
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
    isIncoming: boolean;
    counterparty: string;
}

export default function MerchantDetailsPage() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const params = useParams();

    const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    useEffect(() => {
        fetchMerchant();
    }, [params.id]);

    const fetchMerchant = async () => {
        try {
            const res = await fetch(`/api/admin/merchants/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setMerchant(data.merchant);
                setTransactions(data.transactions || []);
            } else if (res.status === 401 || res.status === 403) {
                router.push('/login');
            } else {
                router.push('/admin/merchants');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatAmount = (amount: number) =>
        new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });

    // Collect images for lightbox
    const getLightboxImages = () => {
        const images: { src: string; alt: string }[] = [];
        if (merchant?.licenseUrl) images.push({ src: merchant.licenseUrl, alt: 'الرخصة التجارية' });
        if (merchant?.idPhotoUrl) images.push({ src: merchant.idPhotoUrl, alt: 'صورة الهوية' });
        return images;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    if (!merchant) {
        return null;
    }

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/merchants" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Link>
                        <h1 className="text-lg font-semibold text-white">{merchant.businessName}</h1>
                    </div>
                    <span className={`badge ${merchant.isActive ? 'badge-success' : 'badge-error'}`}>
                        {merchant.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Merchant Info Card */}
                    <div className="card p-6">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                <BuildingStorefrontIcon className="w-8 h-8 text-purple-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{merchant.businessName}</h2>
                                {merchant.businessNameAr && (
                                    <p className="text-dark-400">{merchant.businessNameAr}</p>
                                )}
                                <span className="badge-primary mt-2">{merchant.merchantCode}</span>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800">
                                <PhoneIcon className="w-5 h-5 text-dark-400" />
                                <span className="text-white" dir="ltr">{merchant.phone}</span>
                            </div>
                            {merchant.email && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800">
                                    <EnvelopeIcon className="w-5 h-5 text-dark-400" />
                                    <span className="text-white">{merchant.email}</span>
                                </div>
                            )}
                            {merchant.businessAddress && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800 md:col-span-2">
                                    <MapPinIcon className="w-5 h-5 text-dark-400" />
                                    <span className="text-white">{merchant.businessAddress}</span>
                                </div>
                            )}
                        </div>

                        {merchant.businessDescription && (
                            <div className="mt-4 p-4 rounded-xl bg-dark-800">
                                <p className="text-dark-400 text-sm mb-1">وصف النشاط</p>
                                <p className="text-white">{merchant.businessDescription}</p>
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card p-4 text-center">
                            <CurrencyDollarIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-dark-400 text-xs">الرصيد</p>
                            <p className="text-white font-bold">${formatAmount(merchant.balance)}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <p className="text-2xl mb-2">💰</p>
                            <p className="text-dark-400 text-xs">إجمالي المبيعات</p>
                            <p className="text-green-500 font-bold">${formatAmount(merchant.totalSales)}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <QrCodeIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <p className="text-dark-400 text-xs">المعاملات</p>
                            <p className="text-white font-bold">{merchant.totalTransactions}</p>
                        </div>
                        <div className="card p-4 text-center">
                            <p className="text-2xl mb-2">📅</p>
                            <p className="text-dark-400 text-xs">تاريخ الانضمام</p>
                            <p className="text-white font-bold text-sm">{formatDate(merchant.createdAt)}</p>
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <DocumentTextIcon className="w-5 h-5" />
                            المستندات
                        </h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            {/* License */}
                            <div>
                                <p className="text-dark-400 text-sm mb-2">الرخصة التجارية</p>
                                {merchant.licenseUrl ? (
                                    <div
                                        className="cursor-pointer"
                                        onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                                    >
                                        <AttachmentImage
                                            src={merchant.licenseUrl}
                                            alt="License"
                                            className="w-full h-40 object-cover rounded-xl"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-40 rounded-xl bg-dark-800 flex items-center justify-center text-dark-500">
                                        لا يوجد
                                    </div>
                                )}
                            </div>

                            {/* ID Photo */}
                            <div>
                                <p className="text-dark-400 text-sm mb-2">صورة الهوية</p>
                                {merchant.idPhotoUrl ? (
                                    <div
                                        className="cursor-pointer"
                                        onClick={() => {
                                            setLightboxIndex(merchant.licenseUrl ? 1 : 0);
                                            setLightboxOpen(true);
                                        }}
                                    >
                                        <AttachmentImage
                                            src={merchant.idPhotoUrl}
                                            alt="ID"
                                            className="w-full h-40 object-cover rounded-xl"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-40 rounded-xl bg-dark-800 flex items-center justify-center text-dark-500">
                                        لا يوجد
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">آخر المعاملات</h3>

                        {transactions.length === 0 ? (
                            <p className="text-dark-400 text-center py-8">لا توجد معاملات</p>
                        ) : (
                            <div className="space-y-3">
                                {transactions.slice(0, 10).map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-800">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.isIncoming ? 'bg-green-500/10' : 'bg-red-500/10'
                                                }`}>
                                                <span className="text-lg">{tx.isIncoming ? '↓' : '↑'}</span>
                                            </div>
                                            <div>
                                                <p className="text-white text-sm">{tx.counterparty}</p>
                                                <p className="text-dark-400 text-xs">{tx.type} • {formatDate(tx.createdAt)}</p>
                                            </div>
                                        </div>
                                        <span className={tx.isIncoming ? 'text-green-500' : 'text-red-500'}>
                                            {tx.isIncoming ? '+' : '-'}${formatAmount(tx.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Lightbox */}
            <ImageLightbox
                images={getLightboxImages()}
                initialIndex={lightboxIndex}
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
            />
        </div>
    );
}
