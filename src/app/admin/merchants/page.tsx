'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    MagnifyingGlassIcon,
    BuildingStorefrontIcon,
    QrCodeIcon,
} from '@heroicons/react/24/outline';

interface Merchant {
    id: string;
    merchantCode: string;
    businessName: string;
    phone: string;
    totalSales: number;
    totalSalesSYP: number;
    totalTransactions: number;
    isActive: boolean;
}

export default function AdminMerchantsPage() {
    const t = useTranslations();
    const router = useRouter();
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currency, setCurrency] = useState<'USD' | 'SYP'>('USD');

    useEffect(() => {
        fetchMerchants();
    }, []);

    const fetchMerchants = async () => {
        try {
            const response = await fetch('/api/admin/merchants');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const data = await response.json();
            setMerchants(data.merchants || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const filteredMerchants = merchants.filter(merchant =>
        merchant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.merchantCode.includes(searchTerm) ||
        merchant.phone.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-base sm:text-lg font-semibold text-white">{t('admin.merchants.title')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-6xl mx-auto">

                    {/* Search */}
                    <div className="card p-4 mb-6">
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
                            <input
                                type="text"
                                className="input pr-10"
                                placeholder={t('admin.merchants.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Currency Selector */}
                    <div className="card p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-dark-400">Currency:</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrency('USD')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${currency === 'USD'
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                        }`}
                                >
                                    💵 USD
                                </button>
                                <button
                                    onClick={() => setCurrency('SYP')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${currency === 'SYP'
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                        }`}
                                >
                                    🇸🇾 SYP
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Merchants List */}
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner w-10 h-10"></div>
                        </div>
                    ) : filteredMerchants.length === 0 ? (
                        <div className="card p-12 text-center">
                            <BuildingStorefrontIcon className="w-16 h-16 text-dark-500 mx-auto mb-4" />
                            <p className="text-xl font-semibold text-dark-300">{t('admin.merchants.noMerchants')}</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMerchants.map((merchant) => {
                                const symbol = currency === 'SYP' ? 'ل.س' : '$';
                                const sales = currency === 'SYP' ? merchant.totalSalesSYP : merchant.totalSales;

                                return (
                                    <Link
                                        key={merchant.id}
                                        href={`/admin/merchants/${merchant.id}`}
                                        className="card p-5 hover:border-primary-500/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                                    <QrCodeIcon className="w-6 h-6 text-purple-500" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold">{merchant.businessName}</p>
                                                    <p className="text-dark-400 text-sm">{merchant.phone}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <span className="badge-info">{merchant.merchantCode}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="p-3 rounded-xl bg-green-500/10">
                                                <p className="text-dark-400 text-xs mb-1">{t('admin.merchants.totalSales')}</p>
                                                <p className="text-green-500 font-semibold">{symbol}{formatAmount(sales)}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-blue-500/10">
                                                <p className="text-dark-400 text-xs mb-1">{t('admin.merchants.totalTransactions')}</p>
                                                <p className="text-blue-500 font-semibold">{merchant.totalTransactions}</p>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-dark-700">
                                            <span className={`badge ${merchant.isActive ? 'badge-success' : 'badge-error'}`}>
                                                {merchant.isActive ? t('common.active') : t('common.inactive')}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
