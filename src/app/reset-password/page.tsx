'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [isLoading, setIsLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [isValid, setIsValid] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (token) {
            verifyToken();
        } else {
            setVerifying(false);
            setError('رابط غير صالح');
        }
    }, [token]);

    const verifyToken = async () => {
        try {
            const response = await fetch(`/api/auth/reset-password?token=${token}`);
            const data = await response.json();

            if (response.ok && data.valid) {
                setIsValid(true);
            } else {
                setError(data.error || 'الرابط غير صالح أو منتهي الصلاحية');
            }
        } catch (err) {
            setError('حدث خطأ في التحقق من الرابط');
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError('كلمات المرور غير متطابقة');
            return;
        }

        if (formData.password.length < 6) {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'حدث خطأ');
            }

            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ');
        } finally {
            setIsLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="spinner w-12 h-12 mx-auto mb-4"></div>
                    <p className="text-dark-400">جاري التحقق من الرابط...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
                <div className="w-full max-w-md text-center">
                    <div className="card p-8">
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                            <CheckCircleIcon className="w-10 h-10 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-4">
                            تم تغيير كلمة المرور بنجاح
                        </h1>
                        <p className="text-dark-400 mb-8">
                            يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة
                        </p>
                        <Link href="/login" className="btn-primary w-full">
                            تسجيل الدخول
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!isValid) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
                <div className="w-full max-w-md text-center">
                    <div className="card p-8">
                        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                            <XCircleIcon className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-4">
                            رابط غير صالح
                        </h1>
                        <p className="text-dark-400 mb-8">
                            {error || 'هذا الرابط غير صالح أو منتهي الصلاحية'}
                        </p>
                        <Link href="/forgot-password" className="btn-primary w-full">
                            طلب رابط جديد
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="card p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                            <LockClosedIcon className="w-8 h-8 text-primary-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            تعيين كلمة مرور جديدة
                        </h1>
                        <p className="text-dark-400 text-sm">
                            أدخل كلمة المرور الجديدة لحسابك
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                كلمة المرور الجديدة *
                            </label>
                            <div className="relative">
                                <LockClosedIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="input-field pr-12"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-dark-500 hover:text-dark-300"
                                >
                                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                تأكيد كلمة المرور *
                            </label>
                            <div className="relative">
                                <LockClosedIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-500" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="input-field pr-12"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-dark-500 hover:text-dark-300"
                                >
                                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !formData.password || !formData.confirmPassword}
                            className="btn-primary w-full"
                        >
                            {isLoading ? (
                                <div className="spinner w-5 h-5"></div>
                            ) : (
                                'تغيير كلمة المرور'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
