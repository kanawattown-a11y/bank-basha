'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    UserIcon,
    EnvelopeIcon,
    MapPinIcon,
    CalendarIcon,
} from '@heroicons/react/24/outline';

interface UserData {
    fullName: string;
    fullNameAr: string;
    phone: string;
    email: string;
    city: string;
    address: string;
    dateOfBirth: string;
}

export default function ProfileEditPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [formData, setFormData] = useState<UserData>({
        fullName: '',
        fullNameAr: '',
        phone: '',
        email: '',
        city: '',
        address: '',
        dateOfBirth: '',
    });

    useEffect(() => {
        setMounted(true);
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    fullName: data.user.fullName || '',
                    fullNameAr: data.user.fullNameAr || '',
                    phone: data.user.phone || '',
                    email: data.user.email || '',
                    city: data.user.city || '',
                    address: data.user.address || '',
                    dateOfBirth: data.user.dateOfBirth ? new Date(data.user.dateOfBirth).toISOString().split('T')[0] : '',
                });
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/user/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'تم تحديث ملفك الشخصي بنجاح' });
            } else {
                setMessage({ type: 'error', text: data.error || 'فشل التحديث' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'حدث خطأ في التحديث' });
        }

        setSaving(false);
    };

    if (!mounted || loading) {
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
                        <h1 className="text-lg sm:text-xl font-bold text-white">تعديل الملف الشخصي</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-2xl mx-auto">
                    {message && (
                        <div className={`card p-4 mb-6 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <p className={`text-center ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {message.text}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="card p-6 space-y-6">
                        {/* Basic Info */}
                        <div>
                            <label className="block text-dark-300 text-sm mb-2">الاسم الكامل (English)</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-dark-300 text-sm mb-2">الاسم الكامل (عربي)</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.fullNameAr}
                                onChange={(e) => setFormData({ ...formData, fullNameAr: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-dark-300 text-sm mb-2">رقم الهاتف</label>
                            <input
                                type="tel"
                                className="input bg-dark-800"
                                value={formData.phone}
                                disabled
                            />
                            <p className="text-dark-500 text-xs mt-1">لا يمكن تغيير رقم الهاتف</p>
                        </div>

                        <div>
                            <label className="block text-dark-300 text-sm mb-2">البريد الإلكتروني</label>
                            <input
                                type="email"
                                className="input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="example@mail.com"
                            />
                        </div>

                        <div>
                            <label className="block text-dark-300 text-sm mb-2">المدينة</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-dark-300 text-sm mb-2">العنوان</label>
                            <textarea
                                className="input min-h-[80px]"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="الحي - الشارع"
                            />
                        </div>

                        <div>
                            <label className="block text-dark-300 text-sm mb-2">تاريخ الميلاد</label>
                            <input
                                type="date"
                                className="input"
                                value={formData.dateOfBirth}
                                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary w-full py-3"
                        >
                            {saving ? <div className="spinner w-5 h-5"></div> : 'حفظ التغييرات'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
