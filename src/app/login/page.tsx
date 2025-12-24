'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon, PhoneIcon, LockClosedIcon, LanguageIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const [mounted, setMounted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        phone: '',
        password: '',
        rememberMe: false,
    });

    // Syrian phone number validation (+963)
    const validateSyrianPhone = (phone: string): { isValid: boolean; message: string } => {
        const cleaned = phone.replace(/[\s\-]/g, '');
        if (!cleaned) return { isValid: false, message: '' };

        const fullFormat = /^\+?963[0-9]{9}$/;
        const localFormat = /^0?9[0-9]{8}$/;

        if (fullFormat.test(cleaned) || localFormat.test(cleaned)) {
            return { isValid: true, message: '✓' };
        }

        if (cleaned.startsWith('+963') || cleaned.startsWith('963')) {
            const digits = cleaned.replace(/^\+?963/, '');
            if (digits.length < 9) return { isValid: false, message: `${9 - digits.length}` };
        }
        if (cleaned.startsWith('09') || cleaned.startsWith('9')) {
            const digits = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;
            if (digits.length < 9) return { isValid: false, message: `${9 - digits.length}` };
        }

        return { isValid: false, message: '!' };
    };

    const phoneValidation = validateSyrianPhone(formData.phone);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: formData.phone,
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Redirect based on user type
            switch (data.user.userType) {
                case 'ADMIN':
                    router.push('/admin');
                    break;
                case 'AGENT':
                    router.push('/agent');
                    break;
                case 'MERCHANT':
                    router.push('/merchant');
                    break;
                default:
                    router.push('/dashboard');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950 flex flex-col lg:flex-row relative" dir="ltr">
            {/* Language Switcher */}
            <div className="absolute top-6 right-6 z-50">
                <button
                    onClick={() => {
                        const newLocale = currentLocale === 'ar' ? 'en' : 'ar';
                        document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
                        router.refresh();
                    }}
                    className="btn-ghost btn-sm flex items-center gap-2"
                >
                    <LanguageIcon className="w-5 h-5" />
                    <span>{currentLocale === 'ar' ? 'English' : 'العربية'}</span>
                </button>
            </div>

            {/* Left Side - Form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 mb-12">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-3xl font-bold text-gradient">{t('common.appName')}</span>
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">{t('auth.login.title')}</h1>
                        <p className="text-dark-400">{t('auth.login.subtitle')}</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="label">{t('auth.login.phone')} <span className="text-dark-500 text-xs">(+963)</span></label>
                            <div className="relative">
                                <input
                                    id="phone"
                                    type="tel"
                                    className={`input pr-12 pl-10 transition-all ${!formData.phone ? '' :
                                            phoneValidation.isValid
                                                ? 'border-green-500 focus:border-green-500'
                                                : 'border-red-500 focus:border-red-500'
                                        }`}
                                    placeholder="09XX XXX XXX"
                                    dir="ltr"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                                <PhoneIcon className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${!formData.phone ? 'text-dark-500' :
                                        phoneValidation.isValid ? 'text-green-500' : 'text-red-500'
                                    }`} />
                                {formData.phone && (
                                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold ${phoneValidation.isValid ? 'text-green-500' : 'text-red-400'
                                        }`}>
                                        {phoneValidation.message}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="label">{t('auth.login.password')}</label>
                            <div className="input-group">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    className="input-group-icon"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500/20"
                                    checked={formData.rememberMe}
                                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                                />
                                <span className="text-sm text-dark-300">{t('auth.login.rememberMe')}</span>
                            </label>
                            <Link href="/forgot-password" className="text-sm text-primary-500 hover:text-primary-400 transition-colors">
                                {t('auth.login.forgotPassword')}
                            </Link>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            className="btn-primary w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="spinner w-5 h-5"></div>
                            ) : (
                                <>
                                    <LockClosedIcon className="w-5 h-5" />
                                    <span>{t('auth.login.submit')}</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Register Link */}
                    <p className="mt-8 text-center text-dark-400">
                        {t('auth.login.noAccount')}{' '}
                        <Link href="/register" className="text-primary-500 hover:text-primary-400 font-medium transition-colors">
                            {t('auth.login.register')}
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right Side - Visual */}
            <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-dark-900 to-dark-950 p-12 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl"></div>
                </div>

                <div className="relative text-center max-w-lg">
                    {/* Animated Card */}
                    <div className="card p-8 mb-8 animate-float">
                        <div className="w-24 h-24 rounded-3xl bg-primary-500/10 flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
                            <LockClosedIcon className="w-12 h-12 text-primary-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{t('landing.security.title')}</h3>
                        <p className="text-dark-400">
                            {t('landing.security.description')}
                        </p>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { icon: '🔐', label: t('common.active') },
                            { icon: '🛡️', label: t('common.completed') },
                            { icon: '⚡', label: t('common.processing') },
                        ].map((item, index) => (
                            <div key={index} className="card p-4 text-center">
                                <div className="text-2xl mb-2">{item.icon}</div>
                                <div className="text-sm text-dark-400">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
