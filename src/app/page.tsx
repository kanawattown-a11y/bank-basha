'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ShieldCheckIcon,
    BanknotesIcon,
    ArrowsRightLeftIcon,
    QrCodeIcon,
    UserGroupIcon,
    DevicePhoneMobileIcon,
    LanguageIcon
} from '@heroicons/react/24/outline';

// Import translations directly
import arMessages from '@/messages/ar.json';
import enMessages from '@/messages/en.json';

export default function HomePage() {
    const [locale, setLocale] = useState<'ar' | 'en'>('ar');

    const messages = locale === 'ar' ? arMessages : enMessages;
    const t = (key: string) => {
        const keys = key.split('.');
        let value: any = messages;
        for (const k of keys) {
            value = value?.[k];
        }
        return value || key;
    };

    const toggleLanguage = () => {
        setLocale(prev => prev === 'ar' ? 'en' : 'ar');
    };



    return (
        <main className="min-h-screen bg-dark-950" suppressHydrationWarning>
            {/* Navigation */}
            <nav className="navbar">
                <div className="navbar-container">
                    <Link href="/" className="flex items-center gap-1 sm:gap-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-lg sm:text-xl font-bold text-gradient hidden sm:block">{t('common.appName')}</span>
                    </Link>

                    <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
                        <button
                            onClick={toggleLanguage}
                            className="btn-ghost btn-sm flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                            aria-label="Toggle Language"
                        >
                            <LanguageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>{locale === 'ar' ? 'EN' : 'ع'}</span>
                        </button>
                        <Link href="/login" className="btn-ghost btn-sm text-xs sm:text-sm px-2 sm:px-3">
                            {t('nav.login')}
                        </Link>
                        <Link href="/register" className="btn-primary btn-sm text-xs sm:text-sm px-2 sm:px-3">
                            {t('nav.register')}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
                </div>

                <div className="max-w-7xl mx-auto relative">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 mb-8 animate-fade-in">
                            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                            <span className="text-primary-400 text-sm font-medium">
                                {t('landing.agents.description')}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up">
                            <span className="text-white">{t('landing.hero.title').split(' ').slice(0, -1).join(' ')}</span>
                            <br />
                            <span className="text-gradient">{t('landing.hero.title').split(' ').slice(-1)}</span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-xl md:text-2xl text-dark-300 mb-10 animate-slide-up delay-100">
                            {t('landing.hero.subtitle')}
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up delay-200">
                            <Link href="/register" className="btn-primary btn-lg">
                                <span>{t('landing.hero.cta')}</span>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                            <Link href="#features" className="btn-secondary btn-lg">
                                {t('landing.hero.learnMore')}
                            </Link>
                        </div>
                    </div>

                    {/* Hero Visual / Stats */}
                    <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in delay-300">
                        {[
                            { value: '24/7', label: locale === 'ar' ? 'متاح دائماً' : 'Always Available' },
                            { value: '0%', label: locale === 'ar' ? 'رسوم فتح الحساب' : 'Account Opening Fees' },
                            { value: '<1s', label: locale === 'ar' ? 'سرعة التحويل' : 'Transfer Speed' },
                            { value: '100%', label: locale === 'ar' ? 'محلي وآمن' : 'Local & Secure' },
                        ].map((stat, index) => (
                            <div key={index} className="card-hover p-6 text-center">
                                <div className="text-3xl md:text-4xl font-bold text-gradient mb-2">{stat.value}</div>
                                <div className="text-dark-400 text-sm">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-white mb-4">{t('landing.features.title')}</h2>
                        <p className="text-dark-400 text-lg max-w-2xl mx-auto">
                            {locale === 'ar' ? 'جميع خدماتك المالية في مكان واحد' : 'All your financial services in one place'}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: BanknotesIcon,
                                title: t('landing.features.deposit.title'),
                                description: t('landing.features.deposit.description'),
                                color: 'text-green-500',
                                bg: 'bg-green-500/10',
                            },
                            {
                                icon: BanknotesIcon,
                                title: t('landing.features.withdraw.title'),
                                description: t('landing.features.withdraw.description'),
                                color: 'text-red-500',
                                bg: 'bg-red-500/10',
                            },
                            {
                                icon: ArrowsRightLeftIcon,
                                title: t('landing.features.transfer.title'),
                                description: t('landing.features.transfer.description'),
                                color: 'text-blue-500',
                                bg: 'bg-blue-500/10',
                            },
                            {
                                icon: QrCodeIcon,
                                title: t('landing.features.payment.title'),
                                description: t('landing.features.payment.description'),
                                color: 'text-purple-500',
                                bg: 'bg-purple-500/10',
                            },
                        ].map((feature, index) => (
                            <div
                                key={index}
                                className="card-hover p-6 group"
                            >
                                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-dark-400">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="py-20 px-4 bg-dark-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                                <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                                <span className="text-green-400 text-sm font-medium">{t('landing.security.title')}</span>
                            </div>

                            <h2 className="text-4xl font-bold text-white mb-6">
                                {locale === 'ar' ? <>حماية أموالك <span className="text-gradient">أولويتنا القصوى</span></> : <>Protecting your money is <span className="text-gradient">our top priority</span></>}
                            </h2>

                            <p className="text-dark-300 text-lg mb-8">
                                {t('landing.security.description')}
                            </p>

                            <div className="space-y-4">
                                {(locale === 'ar' ? [
                                    'تشفير متقدم لجميع البيانات',
                                    'مصادقة متعددة العوامل',
                                    'مراقبة على مدار الساعة',
                                    'حماية من الاحتيال بالذكاء الاصطناعي',
                                ] : [
                                    'Advanced encryption for all data',
                                    'Multi-factor authentication',
                                    '24/7 monitoring',
                                    'AI-powered fraud protection',
                                ]).map((item, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-dark-200">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="card p-8 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent"></div>
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-3xl bg-primary-500/10 flex items-center justify-center mb-6 mx-auto animate-pulse-glow">
                                        <ShieldCheckIcon className="w-10 h-10 text-primary-500" />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-6xl font-bold text-gradient mb-2">256-bit</div>
                                        <div className="text-dark-400">{locale === 'ar' ? 'تشفير بنكي' : 'Banking Encryption'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Agents Section */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 mb-6">
                        <UserGroupIcon className="w-5 h-5 text-primary-500" />
                        <span className="text-primary-400 text-sm font-medium">{t('landing.agents.title')}</span>
                    </div>

                    <h2 className="text-4xl font-bold text-white mb-6">
                        {locale === 'ar' ? <>شبكة وكلاء واسعة في <span className="text-gradient">السويداء</span></> : <>Wide agent network in <span className="text-gradient">State Of Bashan</span></>}
                    </h2>

                    <p className="text-dark-300 text-lg max-w-2xl mx-auto mb-12">
                        {locale === 'ar' ? 'وكلاؤنا متواجدون في كل مكان لخدمتك على مدار الساعة. إيداع، سحب، وتحويل بسهولة تامة.' : 'Our agents are available everywhere to serve you 24/7. Deposit, withdraw, and transfer with ease.'}
                    </p>

                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {(locale === 'ar' ? [
                            { icon: '📍', title: 'أكثر من 50 وكيل', description: 'منتشرين في جميع أنحاء المدينة' },
                            { icon: '⚡', title: 'خدمة فورية', description: 'لا انتظار، لا طوابير' },
                            { icon: '💰', title: 'عمولات تنافسية', description: 'أقل من 1% على جميع العمليات' },
                        ] : [
                            { icon: '📍', title: '50+ Agents', description: 'Spread across the city' },
                            { icon: '⚡', title: 'Instant Service', description: 'No waiting, no queues' },
                            { icon: '💰', title: 'Competitive Fees', description: 'Less than 1% on all transactions' },
                        ]).map((item, index) => (
                            <div key={index} className="card-hover p-6">
                                <div className="text-4xl mb-4">{item.icon}</div>
                                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                                <p className="text-dark-400">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Download / CTA Section */}
            <section className="py-20 px-4 bg-gradient-to-b from-dark-900 to-dark-950">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="card p-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-primary-500/5"></div>
                        <div className="relative">
                            <DevicePhoneMobileIcon className="w-16 h-16 text-primary-500 mx-auto mb-6" />
                            <h2 className="text-4xl font-bold text-white mb-4">{t('landing.download.title')}</h2>
                            <p className="text-dark-300 text-lg mb-8 max-w-xl mx-auto">
                                {t('landing.download.description')}
                            </p>
                            <Link href="/register" className="btn-primary btn-lg inline-flex">
                                <span>{t('nav.register')}</span>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 border-t border-dark-800">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-xl font-bold text-gradient">{t('common.appName')}</span>
                        </div>

                        <div className="flex items-center gap-6 text-dark-400 text-sm">
                            <Link href="/privacy" className="hover:text-white transition-colors">
                                {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                            </Link>
                            <Link href="/terms" className="hover:text-white transition-colors">
                                {locale === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}
                            </Link>
                            <Link href="/contact" className="hover:text-white transition-colors">
                                {locale === 'ar' ? 'تواصل معنا' : 'Contact Us'}
                            </Link>
                        </div>

                        <div className="text-dark-500 text-sm">
                            © {new Date().getFullYear()} Bank Basha. {locale === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
                        </div>
                    </div>
                </div>
            </footer>
        </main >
    );
}
