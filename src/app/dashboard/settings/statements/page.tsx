'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
    ArrowLeftIcon,
    DocumentArrowDownIcon,
    CalendarIcon,
} from '@heroicons/react/24/outline';

export default function StatementsPage() {
    const t = useTranslations();
    const locale = useLocale();
    const [isDownloading, setIsDownloading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'SYP'>('USD');

    const months = [
        { value: 1, label: t('settings.statements.months.january') },
        { value: 2, label: t('settings.statements.months.february') },
        { value: 3, label: t('settings.statements.months.march') },
        { value: 4, label: t('settings.statements.months.april') },
        { value: 5, label: t('settings.statements.months.may') },
        { value: 6, label: t('settings.statements.months.june') },
        { value: 7, label: t('settings.statements.months.july') },
        { value: 8, label: t('settings.statements.months.august') },
        { value: 9, label: t('settings.statements.months.september') },
        { value: 10, label: t('settings.statements.months.october') },
        { value: 11, label: t('settings.statements.months.november') },
        { value: 12, label: t('settings.statements.months.december') },
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const downloadStatement = async () => {
        setIsDownloading(true);
        try {
            const downloadUrl = `/api/user/statement?month=${selectedMonth}&year=${selectedYear}&currency=${selectedCurrency}`;

            // Check if running in Android WebView app
            const isAndroidApp = navigator.userAgent.includes('BankBashaApp');

            if (isAndroidApp) {
                // For Android App: Open URL directly to trigger native DownloadManager
                // The server will return the PDF with proper Content-Disposition header
                window.location.href = downloadUrl;
            } else {
                // For Web Browser: Use blob download
                const response = await fetch(downloadUrl);

                if (!response.ok) {
                    throw new Error('Failed to generate statement');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `BankBasha_Statement_${selectedCurrency}_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Download error:', error);
            alert(t('settings.statements.downloadError'));
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/settings" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Link>
                        <h1 className="text-lg font-semibold text-white">
                            📄 {t('settings.statements.title')}
                        </h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-md mx-auto">

                    {/* Info Card */}
                    <div className="card p-6 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                            <DocumentArrowDownIcon className="w-8 h-8 text-primary-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white text-center mb-2">
                            {t('settings.statements.downloadTitle')}
                        </h2>
                        <p className="text-dark-400 text-center text-sm">
                            {t('settings.statements.description')}
                        </p>
                    </div>

                    {/* Selection */}
                    <div className="card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarIcon className="w-5 h-5 text-primary-500" />
                            <span className="text-white font-medium">
                                {t('settings.statements.selectMonth')}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {/* Month Select */}
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">
                                    {t('settings.statements.selectMonth')}
                                </label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="input w-full"
                                >
                                    {months.map((month) => (
                                        <option key={month.value} value={month.value}>
                                            {month.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Year Select */}
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">
                                    {t('settings.statements.selectYear')}
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="input w-full"
                                >
                                    {years.map((year) => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Currency Select - NEW */}
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">
                                    {t('settings.statements.selectCurrency')}
                                </label>
                                <select
                                    value={selectedCurrency}
                                    onChange={(e) => setSelectedCurrency(e.target.value as 'USD' | 'SYP')}
                                    className="input w-full"
                                >
                                    <option value="USD">💵 USD</option>
                                    <option value="SYP">🇸🇾 SYP</option>
                                </select>
                            </div>
                        </div>

                        {/* Download Button */}
                        <button
                            onClick={downloadStatement}
                            disabled={isDownloading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {isDownloading ? (
                                <>
                                    <div className="spinner w-5 h-5"></div>
                                    <span>{t('settings.statements.downloading')}</span>
                                </>
                            ) : (
                                <>
                                    <DocumentArrowDownIcon className="w-5 h-5" />
                                    <span>{t('settings.statements.download')}</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Note */}
                    <div className="mt-4 p-4 rounded-xl bg-dark-800/50 text-center">
                        <p className="text-dark-400 text-xs">
                            {t('settings.statements.note')}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
