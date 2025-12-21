'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    QrCodeIcon,
    BanknotesIcon,
    ChartBarIcon,
    ArrowRightOnRectangleIcon,
    ClockIcon,
    CheckCircleIcon,
    ArrowDownTrayIcon,
    GlobeAltIcon,
    ArrowsRightLeftIcon,
    PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import MerchantQRCode from '@/components/MerchantQRCode';

interface MerchantData {
    merchantCode: string;
    qrCode: string;
    businessName: string;
    balance: number;
    totalSales: number;
    todayTransactions: number;
}

interface Transaction {
    id: string;
    referenceNumber: string;
    amount: number;
    createdAt: string;
    senderName: string;
}

import TransactionDetailsModal from '@/components/TransactionDetailsModal';

export default function MerchantDashboard() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<MerchantData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [showQR, setShowQR] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchMerchantData();
    }, []);

    const fetchMerchantData = async () => {
        try {
            const response = await fetch('/api/merchants/dashboard');
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const result = await response.json();
            setData(result);
            setTransactions(result.recentTransactions || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const toggleLanguage = () => {
        const newLocale = locale === 'ar' ? 'en' : 'ar';
        document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;
        window.location.reload();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-gradient hidden sm:block">{t('merchant.dashboard.title')}</span>
                            <p className="text-xs text-dark-400">{data?.businessName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/dashboard" className="btn-ghost text-xs px-3 py-1 border border-dark-600 flex items-center gap-1">
                            <span className="hidden sm:inline">{t('settings.profile')}</span>
                            <span className="sm:hidden">⚙️</span>
                        </Link>
                        <span className="badge-primary">{data?.merchantCode}</span>
                        <button onClick={toggleLanguage} className="btn-ghost btn-icon text-primary-500" title={locale === 'ar' ? 'English' : 'العربية'}>
                            <GlobeAltIcon className="w-6 h-6" />
                        </button>
                        <button onClick={handleLogout} className="btn-ghost btn-icon text-red-500">
                            <ArrowRightOnRectangleIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-20 pb-8 px-4">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="stat-card">
                            <BanknotesIcon className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                            <div className="stat-value text-gradient">{formatAmount(data?.balance || 0)}</div>
                            <div className="stat-label">{t('wallet.balance')}</div>
                        </div>
                        <div className="stat-card">
                            <ChartBarIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <div className="stat-value text-green-500">{formatAmount(data?.totalSales || 0)}</div>
                            <div className="stat-label">{t('merchant.dashboard.totalSales')}</div>
                        </div>
                        <div className="stat-card">
                            <ClockIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <div className="stat-value">{data?.todayTransactions || 0}</div>
                            <div className="stat-label">{t('agent.dashboard.todayTransactions')}</div>
                        </div>
                    </div>

                    {/* Transfer Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/merchant/internal-transfer" className="card p-6 text-center hover:bg-dark-800/50 transition-colors">
                            <ArrowsRightLeftIcon className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                            <h3 className="text-white font-semibold mb-1">تحويل بين حساباتي</h3>
                            <p className="text-dark-400 text-xs">البزنس ↔ الشخصي</p>
                        </Link>
                        <Link href="/merchant/transfer" className="card p-6 text-center hover:bg-dark-800/50 transition-colors">
                            <PaperAirplaneIcon className="w-10 h-10 text-green-500 mx-auto mb-3" />
                            <h3 className="text-white font-semibold mb-1">تحويل لمستخدم</h3>
                            <p className="text-dark-400 text-xs">إرسال من البزنس</p>
                        </Link>
                    </div>

                    {/* QR Code Section */}
                    <div className="card p-8 text-center">
                        <h2 className="text-xl font-semibold text-white mb-4">{t('merchant.qr.title')}</h2>
                        <p className="text-dark-400 mb-6">{t('merchant.qr.subtitle')}</p>

                        <button
                            onClick={() => setShowQR(!showQR)}
                            className="btn-primary mx-auto"
                        >
                            <QrCodeIcon className="w-6 h-6" />
                            <span>{showQR ? t('common.close') : t('common.view')}</span>
                        </button>




                        {showQR && (
                            <div className="mt-8 flex flex-col items-center">
                                <div id="merchant-qr-container" className="transform transition-all duration-500 scale-110">
                                    <MerchantQRCode
                                        value={data?.qrCode || ''}
                                        businessName={data?.businessName}
                                        merchantCode={data?.merchantCode}
                                        size={240}
                                    />
                                </div>

                                <div className="mt-8 flex justify-center gap-3 w-full max-w-xs">
                                    <button
                                        onClick={() => {
                                            alert(`${t('merchant.qr.download')}\n\n${t('common.name')}: ${data?.merchantCode}`);
                                        }}
                                        className="btn-primary w-full py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2"
                                    >
                                        <ArrowDownTrayIcon className="w-6 h-6" />
                                        <span className="font-bold">{t('merchant.qr.download')}</span>
                                    </button>
                                </div>
                                <p className="text-dark-500 text-sm mt-4 text-center max-w-xs leading-relaxed">
                                    {t('merchant.qr.description')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Recent Transactions */}
                    <div className="card p-6">
                        <h3 className="text-xl font-semibold text-white mb-4">{t('merchant.transactions.title')}</h3>

                        {transactions.length === 0 ? (
                            <div className="text-center py-8 text-dark-400">
                                <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>{t('merchant.transactions.empty')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map((tx) => (
                                    <button
                                        key={tx.id}
                                        onClick={() => {
                                            // Ensure type is set if missing (defaults to PAYMENT for merchant)
                                            setSelectedTransaction({ ...tx, type: 'PAYMENT' });
                                            setIsModalOpen(true);
                                        }}
                                        className="w-full text-start flex items-center justify-between p-4 rounded-xl bg-dark-700/50 hover:bg-dark-700 transition-colors active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{tx.senderName || t('common.name')}</p>
                                                <p className="text-dark-400 text-sm">{formatDate(tx.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <p className="text-green-500 font-semibold">+{formatAmount(tx.amount)} $</p>
                                            <p className="text-dark-500 text-xs">{tx.referenceNumber}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </main>

            <TransactionDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                transaction={selectedTransaction}
                userType="MERCHANT"
            />
        </div>
    );
}
