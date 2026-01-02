'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    XCircleIcon,
    UserIcon,
    PhoneIcon,
    EnvelopeIcon,
    CalendarIcon,
    IdentificationIcon,
    CameraIcon,
    ShieldCheckIcon,
    LanguageIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useTranslations, useLocale } from 'next-intl';
import TransactionDetailsModal from '@/components/TransactionDetailsModal';
import SecureImage from '@/components/SecureImage';
import ImageLightbox from '@/components/ImageLightbox';

interface UserDetail {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    dateOfBirth: string | null;
    userType: string;
    kycStatus: string;
    isActive: boolean;
    hasMerchantAccount: boolean;
    idPhotoUrl: string | null;
    idPhotoBackUrl: string | null;
    selfiePhotoUrl: string | null;
    kycSubmittedAt: string | null;
    createdAt: string;
    wallet?: {
        balance: number;
    };
    // Dual currency wallets
    wallets?: {
        USD: { balance: number } | null;
        SYP: { balance: number } | null;
    };
    merchantProfile?: {
        businessName: string;
        businessType: string;
    } | null;
}

interface Transaction {
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    fee: number;
    status: string;
    description: string;
    descriptionAr: string;
    createdAt: string;
    isOutgoing: boolean;
    counterparty: string;
}

export default function AdminUserDetailPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const params = useParams();
    const userId = params.id as string;

    const [user, setUser] = useState<UserDetail | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showImageModal, setShowImageModal] = useState<string | null>(null);
    const [kycRejectionReason, setKycRejectionReason] = useState('');
    const [newRole, setNewRole] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    useEffect(() => {
        fetchUser();
    }, [userId]);

    const fetchUser = async () => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`);
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed');
            }
            const data = await response.json();
            setUser(data.user);
            setTransactions(data.transactions || []);
            setNewRole(data.user.userType);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKYCAction = async (action: 'approve' | 'reject') => {
        if (action === 'reject' && !kycRejectionReason) {
            alert(t('admin.userDetails.kyc.reasonRequired'));
            return;
        }

        setIsProcessing(true);
        try {
            await fetch('/api/admin/kyc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    action,
                    rejectionReason: action === 'reject' ? kycRejectionReason : undefined,
                }),
            });
            fetchUser();
            setKycRejectionReason('');
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRoleChange = async () => {
        if (newRole && newRole !== user?.userType) {
            if (newRole === 'AGENT' && user?.kycStatus !== 'APPROVED') {
                alert(t('admin.userDetails.roles.kycRequired'));
                return;
            }
            if (!confirm(t('admin.userDetails.roles.confirmChange', { newRole: newRole === 'AGENT' ? t('admin.userDetails.roles.agent') : t('admin.userDetails.roles.user') }))) return;

            setIsProcessing(true);
            try {
                await fetch(`/api/admin/users/${userId}/role`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userType: newRole }),
                });
                fetchUser();
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleSuspendAccount = async () => {
        if (!confirm(user?.isActive ? 'تعليق حساب هذا المستخدم؟' : 'إعادة تفعيل حساب هذا المستخدم؟')) return;

        setIsProcessing(true);
        try {
            await fetch(`/api/admin/users/${userId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !user?.isActive }),
            });
            fetchUser();
        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ أثناء تحديث حالة الحساب');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ سيتم نقله إلى سلة المهملات.')) return;

        setIsProcessing(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                alert('تم حذف المستخدم بنجاح');
                router.push('/admin/users');
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ أثناء حذف المستخدم');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(currentLocale === 'ar' ? 'ar-SA' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat(currentLocale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const getKYCBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <span className="badge-success">{t('admin.userDetails.kyc.approved')}</span>;
            case 'PENDING':
                return <span className="badge-warning">{t('admin.userDetails.kyc.pending')}</span>;
            case 'REJECTED':
                return <span className="badge-error">{t('admin.userDetails.kyc.rejected')}</span>;
            default:
                return <span className="badge">{t('admin.userDetails.kyc.notSubmitted')}</span>;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950">
                <header className="navbar">
                    <div className="navbar-container">
                        <div className="navbar-start">
                            <button onClick={() => router.back()} className="btn-ghost btn-icon">
                                <ArrowLeftIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </header>
                <div className="container mx-auto p-4 lg:p-8 flex items-center justify-center min-h-[50vh]">
                    <div className="spinner w-12 h-12"></div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-dark-300">{t('admin.userDetails.notFound')}</p>
                    <Link href="/admin/users" className="btn-primary mt-4">
                        {t('admin.userDetails.backToUsers')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/users" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </Link>
                        <UserIcon className="w-8 h-8 text-primary-500" />
                        <div>
                            <h1 className="text-xl font-bold text-white">{t('admin.userDetails.title')}</h1>
                            <p className="text-sm text-dark-400">{user.fullName}</p>
                        </div>
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
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* User Info Card */}
                    <div className="card p-6">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center text-2xl font-bold text-primary-500">
                                    {user.fullName[0]}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">{user.fullName}</h2>
                                    <p className="text-dark-400">{user.phone}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${user.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                {user.isActive ? t('admin.agentDetails.stats.active') : t('admin.agentDetails.stats.inactive')}
                            </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-dark-800">
                            <div>
                                <p className="text-dark-400 text-sm mb-1">{t('admin.userDetails.info.email')}</p>
                                <p className="text-white">{user.email || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-dark-400 text-sm mb-1">{t('admin.userDetails.info.dob')}</p>
                                <p className="text-white">{user.dateOfBirth ? formatDate(user.dateOfBirth) : 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-dark-400 text-sm mb-2">{t('admin.userDetails.info.balance')}</p>
                                <div className="space-y-1">
                                    <p className="text-white font-mono dir-ltr text-end">
                                        ${(user.wallets?.USD?.balance || user.wallet?.balance || 0).toFixed(2)} USD
                                    </p>
                                    <p className="text-dark-300 font-mono dir-ltr text-end text-sm">
                                        {(user.wallets?.SYP?.balance || 0).toLocaleString()} ل.س
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-dark-400 text-sm mb-1">{t('admin.userDetails.info.joinedAt')}</p>
                                <p className="text-white">{formatDate(user.createdAt)}</p>
                            </div>
                        </div>
                    </div>

                    {/* KYC Documents */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">{t('admin.userDetails.kyc.title')}</h3>
                        {user.kycStatus === 'PENDING' && (
                            <div className="mb-4 bg-yellow-500/10 text-yellow-500 p-4 rounded-lg flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5" />
                                <span>{t('admin.userDetails.kyc.submitted')}</span>
                            </div>
                        )}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {getKYCBadge(user.kycStatus)}
                                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${user.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                        {user.isActive ? t('admin.userDetails.status.active') : t('admin.userDetails.status.inactive')}
                                    </span>
                                    {/* User Type Badge - Enhanced */}
                                    {user.userType === 'AGENT' ? (
                                        <span className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                            🏪 {t('admin.userDetails.roles.agent')}
                                        </span>
                                    ) : user.hasMerchantAccount ? (
                                        <span className="px-3 py-1 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                                            💼 {t('admin.userDetails.roles.businessAccount')}
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-lg text-sm font-medium bg-dark-700 text-dark-300 border border-dark-600">
                                            👤 {t('admin.userDetails.roles.normalUser')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-end text-sm text-dark-400">
                                <p>{t('admin.userDetails.info.joinedAt')}</p>
                                <p className="text-white">{formatDate(user.createdAt)}</p>
                            </div>
                        </div>

                        {user.kycSubmittedAt && (
                            <p className="text-dark-400 text-sm mb-4">
                                {t('admin.userDetails.kyc.submittedAt', { date: formatDate(user.kycSubmittedAt) })}
                            </p>
                        )}

                        <div className="grid md:grid-cols-3 gap-4 mb-6">
                            {user.idPhotoUrl && (
                                <div
                                    className="cursor-pointer"
                                    onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                                >
                                    <p className="text-dark-400 text-sm mb-2">{t('admin.userDetails.kyc.idPhoto')} (أمامي)</p>
                                    <SecureImage
                                        src={user.idPhotoUrl}
                                        alt="ID Front"
                                        className="w-full h-40 object-cover rounded-lg hover:opacity-80 transition-opacity"
                                    />
                                </div>
                            )}
                            {user.idPhotoBackUrl && (
                                <div
                                    className="cursor-pointer"
                                    onClick={() => {
                                        const idx = user.idPhotoUrl ? 1 : 0;
                                        setLightboxIndex(idx);
                                        setLightboxOpen(true);
                                    }}
                                >
                                    <p className="text-dark-400 text-sm mb-2">{t('admin.userDetails.kyc.idPhoto')} (خلفي)</p>
                                    <SecureImage
                                        src={user.idPhotoBackUrl}
                                        alt="ID Back"
                                        className="w-full h-40 object-cover rounded-lg hover:opacity-80 transition-opacity"
                                    />
                                </div>
                            )}
                            {user.selfiePhotoUrl && (
                                <div
                                    className="cursor-pointer"
                                    onClick={() => {
                                        let idx = 0;
                                        if (user.idPhotoUrl) idx++;
                                        if (user.idPhotoBackUrl) idx++;
                                        setLightboxIndex(idx);
                                        setLightboxOpen(true);
                                    }}
                                >
                                    <p className="text-dark-400 text-sm mb-2">{t('admin.userDetails.kyc.selfie')}</p>
                                    <SecureImage
                                        src={user.selfiePhotoUrl}
                                        alt="Selfie"
                                        className="w-full h-40 object-cover rounded-lg hover:opacity-80 transition-opacity"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Lightbox for KYC photos */}
                        <ImageLightbox
                            images={[
                                ...(user.idPhotoUrl ? [{ src: user.idPhotoUrl, alt: 'صورة الهوية (أمامي)' }] : []),
                                ...(user.idPhotoBackUrl ? [{ src: user.idPhotoBackUrl, alt: 'صورة الهوية (خلفي)' }] : []),
                                ...(user.selfiePhotoUrl ? [{ src: user.selfiePhotoUrl, alt: 'صورة السيلفي' }] : []),
                            ]}
                            initialIndex={lightboxIndex}
                            isOpen={lightboxOpen}
                            onClose={() => setLightboxOpen(false)}
                        />

                        {/* KYC Actions */}
                        {user.kycStatus === 'PENDING' && (
                            <div className="space-y-4">
                                <button
                                    onClick={() => handleKYCAction('approve')}
                                    disabled={isProcessing}
                                    className="btn-primary w-full bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                >
                                    <CheckCircleIcon className="w-5 h-5" />
                                    {t('admin.userDetails.kyc.approve')}
                                </button>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder={t('admin.userDetails.kyc.reasonPlaceholder')}
                                        className="input"
                                        value={kycRejectionReason}
                                        onChange={(e) => setKycRejectionReason(e.target.value)}
                                    />
                                    <button
                                        onClick={() => handleKYCAction('reject')}
                                        disabled={isProcessing || !kycRejectionReason}
                                        className="btn bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                    >
                                        <XCircleIcon className="w-5 h-5" />
                                        {t('admin.userDetails.kyc.reject')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Account Actions - Suspend & Delete */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            {currentLocale === 'ar' ? 'إجراءات الحساب' : 'Account Actions'}
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Suspend/Activate Button */}
                            <button
                                onClick={handleSuspendAccount}
                                disabled={isProcessing}
                                className={`btn ${user.isActive ? 'btn-warning' : 'btn-success'} w-full`}
                            >
                                {isProcessing ? (
                                    <div className="spinner w-5 h-5"></div>
                                ) : (
                                    <>
                                        {user.isActive ? (
                                            <>
                                                <XCircleIcon className="w-5 h-5" />
                                                {currentLocale === 'ar' ? 'تعليق الحساب' : 'Suspend Account'}
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircleIcon className="w-5 h-5" />
                                                {currentLocale === 'ar' ? 'إعادة تفعيل الحساب' : 'Activate Account'}
                                            </>
                                        )}
                                    </>
                                )}
                            </button>

                            {/* Delete Button */}
                            <button
                                onClick={handleDeleteUser}
                                disabled={isProcessing}
                                className="btn btn-danger w-full"
                            >
                                {isProcessing ? (
                                    <div className="spinner w-5 h-5"></div>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        {currentLocale === 'ar' ? 'حذف المستخدم' : 'Delete User'}
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-dark-400 text-sm mt-3">
                            {currentLocale === 'ar'
                                ? '* سيتم نقل المستخدم المحذوف إلى سلة المهملات ويمكن استرجاعه من صفحة Bin'
                                : '* Deleted users will be moved to the Bin and can be restored from the Bin page'}
                        </p>
                    </div>

                    {/* Transactions History */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">{t('admin.userDetails.history.title')}</h3>
                        {transactions.length === 0 ? (
                            <p className="text-dark-400 text-center py-4">{t('admin.userDetails.history.empty')}</p>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        onClick={() => setSelectedTransaction({
                                            ...tx,
                                            senderName: tx.isOutgoing ? user.fullName : tx.counterparty,
                                            receiverName: tx.isOutgoing ? tx.counterparty : user.fullName,
                                        })}
                                        className="p-4 rounded-xl bg-dark-800/50 flex items-center justify-between cursor-pointer hover:bg-dark-800 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="text-white font-medium">
                                                    {tx.descriptionAr || tx.description}
                                                </p>
                                                <span className={`badge ${tx.status === 'COMPLETED' ? 'badge-success' : tx.status === 'PENDING' ? 'badge-warning' : 'badge-error'}`}>
                                                    {tx.status === 'COMPLETED' ? t('admin.userDetails.history.completed') : tx.status === 'PENDING' ? t('admin.userDetails.history.pending') : t('admin.userDetails.history.failed')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-dark-400">
                                                <span>{tx.counterparty}</span>
                                                <span>•</span>
                                                <span>{tx.referenceNumber}</span>
                                                <span>•</span>
                                                <span>{formatDate(tx.createdAt)}</span>
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <p className={`font-bold ${tx.isOutgoing ? 'text-red-500' : 'text-green-500'}`}>
                                                {tx.isOutgoing ? '-' : '+'}{formatAmount(tx.amount)} $
                                            </p>
                                            {tx.fee > 0 && (
                                                <p className="text-dark-500 text-xs">{t('admin.userDetails.history.fee')}: {formatAmount(tx.fee)} $</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Role Management */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">{t('admin.userDetails.roles.title')}</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <p className="text-white font-medium mb-1">{t('admin.userDetails.roles.businessAccount')}</p>
                                <p className="text-dark-400 text-sm">{t('admin.userDetails.roles.businessHint')}</p>
                            </div>
                            {user.hasMerchantAccount ? (
                                <span className="badge badge-success">{t('admin.agentDetails.stats.status')}</span>
                            ) : (
                                <span className="badge badge-neutral">{t('admin.agentDetails.stats.status')}</span>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-dark-800">
                            <label className="block text-dark-400 text-sm mb-2">{t('admin.userDetails.roles.changeRole')}</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setNewRole('USER')}
                                    className={`btn flex-1 ${newRole === 'USER' ? 'btn-primary' : 'btn-ghost border border-dark-700'}`}
                                >
                                    {t('admin.users.roles.user')}
                                </button>
                                <button
                                    onClick={() => setNewRole('AGENT')}
                                    className={`btn flex-1 ${newRole === 'AGENT' ? 'btn-primary' : 'btn-ghost border border-dark-700'}`}
                                >
                                    {t('admin.users.roles.agent')}
                                </button>
                                <button
                                    onClick={() => setNewRole('ADMIN')}
                                    className={`btn flex-1 ${newRole === 'ADMIN' ? 'btn-primary' : 'btn-ghost border border-dark-700'}`}
                                >
                                    {t('admin.users.roles.admin')}
                                </button>
                            </div>

                            {newRole !== user.userType && (
                                <button
                                    onClick={handleRoleChange}
                                    disabled={isProcessing || (newRole === 'AGENT' && user.kycStatus !== 'APPROVED')}
                                    className="btn-primary w-full mt-4"
                                >
                                    {t('admin.userDetails.roles.changeRole')} {newRole}
                                </button>
                            )}
                            {newRole === 'AGENT' && user.kycStatus !== 'APPROVED' && (
                                <p className="text-yellow-500 text-sm mt-2">{t('admin.userDetails.roles.kycRequired')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Image Modal */}
            {
                showImageModal && (
                    <div
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowImageModal(null)}
                    >
                        <img
                            src={showImageModal}
                            alt="Document"
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                )
            }

            {/* Transaction Details Modal */}
            <TransactionDetailsModal
                isOpen={!!selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                transaction={selectedTransaction}
                userType="ADMIN"
            />
        </div >
    );
}
