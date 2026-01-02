'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    EyeIcon,
    EyeSlashIcon,
    PhoneIcon,
    UserIcon,
    EnvelopeIcon,
    CalendarIcon,
    CheckIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import FileUpload from '@/components/FileUpload';
import CameraCapture from '@/components/CameraCapture';

export default function RegisterPage() {
    const t = useTranslations();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        address: '', // NEW: Added address field
        dateOfBirth: '',
        idPhotoFront: null as File | null,
        idPhotoBack: null as File | null,
        selfiePhoto: null as File | null,
        terms: false, // Terms checkbox
    });
    const [files, setFiles] = useState<{
        idPhotoFront: File | null;
        idPhotoBack: File | null;
        selfie: File | null;
    }>({
        idPhotoFront: null,
        idPhotoBack: null,
        selfie: null,
    });

    const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        const levels = [
            { label: t('errors.passwordWeak'), color: 'bg-red-500' },
            { label: t('errors.passwordWeak'), color: 'bg-orange-500' },
            { label: t('common.processing'), color: 'bg-yellow-500' },
            { label: t('common.approved'), color: 'bg-blue-500' },
            { label: t('common.completed'), color: 'bg-green-500' },
        ];

        return { strength, ...levels[Math.min(strength, 4)] };
    };

    // Syrian phone number validation (+963)
    const validateSyrianPhone = (phone: string): { isValid: boolean; message: string } => {
        // Remove all spaces and dashes
        const cleaned = phone.replace(/[\s\-]/g, '');

        // Check if empty
        if (!cleaned) {
            return { isValid: false, message: '' };
        }

        // Valid formats: +963XXXXXXXXX or 963XXXXXXXXX or 09XXXXXXXX
        const fullFormat = /^\+?963[0-9]{9}$/;
        const localFormat = /^0?9[0-9]{8}$/;

        if (fullFormat.test(cleaned)) {
            return { isValid: true, message: 'رقم صحيح ✓' };
        }

        if (localFormat.test(cleaned)) {
            return { isValid: true, message: 'رقم صحيح ✓' };
        }

        // Check if it's partially valid (typing in progress)
        if (cleaned.startsWith('+963') || cleaned.startsWith('963')) {
            const digits = cleaned.replace(/^\+?963/, '');
            if (digits.length < 9) {
                return { isValid: false, message: `بقي ${9 - digits.length} أرقام` };
            }
            if (digits.length > 9) {
                return { isValid: false, message: 'الرقم طويل جداً' };
            }
        }

        if (cleaned.startsWith('09') || cleaned.startsWith('9')) {
            const digits = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;
            if (digits.length < 9) {
                return { isValid: false, message: `بقي ${9 - digits.length} أرقام` };
            }
            if (digits.length > 9) {
                return { isValid: false, message: 'الرقم طويل جداً' };
            }
        }

        return { isValid: false, message: 'يجب أن يبدأ بـ +963 أو 09' };
    };

    const phoneValidation = validateSyrianPhone(formData.phone);
    const passwordStrength = getPasswordStrength(formData.password);

    const handleNext = () => {
        setError('');

        if (step === 1) {
            if (!formData.fullName || !formData.phone || !formData.email) {
                setError(t('errors.required'));
                return;
            }
            if (!phoneValidation.isValid) {
                setError('رقم الهاتف غير صحيح - يجب أن يكون رقم سوري (+963)');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError(t('errors.passwordMismatch'));
                return;
            }
            if (formData.password.length < 8) {
                setError(t('errors.passwordWeak'));
                return;
            }
            if (!formData.terms) {
                setError(t('errors.required'));
                return;
            }
        }

        if (step === 2) {
            if (!files.idPhotoFront || !files.idPhotoBack || !files.selfie) {
                setError('الرجاء رفع جميع الصور المطلوبة');
                return;
            }
        }

        if (step < 2) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');

        try {
            // Create FormData for file upload
            const data = new FormData();
            data.append('fullName', formData.fullName);
            data.append('phone', formData.phone);
            data.append('email', formData.email || '');
            data.append('password', formData.password);
            data.append('address', formData.address || ''); // NEW: Include address
            data.append('dateOfBirth', formData.dateOfBirth || '');

            if (files.idPhotoFront) data.append('idPhotoFront', files.idPhotoFront);
            if (files.idPhotoBack) data.append('idPhotoBack', files.idPhotoBack);
            if (files.selfie) data.append('selfiePhoto', files.selfie);

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                body: data,
            });

            let result;
            const contentType = response.headers.get("content-type");

            if (contentType && contentType.indexOf("application/json") !== -1) {
                result = await response.json();
            } else {
                // If response is not JSON (likely HTML error page like 413 or 500)
                const text = await response.text();
                console.error('Registration Server Error:', text);
                throw new Error('حدث خطأ في الاتصال بالخادم. الرجاء المحاولة مرة أخرى أو التأكد من حجم الصور.');
            }

            if (!response.ok) {
                throw new Error(result.error || 'فشل التسجيل');
            }

            // Redirect to success page
            router.push('/register/success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ ما');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                {/* Logo */}
                <Link href="/" className="flex flex-col items-center gap-3 mb-8 justify-center">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl border border-primary-500/20">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-3xl font-bold text-gradient">{t('common.appName')}</span>
                </Link>

                <div className="card p-8">
                    {/* Progress Steps */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-500 text-dark-900' : 'bg-dark-800 text-dark-400'}`}>
                                {step > 1 ? <CheckIcon className="w-5 h-5" /> : '1'}
                            </div>
                            <div className={`w-20 h-1 ${step >= 2 ? 'bg-primary-500' : 'bg-dark-800'}`} />
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-500 text-dark-900' : 'bg-dark-800 text-dark-400'}`}>
                                2
                            </div>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-white mb-2">
                            {step === 1 ? 'إنشاء حساب جديد' : 'التحقق من الهوية (KYC)'}
                        </h1>
                        <p className="text-dark-400">
                            {step === 1 ? 'املأ بياناتك الشخصية' : 'قم برفع صورة هويتك وسيلفي للتحقق'}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Personal Info */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="fullName" className="label">الاسم الكامل *</label>
                                <div className="relative">
                                    <UserIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-500" />
                                    <input
                                        id="fullName"
                                        type="text"
                                        className="input pr-12"
                                        placeholder="أكتب الإسم هنا"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="phone" className="label">رقم الهاتف * <span className="text-dark-500 text-xs">(سوري +963)</span></label>
                                <div className="relative">
                                    <PhoneIcon className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${!formData.phone ? 'text-dark-500' :
                                        phoneValidation.isValid ? 'text-green-500' : 'text-red-500'
                                        }`} />
                                    <input
                                        id="phone"
                                        type="tel"
                                        className={`input pr-12 text-left transition-all ${!formData.phone ? '' :
                                            phoneValidation.isValid
                                                ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                                                : 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                            }`}
                                        placeholder="+963 9XX XXX XXX"
                                        dir="ltr"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        required
                                    />
                                </div>
                                {formData.phone && phoneValidation.message && (
                                    <p className={`mt-1 text-xs ${phoneValidation.isValid ? 'text-green-500' : 'text-red-400'}`}>
                                        {phoneValidation.message}
                                    </p>
                                )}
                            </div>

                            {/* Address Field - NEW */}
                            <div>
                                <label htmlFor="address" className="label">العنوان الكامل (اختياري)</label>
                                <div className="relative">
                                    <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <input
                                        id="address"
                                        type="text"
                                        className="input pr-12"
                                        placeholder="مثال: شارع الثورة - حي المزة - دمشق"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-dark-500 mt-1">يستخدم للتواصل وإرسال البطاقات البنكية</p>
                            </div>

                            <div>
                                <label htmlFor="email" className="label">البريد الإلكتروني (اختياري)</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-500" />
                                    <input
                                        id="email"
                                        type="email"
                                        className="input pr-12 text-left"
                                        placeholder="email@example.com"
                                        dir="ltr"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="dateOfBirth" className="label">تاريخ الميلاد *</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-500" />
                                    <input
                                        id="dateOfBirth"
                                        type="date"
                                        className="input pr-12"
                                        value={formData.dateOfBirth}
                                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="label">كلمة المرور *</label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="input pl-12"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-dark-500 hover:text-dark-300"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>

                                {formData.password && (
                                    <div className="mt-2">
                                        <div className="flex gap-1 mb-1">
                                            {[1, 2, 3, 4, 5].map((level) => (
                                                <div
                                                    key={level}
                                                    className={`h-1 flex-1 rounded-full transition-colors ${level <= passwordStrength.strength ? passwordStrength.color : 'bg-dark-700'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-dark-400">
                                            قوة كلمة المرور: <span className={passwordStrength.color.replace('bg-', 'text-')}>{passwordStrength.label}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="label">تأكيد كلمة المرور *</label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        className="input"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                {formData.confirmPassword && (
                                    <p className={`text-xs mt-1 ${formData.password === formData.confirmPassword ? 'text-green-500' : 'text-red-500'}`}>
                                        {formData.password === formData.confirmPassword ? '✓ متطابقة' : '✗ غير متطابقة'}
                                    </p>
                                )}
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 mt-0.5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500/20"
                                    checked={formData.terms}
                                    onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                                    required
                                />
                                <span className="text-sm text-dark-300">
                                    أوافق على{' '}
                                    <Link href="/terms" className="text-primary-500 hover:underline">شروط الخدمة</Link>
                                    {' و '}
                                    <Link href="/privacy" className="text-primary-500 hover:underline">سياسة الخصوصية</Link>
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Step 2: KYC Documents */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
                                <p className="font-medium mb-1">📋 متطلبات التحقق</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>صورة واضحة للوجه الأمامي للهوية</li>
                                    <li>صورة واضحة للوجه الخلفي للهوية</li>
                                    <li>صورة سيلفي حديثة (صورة شخصية)</li>
                                    <li>الصور يجب أن تكون بصيغة JPG أو PNG</li>
                                    <li>حجم الصورة لا يتجاوز 5MB</li>
                                </ul>
                            </div>

                            <FileUpload
                                label="صورة الهوية - الوجه الأمامي *"
                                onFileSelect={(file) => setFiles({ ...files, idPhotoFront: file })}
                                error={error && !files.idPhotoFront ? 'مطلوب' : undefined}
                            />

                            <FileUpload
                                label="صورة الهوية - الوجه الخلفي *"
                                onFileSelect={(file) => setFiles({ ...files, idPhotoBack: file })}
                                error={error && !files.idPhotoBack ? 'مطلوب' : undefined}
                            />

                            <CameraCapture
                                label="صورة سيلفي (صورة شخصية) *"
                                onCapture={(file) => setFiles({ ...files, selfie: file })}
                                error={error && !files.selfie ? 'مطلوب' : undefined}
                            />

                            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                                <p className="font-medium mb-1">⏳ ملاحظة مهمة</p>
                                <p className="text-xs">
                                    بعد إرسال الطلب، سيقوم فريق الإدارة بمراجعة بياناتك. قد تستغرق عملية المراجعة من 24 إلى 48 ساعة.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 mt-8">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="btn-ghost flex-1"
                                disabled={isLoading}
                            >
                                السابق
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleNext}
                            className="btn-primary flex-1"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="spinner w-5 h-5"></div>
                            ) : (
                                <>
                                    <span>{step === 2 ? 'إرسال الطلب' : 'التالي'}</span>
                                    <ArrowRightIcon className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Login Link */}
                <p className="mt-6 text-center text-dark-400">
                    لديك حساب بالفعل؟{' '}
                    <Link href="/login" className="text-primary-500 hover:text-primary-400 font-medium transition-colors">
                        تسجيل الدخول
                    </Link>
                </p>
            </div>
        </div>
    );
}
