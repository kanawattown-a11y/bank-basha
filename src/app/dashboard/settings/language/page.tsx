'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function LanguageSettingsPage() {
    const t = useTranslations();
    const currentLocale = useLocale();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(currentLocale);

    useEffect(() => {
        setMounted(true);
    }, []);

    const changeLanguage = (lang: string) => {
        // Set cookie for locale
        document.cookie = `locale=${lang};path=/;max-age=31536000`; // 1 year
        setSelectedLanguage(lang);
        // Refresh to apply new language
        router.refresh();
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    const languages = [
        { code: 'ar', name: 'العربية', nameEn: 'Arabic', flag: '🇸🇦' },
        { code: 'en', name: 'English', nameEn: 'English', flag: '🇺🇸' },
    ];

    const isRTL = currentLocale === 'ar';

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/settings" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </Link>
                        <h1 className="text-xl font-bold text-white">{t('settings.language')}</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-lg mx-auto">
                    <div className="card p-2">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => changeLanguage(lang.code)}
                                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${selectedLanguage === lang.code
                                    ? 'bg-primary-500/10 border border-primary-500/30'
                                    : 'hover:bg-dark-800'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{lang.flag}</span>
                                    <div className={`text-${isRTL ? 'right' : 'left'}`}>
                                        <p className="text-white font-medium">{lang.name}</p>
                                        {lang.code !== 'en' && (
                                            <p className="text-dark-400 text-sm">{lang.nameEn}</p>
                                        )}
                                    </div>
                                </div>
                                {selectedLanguage === lang.code && (
                                    <CheckIcon className="w-6 h-6 text-primary-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    <p className="text-dark-500 text-sm text-center mt-4">
                        {t('settings.languageApplied')}
                    </p>
                </div>
            </main>
        </div>
    );
}
