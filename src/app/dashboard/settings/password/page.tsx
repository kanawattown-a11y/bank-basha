'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeftIcon,
    LockClosedIcon,
    EyeIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline';

export default function ChangePasswordPage() {
    const [mounted, setMounted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'كلمة المرور الجديدة غير متطابقة' });
            return;
        }

        if (formData.newPassword.length < 8) {
            setMessage({ type: 'error', text: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
            return;
        }

        setSaving(true);

        try {
            const res = await fetch('/api/user/change-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' });
                setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setMessage({ type: 'error', text: data.error || 'فشل تغيير كلمة المرور' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'حدث خطأ في تغيير كلمة المرور' });
        }

        setSaving(false);
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href="/dashboard/settings" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-lg sm:text-xl font-bold text-white">تغيير كلمة المرور</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-md mx-auto">
                    {message && (
                        <div className={`card p-4 mb-6 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <p className={`text-center ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {message.text}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="card p-6 space-y-6">
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-3">
                                <LockClosedIcon className="w-8 h-8 text-primary-500" />
                            </div>
                            <p className="text-dark-400 text-sm">
                                يرجى إدخال كلمة المرور الحالية ثم كلمة المرور الجديدة
                            </p>
                        </div>

                        {/* Current Password */}
                        <div>
                            <label className="block text-dark-300 text-sm mb-2">كلمة المرور الحالية</label>
                            <div className="relative">
                                <input
                                    type={showPasswords.current ? 'text' : 'password'}
                                    className="input pr-12"
                                    value={formData.currentPassword}
                                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                                >
                                    {showPasswords.current ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-dark-300 text-sm mb-2">كلمة المرور الجديدة</label>
                            <div className="relative">
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    className="input pr-12"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                                >
                                    {showPasswords.new ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-dark-500 text-xs mt-1">8 أحرف على الأقل</p>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-dark-300 text-sm mb-2">تأكيد كلمة المرور الجديدة</label>
                            <div className="relative">
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    className="input pr-12"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                                >
                                    {showPasswords.confirm ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary w-full py-3"
                        >
                            {saving ? <div className="spinner w-5 h-5"></div> : 'تغيير كلمة المرور'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
