'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ar, Translations } from './translations/ar';
import { en } from './translations/en';

type Language = 'ar' | 'en';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
    dir: 'rtl' | 'ltr';
}

const translations = { ar, en };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('ar'); // Arabic as default
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load saved language preference
        const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
        if (saved && (saved === 'ar' || saved === 'en')) {
            setLanguageState(saved);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        // Update document direction and language
        if (mounted) {
            document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.lang = language;
        }
    }, [language, mounted]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem(STORAGE_KEY, lang);
    };

    const value: LanguageContextType = {
        language,
        setLanguage,
        t: translations[language],
        dir: language === 'ar' ? 'rtl' : 'ltr',
    };

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return (
            <LanguageContext.Provider value={{ ...value, t: ar }}>
                {children}
            </LanguageContext.Provider>
        );
    }

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

// Shorthand hook for translations
export function useTranslation() {
    const { t, language, setLanguage, dir } = useLanguage();
    return { t, language, setLanguage, dir, isRTL: dir === 'rtl' };
}
