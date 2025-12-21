'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    ArrowLeftIcon,
    PlusIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    PhotoIcon,
} from '@heroicons/react/24/outline';

interface Service {
    id: string;
    name: string;
    nameAr: string | null;
    description: string;
    price: number;
    category: string;
    status: string;
    rejectionReason: string | null;
    imageUrl: string | null;
    createdAt: string;
    _count: { purchases: number };
}

const categories = [
    { value: 'RECHARGE', label: 'شحن رصيد' },
    { value: 'BILL', label: 'دفع فواتير' },
    { value: 'SUBSCRIPTION', label: 'اشتراكات' },
    { value: 'OTHER', label: 'أخرى' },
];

export default function MyServicesPage() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<Service[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        nameAr: '',
        description: '',
        descriptionAr: '',
        category: 'OTHER',
        // Pricing
        isFlexiblePrice: false,
        price: 0,
        minPrice: 1,
        maxPrice: 1000,
        imageUrl: '',
        providerLocation: '', // موقع مزود الخدمة
        // Required fields from buyer
        requirePhone: true,
        requireEmail: false,
        requireUsername: false,
        requireNote: false,
        customFieldLabel: '',
    });

    useEffect(() => {
        setMounted(true);
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const res = await fetch('/api/user/services');
            if (res.ok) {
                const data = await res.json();
                setServices(data.services || []);
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);

        try {
            const res = await fetch('/api/user/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message || 'تم تقديم الخدمة بنجاح!' });
                fetchServices();
                setTimeout(() => {
                    setShowModal(false);
                    setMessage(null);
                    resetForm();
                }, 2000);
            } else {
                setMessage({ type: 'error', text: data.error || 'حدث خطأ' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'خطأ في الاتصال' });
        }

        setSubmitting(false);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            nameAr: '',
            description: '',
            descriptionAr: '',
            category: 'OTHER',
            isFlexiblePrice: false,
            price: 0,
            minPrice: 1,
            maxPrice: 1000,
            imageUrl: '',
            providerLocation: '',
            requirePhone: true,
            requireEmail: false,
            requireUsername: false,
            requireNote: false,
            customFieldLabel: '',
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-yellow-500/10 text-yellow-400">
                        <ClockIcon className="w-4 h-4" />
                        قيد المراجعة
                    </span>
                );
            case 'APPROVED':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-green-500/10 text-green-400">
                        <CheckCircleIcon className="w-4 h-4" />
                        مقبولة
                    </span>
                );
            case 'REJECTED':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-red-500/10 text-red-400">
                        <XCircleIcon className="w-4 h-4" />
                        مرفوضة
                    </span>
                );
            default:
                return null;
        }
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
                        <h1 className="text-lg sm:text-xl font-bold text-white">🛍️ خدماتي</h1>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <PlusIcon className="w-5 h-5" />
                        أضف خدمة
                    </button>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Orders Link Card */}
                    <Link href="/dashboard/settings/my-services/orders" className="card p-4 mb-4 flex items-center justify-between bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20 hover:border-yellow-500/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📦</span>
                            <div>
                                <h3 className="text-white font-semibold">الطلبات الواردة</h3>
                                <p className="text-dark-400 text-xs">عرض ومعالجة طلبات المشترين</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">←</span>
                        </div>
                    </Link>

                    {/* Info Card */}
                    <div className="card p-4 mb-6 bg-primary-500/5 border-primary-500/20">
                        <p className="text-dark-300 text-sm">
                            💡 يمكنك تقديم خدماتك للبيع على المنصة. سيتم مراجعتها من قبل الإدارة قبل نشرها.
                            عند الموافقة، سيتمكن المستخدمون الآخرون من شراء خدمتك والدفع مباشرة لمحفظتك.
                        </p>
                    </div>

                    {services.length === 0 ? (
                        <div className="card p-12 text-center">
                            <p className="text-dark-400 mb-4">لم تقدم أي خدمات بعد</p>
                            <button onClick={() => setShowModal(true)} className="btn-primary">
                                أضف أول خدمة
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {services.map((service) => (
                                <div key={service.id} className="card p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-white font-semibold">
                                                {service.nameAr || service.name}
                                            </h3>
                                            <p className="text-dark-400 text-sm mt-1">{service.description}</p>
                                        </div>
                                        {getStatusBadge(service.status)}
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-primary-500 font-bold">{service.price} $</span>
                                        <span className="text-dark-500">
                                            {service._count.purchases} عملية شراء
                                        </span>
                                    </div>
                                    {service.status === 'REJECTED' && service.rejectionReason && (
                                        <div className="mt-3 p-3 bg-red-500/10 rounded-lg">
                                            <p className="text-red-400 text-sm">
                                                ❌ سبب الرفض: {service.rejectionReason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Add Service Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg sm:text-xl font-bold text-white mb-6">إضافة خدمة جديدة</h2>

                        {message && (
                            <div className={`p-4 rounded-xl mb-4 ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-dark-300 text-sm mb-2">اسم الخدمة (عربي) *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.nameAr}
                                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value, name: e.target.value })}
                                    required
                                    placeholder="مثال: شحن رصيد ليبيانا"
                                />
                            </div>

                            <div>
                                <label className="block text-dark-300 text-sm mb-2">وصف الخدمة *</label>
                                <textarea
                                    className="input min-h-[80px]"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value, descriptionAr: e.target.value })}
                                    required
                                    placeholder="اشرح ماذا تقدم هذه الخدمة..."
                                />
                            </div>

                            {/* Provider Location */}
                            <div>
                                <label className="block text-dark-300 text-sm mb-2">📍 موقع مزود الخدمة (اختياري)</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.providerLocation}
                                    onChange={(e) => setFormData({ ...formData, providerLocation: e.target.value })}
                                    placeholder="مثال: شارع الوكالات - طرابلس"
                                />
                                <p className="text-dark-500 text-xs mt-1">اكتب موقع محلك أو مكان تقديم الخدمة</p>
                            </div>

                            {/* Image Upload Field */}
                            <div>
                                <label className="block text-dark-300 text-sm mb-2">
                                    <PhotoIcon className="w-4 h-4 inline ml-1" />
                                    صورة الخدمة
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            // Show loading state
                                            setFormData({ ...formData, imageUrl: 'uploading...' });

                                            const uploadData = new FormData();
                                            uploadData.append('file', file);
                                            uploadData.append('folder', 'services');

                                            try {
                                                const res = await fetch('/api/upload', {
                                                    method: 'POST',
                                                    body: uploadData,
                                                });
                                                const data = await res.json();
                                                if (data.success && data.url) {
                                                    setFormData({ ...formData, imageUrl: data.url });
                                                } else {
                                                    setMessage({ type: 'error', text: data.error || 'فشل رفع الصورة' });
                                                    setFormData({ ...formData, imageUrl: '' });
                                                }
                                            } catch {
                                                setMessage({ type: 'error', text: 'فشل رفع الصورة' });
                                                setFormData({ ...formData, imageUrl: '' });
                                            }
                                        }}
                                        className="hidden"
                                        id="image-upload"
                                    />
                                    <label
                                        htmlFor="image-upload"
                                        className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-dark-600 rounded-xl cursor-pointer hover:border-primary-500 transition-colors"
                                    >
                                        <PhotoIcon className="w-6 h-6 text-dark-400" />
                                        <span className="text-dark-400">اختر صورة (JPG, PNG, WebP)</span>
                                    </label>
                                </div>
                                <p className="text-dark-500 text-xs mt-1">الحد الأقصى: 5MB (اختياري)</p>
                                {formData.imageUrl && formData.imageUrl !== 'uploading...' && (
                                    <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden bg-dark-800">
                                        <img
                                            src={formData.imageUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                            className="absolute top-2 left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                                {formData.imageUrl === 'uploading...' && (
                                    <div className="mt-2 flex items-center gap-2 text-primary-500">
                                        <div className="spinner w-4 h-4"></div>
                                        <span>جاري رفع الصورة...</span>
                                    </div>
                                )}
                            </div>


                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">التصنيف</label>
                                    <select
                                        className="input"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {categories.map((cat) => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">السعر ($) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="input"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Flexible Pricing Toggle */}
                            <div className="bg-dark-800/50 rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-dark-300 text-sm">💰 السعر مفتوح (المشتري يحدد المبلغ)</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isFlexiblePrice: !formData.isFlexiblePrice })}
                                        className={`w-12 h-6 rounded-full transition-colors ${formData.isFlexiblePrice ? 'bg-primary-500' : 'bg-dark-600'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${formData.isFlexiblePrice ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                                    </button>
                                </div>
                                {formData.isFlexiblePrice && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-dark-400 text-xs mb-1">الحد الأدنى ($)</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.minPrice}
                                                onChange={(e) => setFormData({ ...formData, minPrice: parseFloat(e.target.value) || 1 })}
                                                min={0.01}
                                                step="0.01"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-dark-400 text-xs mb-1">الحد الأقصى ($)</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.maxPrice}
                                                onChange={(e) => setFormData({ ...formData, maxPrice: parseFloat(e.target.value) || 1000 })}
                                                min={1}
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Required Fields from Buyer */}
                            <div className="bg-dark-800/50 rounded-xl p-4">
                                <label className="block text-dark-300 text-sm mb-3">📋 المعلومات المطلوبة من المشتري</label>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.requirePhone}
                                            onChange={(e) => setFormData({ ...formData, requirePhone: e.target.checked })}
                                            className="w-5 h-5 rounded accent-primary-500"
                                        />
                                        <span className="text-white">📱 رقم الهاتف</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.requireEmail}
                                            onChange={(e) => setFormData({ ...formData, requireEmail: e.target.checked })}
                                            className="w-5 h-5 rounded accent-primary-500"
                                        />
                                        <span className="text-white">📧 البريد الإلكتروني</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.requireUsername}
                                            onChange={(e) => setFormData({ ...formData, requireUsername: e.target.checked })}
                                            className="w-5 h-5 rounded accent-primary-500"
                                        />
                                        <span className="text-white">👤 اسم المستخدم</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.requireNote}
                                            onChange={(e) => setFormData({ ...formData, requireNote: e.target.checked })}
                                            className="w-5 h-5 rounded accent-primary-500"
                                        />
                                        <span className="text-white">📝 ملاحظات إضافية</span>
                                    </label>
                                    <div className="pt-2">
                                        <input
                                            type="text"
                                            className="input text-sm"
                                            value={formData.customFieldLabel}
                                            onChange={(e) => setFormData({ ...formData, customFieldLabel: e.target.value })}
                                            placeholder="حقل مخصص آخر (اختياري)..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="btn-primary flex-1"
                                    disabled={submitting}
                                >
                                    {submitting ? <div className="spinner w-5 h-5"></div> : 'تقديم الخدمة'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); setMessage(null); }}
                                    className="btn-ghost flex-1"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
