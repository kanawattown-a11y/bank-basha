'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function RegisterSuccessPage() {
    const t = useTranslations();

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="card p-8">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                        <CheckCircleIcon className="w-12 h-12 text-green-500" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-3">{t('auth.register.success.title')}</h1>

                    <p className="text-dark-300 mb-6">
                        {t('auth.register.success.subtitle')}
                    </p>

                    <div className="space-y-3">
                        <Link href="/login" className="btn-primary w-full block">
                            {t('auth.register.success.goToLogin')}
                        </Link>
                        <Link href="/" className="btn-ghost w-full block">
                            {t('common.back')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
