'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    DevicePhoneMobileIcon,
    DocumentTextIcon,
    SparklesIcon,
    RectangleStackIcon,
    CheckCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

interface Service {
    id: string;
    name: string;
    nameAr: string | null;
    description: string;
    descriptionAr: string | null;
    category: string;
    price: number;
    isFlexiblePrice: boolean;
    minPrice: number | null;
    maxPrice: number | null;
    currency: string;
    iconUrl: string | null;
    imageUrl: string | null;
    requiredFields: string | null; // JSON array of required field configs
    metadata: string | null;
}

interface Category {
    name: string;
    nameAr: string;
    services: Service[];
}

const categoryIcons: Record<string, any> = {
    RECHARGE: DevicePhoneMobileIcon,
    BILL: DocumentTextIcon,
    SUBSCRIPTION: SparklesIcon,
    OTHER: RectangleStackIcon,
};

export default function ServicesPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [purchasing, setPurchasing] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    // Dynamic buyer inputs
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [note, setNote] = useState('');
    const [customFieldValue, setCustomFieldValue] = useState('');
    const [customAmount, setCustomAmount] = useState<number>(0);

    useEffect(() => {
        setMounted(true);
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const res = await fetch('/api/services');
            if (res.ok) {
                const data = await res.json();
                setCategories(data.categories || []);
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    // Reset all form inputs when modal opens/closes
    const resetFormInputs = () => {
        setPhoneNumber('');
        setEmail('');
        setUsername('');
        setNote('');
        setCustomFieldValue('');
        setCustomAmount(0);
        setResult(null);
    };

    // Handle service selection
    const handleSelectService = (service: Service) => {
        resetFormInputs();
        setSelectedService(service);
    };

    const handlePurchase = async () => {
        if (!selectedService) return;

        // Check required fields based on service config
        const fields = parseRequiredFields(selectedService.requiredFields);
        if (fields.requirePhone && (!phoneNumber || phoneNumber.length < 9)) {
            setResult({ type: 'error', message: 'رقم الهاتف مطلوب' });
            return;
        }
        if (fields.requireEmail && !email) {
            setResult({ type: 'error', message: 'البريد الإلكتروني مطلوب' });
            return;
        }
        if (fields.requireUsername && !username) {
            setResult({ type: 'error', message: 'اسم المستخدم مطلوب' });
            return;
        }
        if (selectedService.isFlexiblePrice && !customAmount) {
            setResult({ type: 'error', message: 'أدخل المبلغ المطلوب' });
            return;
        }

        setPurchasing(true);
        setResult(null);

        try {
            // Collect all dynamic inputs
            const userInput = JSON.stringify({
                phoneNumber,
                email,
                username,
                note,
                customFieldValue,
                customAmount
            });

            const res = await fetch('/api/services/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId: selectedService.id,
                    phoneNumber,
                    amount: customAmount || selectedService.price,
                    userInput,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setResult({ type: 'success', message: data.message || 'تم شراء الخدمة بنجاح!' });
                setTimeout(() => {
                    setSelectedService(null);
                    setResult(null);
                }, 2000);
            } else {
                setResult({ type: 'error', message: data.error || 'فشل شراء الخدمة' });
            }
        } catch (error) {
            setResult({ type: 'error', message: 'حدث خطأ في الاتصال' });
        }

        setPurchasing(false);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(price);
    };

    const parseRequiredFields = (fields: string | null) => {
        if (!fields) return { requirePhone: true };
        try {
            // If it's already a JSON structure
            if (fields.startsWith('[') || fields.startsWith('{')) {
                return JSON.parse(fields);
            }
            // If it's just raw text (fallback for legacy or broken data)
            return { requirePhone: true, customFieldLabel: fields };
        } catch (e) {
            console.error('Failed to parse required fields:', e);
            return { requirePhone: true };
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
                        <Link href="/dashboard" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-lg sm:text-xl font-bold text-white">🛍️ الخدمات</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-4xl mx-auto">
                    {categories.length === 0 ? (
                        <div className="card p-12 text-center">
                            <RectangleStackIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                            <p className="text-dark-400">لا توجد خدمات متاحة حالياً</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {categories.map((category) => {
                                const Icon = categoryIcons[category.name] || RectangleStackIcon;
                                return (
                                    <div key={category.name}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                                <Icon className="w-5 h-5 text-primary-500" />
                                            </div>
                                            <h2 className="text-lg font-bold text-white">{category.nameAr}</h2>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {category.services.map((service) => (
                                                <button
                                                    key={service.id}
                                                    onClick={() => handleSelectService(service)}
                                                    className="card p-0 overflow-hidden text-right hover:border-primary-500/50 transition-all group"
                                                >
                                                    {/* Service Image or Gradient */}
                                                    {service.imageUrl ? (
                                                        <div className="relative h-28 bg-dark-800 overflow-hidden">
                                                            <img
                                                                src={service.imageUrl}
                                                                alt={service.nameAr || service.name}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 to-transparent" />
                                                            <div className="absolute bottom-2 right-3 left-3">
                                                                <h3 className="text-white font-bold drop-shadow-lg">
                                                                    {service.nameAr || service.name}
                                                                </h3>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-20 bg-gradient-to-br from-primary-500/20 via-dark-800 to-dark-900 flex items-center justify-center">
                                                            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                                                                <Icon className="w-5 h-5 text-primary-400" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Content */}
                                                    <div className="p-4">
                                                        {!service.imageUrl && (
                                                            <h3 className="text-white font-semibold group-hover:text-primary-400 transition-colors mb-1">
                                                                {service.nameAr || service.name}
                                                            </h3>
                                                        )}
                                                        <p className="text-dark-400 text-sm line-clamp-2 mb-2">
                                                            {service.descriptionAr || service.description}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-primary-500 font-bold">
                                                                {formatPrice(service.price)} $
                                                            </span>
                                                            <span className="text-xs text-dark-500 bg-dark-800 px-2 py-1 rounded">
                                                                {service.isFlexiblePrice ? 'سعر مرن' : 'سعر ثابت'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Purchase Modal */}
            {selectedService && (
                <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
                    <div className="card p-6 w-full max-w-md mx-4 mb-0 sm:mb-4 rounded-b-none sm:rounded-b-2xl animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg sm:text-xl font-bold text-white">تأكيد الشراء</h2>
                            <button
                                onClick={() => { setSelectedService(null); resetFormInputs(); }}
                                className="btn-ghost btn-icon"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {result ? (
                            <div className={`text-center py-8 ${result.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {result.type === 'success' ? (
                                    <CheckCircleIcon className="w-16 h-16 mx-auto mb-4" />
                                ) : (
                                    <XMarkIcon className="w-16 h-16 mx-auto mb-4" />
                                )}
                                <p className="text-lg font-semibold">{result.message}</p>
                            </div>
                        ) : (
                            <>
                                {/* Service Info */}
                                <div className="bg-dark-800 rounded-xl p-4 mb-4">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        {selectedService.imageUrl && (
                                            <img src={selectedService.imageUrl} className="w-12 h-12 rounded-lg object-cover" alt="" />
                                        )}
                                        <div>
                                            <p className="text-white font-semibold">{selectedService.nameAr || selectedService.name}</p>
                                            <p className="text-dark-400 text-sm">{selectedService.descriptionAr || selectedService.description}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Fields Based on requiredFields */}
                                {(() => {
                                    const fields = parseRequiredFields(selectedService.requiredFields);
                                    return (
                                        <div className="space-y-4 mb-4">
                                            {/* Phone Number */}
                                            {fields.requirePhone && (
                                                <div>
                                                    <label className="block text-dark-300 text-sm mb-2">📱 رقم الهاتف *</label>
                                                    <input
                                                        type="tel"
                                                        className="input text-center text-lg font-mono"
                                                        placeholder="09xxxxxxxx"
                                                        value={phoneNumber}
                                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                                        dir="ltr"
                                                    />
                                                </div>
                                            )}

                                            {/* Email */}
                                            {fields.requireEmail && (
                                                <div>
                                                    <label className="block text-dark-300 text-sm mb-2">📧 البريد الإلكتروني *</label>
                                                    <input
                                                        type="email"
                                                        className="input"
                                                        placeholder="example@email.com"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        dir="ltr"
                                                    />
                                                </div>
                                            )}

                                            {/* Username */}
                                            {fields.requireUsername && (
                                                <div>
                                                    <label className="block text-dark-300 text-sm mb-2">👤 اسم المستخدم *</label>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        placeholder="username"
                                                        value={username}
                                                        onChange={(e) => setUsername(e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            {/* Note */}
                                            {fields.requireNote && (
                                                <div>
                                                    <label className="block text-dark-300 text-sm mb-2">📝 ملاحظات</label>
                                                    <textarea
                                                        className="input min-h-[80px]"
                                                        placeholder="أي تفاصيل إضافية..."
                                                        value={note}
                                                        onChange={(e) => setNote(e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            {/* Custom Field */}
                                            {fields.customFieldLabel && (
                                                <div>
                                                    <label className="block text-dark-300 text-sm mb-2">📋 {fields.customFieldLabel} *</label>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        placeholder={fields.customFieldLabel}
                                                        value={customFieldValue}
                                                        onChange={(e) => setCustomFieldValue(e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Amount Input - Only for flexible price services */}
                                {selectedService.isFlexiblePrice && (
                                    <div className="mb-4">
                                        <label className="block text-dark-300 text-sm mb-2">
                                            💵 أدخل المبلغ المطلوب ($) *
                                        </label>
                                        <input
                                            type="number"
                                            className="input text-center text-2xl font-bold"
                                            placeholder="أدخل المبلغ"
                                            value={customAmount || ''}
                                            onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
                                            min={selectedService.minPrice || 1}
                                            max={selectedService.maxPrice || 10000}
                                            step="0.01"
                                            required
                                        />
                                        {selectedService.minPrice && selectedService.maxPrice && (
                                            <p className="text-dark-500 text-xs mt-1 text-center">
                                                الحد: ${formatPrice(selectedService.minPrice)} - ${formatPrice(selectedService.maxPrice)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Total */}
                                <div className="bg-gradient-to-r from-primary-500/20 to-purple-500/20 rounded-xl p-4 mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-dark-300">المبلغ الإجمالي</span>
                                        <span className="text-3xl font-bold text-primary-400">
                                            ${formatPrice(customAmount || selectedService.price)}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handlePurchase}
                                    disabled={purchasing}
                                    className="btn-primary w-full py-4 text-lg disabled:opacity-50"
                                >
                                    {purchasing ? (
                                        <div className="spinner w-6 h-6"></div>
                                    ) : (
                                        '🛒 تأكيد الشراء'
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
