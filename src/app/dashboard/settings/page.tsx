'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
    ArrowLeftIcon,
    UserIcon,
    LockClosedIcon,
    BellIcon,
    LanguageIcon,
    ShieldCheckIcon,
    DevicePhoneMobileIcon,
    BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

interface UserData {
    fullName: string;
    fullNameAr: string;
    phone: string;
    email: string | null;
    kycStatus: string;
    city: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const t = useTranslations();
    const locale = useLocale();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<UserData | null>(null);
    const [hasMerchantAccount, setHasMerchantAccount] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setHasMerchantAccount(data.hasMerchantAccount || false);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
        setLoading(false);
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    const settingsSections = [
        {
            title: t('settings.account'),
            items: [
                { icon: UserIcon, label: t('settings.profile'), value: user?.fullName, href: '/dashboard/settings/profile' },
                { icon: DevicePhoneMobileIcon, label: t('settings.phoneNumber'), value: user?.phone, href: '#' },
                { icon: ShieldCheckIcon, label: t('settings.kyc'), value: user?.kycStatus === 'APPROVED' ? t('settings.verified') : t('settings.notVerified'), href: '/dashboard/settings/kyc' },
            ],
        },
        {
            title: t('settings.security'),
            items: [
                { icon: LockClosedIcon, label: `🔒 ${t('settings.appLock')}`, value: locale === 'ar' ? '6 أرقام' : '6 digits', href: '/dashboard/settings/app-lock' },
                { icon: LockClosedIcon, label: `💳 ${t('settings.paymentPin')}`, value: locale === 'ar' ? '4 أرقام' : '4 digits', href: '/dashboard/settings/payment-pin' },
                { icon: LockClosedIcon, label: t('settings.changePassword'), href: '/dashboard/settings/password' },
            ],
        },
        {
            title: t('settings.preferences'),
            items: [
                { icon: LanguageIcon, label: t('settings.language'), value: locale === 'ar' ? 'العربية' : 'English', href: '/dashboard/settings/language' },
                { icon: BellIcon, label: t('settings.notifications'), href: '/dashboard/settings/notifications' },
                { icon: UserIcon, label: `📄 ${locale === 'ar' ? 'كشف الحساب' : 'Statement'}`, value: 'PDF', href: '/dashboard/settings/statements' },
            ],
        },
        {
            title: t('settings.market'),
            items: [
                { icon: UserIcon, label: `🛍️ ${t('settings.myServices')}`, value: t('settings.sellServices'), href: '/dashboard/settings/my-services' },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href="/dashboard" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-lg sm:text-lg sm:text-xl font-bold text-white">{t('settings.title')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* User Info Card */}
                    <div className="card p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                <span className="text-white font-bold text-2xl">
                                    {user?.fullName?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-white">{user?.fullName}</h2>
                                <p className="text-dark-400">{user?.phone}</p>
                            </div>
                        </div>
                        {user?.kycStatus === 'APPROVED' && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm">
                                <ShieldCheckIcon className="w-4 h-4" />
                                <span>{t('settings.verifiedAccount')}</span>
                            </div>
                        )}
                    </div>

                    {/* Settings Sections */}
                    {settingsSections.map((section, idx) => (
                        <div key={idx} className="card p-6">
                            <h3 className="text-white font-semibold mb-4">{section.title}</h3>
                            <div className="space-y-2">
                                {section.items.map((item, itemIdx) => (
                                    <Link
                                        key={itemIdx}
                                        href={item.href}
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-dark-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center">
                                                <item.icon className="w-5 h-5 text-primary-500" />
                                            </div>
                                            <span className="text-white">{item.label}</span>
                                        </div>
                                        {item.value && (
                                            <span className="text-dark-400 text-sm">{item.value}</span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Business Account Section */}
                    {!hasMerchantAccount && (
                        <Link href="/user/become-merchant" className="block">
                            <div className="card p-5 bg-gradient-to-br from-emerald-500/10 via-dark-800 to-dark-900 border border-emerald-500/30 hover:border-emerald-500/50 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <BuildingStorefrontIcon className="w-7 h-7 text-emerald-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-bold text-base mb-1">💼 {locale === 'ar' ? 'هل لديك بزنس؟' : 'Have a Business?'}</h3>
                                        <p className="text-dark-400 text-sm">{locale === 'ar' ? 'افتح حساب تاجر واستقبل المدفوعات عبر QR' : 'Open a merchant account and receive payments via QR'}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                                        <span className="text-emerald-400 text-lg">{locale === 'ar' ? '←' : '→'}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* Danger Zone */}
                    <div className="card p-6 border-red-500/20">
                        <h3 className="text-red-500 font-semibold mb-4">
                            ⚠️ {t('settings.dangerZone')}
                        </h3>
                        <button className="w-full btn-ghost text-red-500 hover:bg-red-500/10">
                            {t('settings.deleteAccount')}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}


