'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, DocumentIcon, CameraIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function KYCPage() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [kycStatus, setKycStatus] = useState<string>('NOT_SUBMITTED');
    const [rejectionReason, setRejectionReason] = useState<string>('');
    const [idPhoto, setIdPhoto] = useState<File | null>(null);
    const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
    const [idPreview, setIdPreview] = useState<string>('');
    const [selfiePreview, setSelfiePreview] = useState<string>('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchKycStatus();
    }, []);

    const fetchKycStatus = async () => {
        try {
            const res = await fetch('/api/user/kyc/status');
            if (res.ok) {
                const data = await res.json();
                setKycStatus(data.status || 'NOT_SUBMITTED');
                setRejectionReason(data.rejectionReason || '');
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setLoading(false);
    };

    const handleFileChange = (file: File | null, type: 'id' | 'selfie') => {
        if (!file) return;

        if (type === 'id') {
            setIdPhoto(file);
            setIdPreview(URL.createObjectURL(file));
        } else {
            setSelfiePhoto(file);
            setSelfiePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        if (!idPhoto || !selfiePhoto) {
            setError('الرجاء رفع جميع الصور المطلوبة');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('idPhoto', idPhoto);
            formData.append('selfiePhoto', selfiePhoto);

            const res = await fetch('/api/user/kyc/submit', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
                setKycStatus('PENDING');
            } else {
                setError(data.error || 'حدث خطأ');
            }
        } catch (error) {
            setError('خطأ في الاتصال');
        }
        setSubmitting(false);
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    const statusConfig = {
        NOT_SUBMITTED: { icon: DocumentIcon, color: 'text-dark-400', bg: 'bg-dark-700', label: 'لم يتم الإرسال' },
        PENDING: { icon: ClockIcon, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'قيد المراجعة' },
        APPROVED: { icon: CheckCircleIcon, color: 'text-green-400', bg: 'bg-green-500/10', label: 'تم التوثيق ✓' },
        REJECTED: { icon: XCircleIcon, color: 'text-red-400', bg: 'bg-red-500/10', label: 'تم الرفض' },
    };

    const status = statusConfig[kycStatus as keyof typeof statusConfig] || statusConfig.NOT_SUBMITTED;
    const StatusIcon = status.icon;

    return (
        <div className="min-h-screen bg-dark-950">
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/settings" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </Link>
                        <h1 className="text-xl font-bold text-white">📋 التوثيق (KYC)</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-8 px-4">
                <div className="max-w-md mx-auto space-y-6">
                    {/* Status Card */}
                    <div className={`card p-6 ${status.bg}`}>
                        <div className="flex items-center gap-4">
                            <StatusIcon className={`w-12 h-12 ${status.color}`} />
                            <div>
                                <p className="text-dark-400 text-sm">حالة التوثيق</p>
                                <p className={`text-lg font-bold ${status.color}`}>{status.label}</p>
                            </div>
                        </div>
                        {kycStatus === 'REJECTED' && rejectionReason && (
                            <div className="mt-4 p-3 bg-red-500/10 rounded-lg">
                                <p className="text-red-400 text-sm">سبب الرفض: {rejectionReason}</p>
                            </div>
                        )}
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="card p-6 bg-green-500/10 text-center">
                            <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
                            <p className="text-green-400 font-bold">تم إرسال الطلب بنجاح!</p>
                            <p className="text-dark-400 text-sm mt-2">سيتم مراجعته خلال 24 ساعة</p>
                        </div>
                    )}

                    {/* Upload Form */}
                    {(kycStatus === 'NOT_SUBMITTED' || kycStatus === 'REJECTED') && !success && (
                        <div className="card p-6">
                            <h2 className="text-white font-semibold mb-4">رفع المستندات</h2>

                            {/* ID Photo */}
                            <div className="mb-4">
                                <label className="block text-dark-300 text-sm mb-2">صورة الهوية</label>
                                <div
                                    className="border-2 border-dashed border-dark-600 rounded-xl p-4 text-center cursor-pointer hover:border-primary-500/50 transition-colors"
                                    onClick={() => document.getElementById('id-input')?.click()}
                                >
                                    {idPreview ? (
                                        <img src={idPreview} alt="ID" className="w-full h-32 object-cover rounded-lg" />
                                    ) : (
                                        <>
                                            <DocumentIcon className="w-10 h-10 text-dark-500 mx-auto mb-2" />
                                            <p className="text-dark-400 text-sm">اضغط لرفع صورة الهوية</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    id="id-input"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'id')}
                                />
                            </div>

                            {/* Selfie Photo */}
                            <div className="mb-6">
                                <label className="block text-dark-300 text-sm mb-2">صورة سيلفي مع الهوية</label>
                                <div
                                    className="border-2 border-dashed border-dark-600 rounded-xl p-4 text-center cursor-pointer hover:border-primary-500/50 transition-colors"
                                    onClick={() => document.getElementById('selfie-input')?.click()}
                                >
                                    {selfiePreview ? (
                                        <img src={selfiePreview} alt="Selfie" className="w-full h-32 object-cover rounded-lg" />
                                    ) : (
                                        <>
                                            <CameraIcon className="w-10 h-10 text-dark-500 mx-auto mb-2" />
                                            <p className="text-dark-400 text-sm">اضغط لرفع صورة سيلفي</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    id="selfie-input"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'selfie')}
                                />
                            </div>

                            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !idPhoto || !selfiePhoto}
                                className="btn-primary w-full"
                            >
                                {submitting ? <div className="spinner w-5 h-5"></div> : 'إرسال للمراجعة'}
                            </button>
                        </div>
                    )}

                    {/* Info */}
                    {kycStatus === 'PENDING' && (
                        <div className="card p-6 bg-yellow-500/10">
                            <p className="text-yellow-400 text-center">
                                ⏳ طلبك قيد المراجعة، يرجى الانتظار...
                            </p>
                        </div>
                    )}

                    {kycStatus === 'APPROVED' && (
                        <div className="card p-6 bg-green-500/10">
                            <p className="text-green-400 text-center">
                                ✅ حسابك موثق بالكامل!
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
