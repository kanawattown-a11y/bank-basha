'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
    ArrowLeftIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    EyeIcon,
    RectangleStackIcon,
    InboxStackIcon,
} from '@heroicons/react/24/outline';

// ==================== INTERFACES ====================
interface AdminService {
    id: string;
    name: string;
    nameAr: string | null;
    description: string;
    descriptionAr: string | null;
    category: string;
    categoryAr: string | null;
    price: number;
    currency: string;
    isActive: boolean;
    _count: { purchases: number };
}

interface Service {
    id: string;
    name: string;
    nameAr: string | null;
    description: string;
    category: string;
    price: number;
    currency: string; // NEW: Currency field
    isActive: boolean;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
    seller: {
        id: string;
        fullName: string;
        fullNameAr: string | null;
    } | null;
    _count: { purchases: number };
}

interface ServiceRequest {
    id: string;
    name: string;
    nameAr: string | null;
    description: string;
    descriptionAr: string | null;
    price: number;
    currency: string; // NEW: Currency field
    category: string;
    categoryAr: string | null;
    imageUrl: string | null;
    status: string;
    createdAt: string;
    seller: {
        id: string;
        fullName: string;
        fullNameAr: string | null;
        phone: string;
    } | null;
    _count: { purchases: number };
}

const categories = [
    { value: 'RECHARGE', label: 'شحن رصيد' },
    { value: 'BILL', label: 'دفع فواتير' },
    { value: 'SUBSCRIPTION', label: 'اشتراكات' },
    { value: 'OTHER', label: 'أخرى' },
];

export default function AdminServicesPage() {
    const t = useTranslations();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'services' | 'requests'>('services');

    // Services Tab State
    const [loadingServices, setLoadingServices] = useState(true);
    const [services, setServices] = useState<AdminService[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState<AdminService | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        nameAr: '',
        description: '',
        descriptionAr: '',
        category: 'RECHARGE',
        price: 0,
        isActive: true,
        // Flexible pricing
        isFlexiblePrice: false,
        minPrice: 1,
        maxPrice: 1000,
        // Required fields
        requirePhone: true,
        requireEmail: false,
        requireUsername: false,
        requireNote: false,
        customFieldLabel: '',
    });

    // Requests Tab State
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchServices();
        fetchRequests();
    }, []);

    // ==================== SERVICES FUNCTIONS ====================
    const fetchServices = async () => {
        try {
            const res = await fetch('/api/admin/services');
            if (res.ok) {
                const data = await res.json();
                setServices(data.services || []);
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setLoadingServices(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingService
                ? `/api/admin/services/${editingService.id}`
                : '/api/admin/services';
            const method = editingService ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                fetchServices();
                setShowModal(false);
                resetForm();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('admin.services.deleteConfirm'))) return;
        try {
            const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
            if (res.ok) fetchServices();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const openEditModal = (service: AdminService) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            nameAr: service.nameAr || '',
            description: service.description,
            descriptionAr: service.descriptionAr || '',
            category: service.category,
            price: service.price,
            isActive: service.isActive,
            isFlexiblePrice: false,
            minPrice: 1,
            maxPrice: 1000,
            requirePhone: true,
            requireEmail: false,
            requireUsername: false,
            requireNote: false,
            customFieldLabel: '',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingService(null);
        setFormData({
            name: '',
            nameAr: '',
            description: '',
            descriptionAr: '',
            category: 'RECHARGE',
            price: 0,
            isActive: true,
            isFlexiblePrice: false,
            minPrice: 1,
            maxPrice: 1000,
            requirePhone: true,
            requireEmail: false,
            requireUsername: false,
            requireNote: false,
            customFieldLabel: '',
        });
    };

    // ==================== REQUESTS FUNCTIONS ====================
    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/admin/service-requests');
            if (res.ok) {
                const data = await res.json();
                setRequests(data.services || []);
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setLoadingRequests(false);
    };

    const handleAction = async (action: 'approve' | 'reject') => {
        if (!selectedRequest) return;
        setProcessing(true);

        try {
            const res = await fetch('/api/admin/service-requests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId: selectedRequest.id,
                    action,
                    rejectionReason: action === 'reject' ? rejectionReason : undefined,
                }),
            });

            if (res.ok) {
                fetchRequests();
                setSelectedRequest(null);
                setRejectionReason('');
            }
        } catch (error) {
            console.error('Error:', error);
        }
        setProcessing(false);
    };

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;

    if (!mounted) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center" suppressHydrationWarning>
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <header className="navbar">
                <div className="navbar-container">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="btn-ghost btn-icon">
                            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </Link>
                        <h1 className="text-xl font-bold text-white">{t('admin.services.title')}</h1>
                    </div>
                    {activeTab === 'services' && (
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="btn-primary flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            {t('admin.services.addService')}
                        </button>
                    )}
                </div>
            </header>

            {/* Tabs */}
            <div className="pt-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex gap-2 mb-6 bg-dark-900 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('services')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${activeTab === 'services'
                                ? 'bg-primary-500 text-white'
                                : 'text-dark-400 hover:text-white'
                                }`}
                        >
                            <RectangleStackIcon className="w-5 h-5" />
                            {t('admin.services.tabs.services')}
                        </button>
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${activeTab === 'requests'
                                ? 'bg-primary-500 text-white'
                                : 'text-dark-400 hover:text-white'
                                }`}
                        >
                            <InboxStackIcon className="w-5 h-5" />
                            {t('admin.services.tabs.requests')}
                            {pendingCount > 0 && (
                                <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="pb-8 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* ==================== SERVICES TAB ==================== */}
                    {activeTab === 'services' && (
                        <>
                            {loadingServices ? (
                                <div className="flex justify-center py-20">
                                    <div className="spinner w-12 h-12"></div>
                                </div>
                            ) : services.length === 0 ? (
                                <div className="card p-12 text-center">
                                    <p className="text-dark-400">{t('admin.services.noServices')}</p>
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="btn-primary mt-4"
                                    >
                                        {t('admin.services.addFirstService')}
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {services.map((service) => (
                                        <div key={service.id} className="card p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-white font-semibold">
                                                            {service.nameAr || service.name}
                                                        </h3>
                                                        <span className={`px-2 py-1 rounded-lg text-xs ${service.isActive
                                                            ? 'bg-green-500/10 text-green-400'
                                                            : 'bg-red-500/10 text-red-400'
                                                            }`}>
                                                            {service.isActive ? t('common.active') : t('common.inactive')}
                                                        </span>
                                                    </div>
                                                    <p className="text-dark-400 text-sm mb-2">
                                                        {service.descriptionAr || service.description}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span className="text-primary-500 font-bold">
                                                            {service.price} $
                                                        </span>
                                                        <span className="text-dark-500">
                                                            {t(`services.categories.${service.category.toLowerCase()}`)}
                                                        </span>
                                                        <span className="text-dark-500">
                                                            {service._count.purchases} {t('admin.services.purchasesCount')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(service)}
                                                        className="btn-ghost btn-icon"
                                                    >
                                                        <PencilIcon className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service.id)}
                                                        className="btn-ghost btn-icon text-red-500"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ==================== REQUESTS TAB ==================== */}
                    {activeTab === 'requests' && (
                        <>
                            {loadingRequests ? (
                                <div className="flex justify-center py-20">
                                    <div className="spinner w-12 h-12"></div>
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="card p-12 text-center">
                                    <p className="text-dark-400">{t('admin.services.noRequests')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Pending Requests */}
                                    {requests.filter(r => r.status === 'PENDING').length > 0 && (
                                        <div className="mb-8">
                                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                <ClockIcon className="w-5 h-5 text-yellow-400" />
                                                {t('admin.services.newRequests')} ({requests.filter(r => r.status === 'PENDING').length})
                                            </h2>
                                            <div className="space-y-4">
                                                {requests.filter(r => r.status === 'PENDING').map((request) => (
                                                    <div key={request.id} className="card p-5 border-yellow-500/30">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex-1">
                                                                <h3 className="text-white font-semibold">{request.nameAr || request.name}</h3>
                                                                <p className="text-dark-400 text-sm mt-1">{request.description}</p>
                                                                <p className="text-dark-500 text-xs mt-2">
                                                                    {t('admin.services.providedBy')} {request.seller?.fullNameAr || request.seller?.fullName} ({request.seller?.phone})
                                                                </p>
                                                            </div>
                                                            <p className="text-primary-500 font-bold">
                                                                {request.currency === 'SYP' ? 'ل.س' : '$'}{request.price.toFixed(request.currency === 'SYP' ? 0 : 2)}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => setSelectedRequest(request)}
                                                            className="btn-ghost text-sm flex items-center gap-1"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                            {t('common.details')}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Reviewed Requests */}
                                    {requests.filter(r => r.status !== 'PENDING').length > 0 && (
                                        <div>
                                            <h2 className="text-lg font-bold text-white mb-4">{t('common.history')}</h2>
                                            <div className="space-y-3">
                                                {requests.filter(r => r.status !== 'PENDING').map((request) => (
                                                    <div key={request.id} className="card p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <span className="text-white">{request.nameAr || request.name}</span>
                                                                <span className="text-dark-500 text-sm mr-2">
                                                                    - {request.seller?.fullNameAr || request.seller?.fullName}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-dark-400 text-sm">{request._count.purchases} {t('admin.services.purchasesCount')}</span>
                                                                <span className={`px-2 py-1 rounded-lg text-xs ${request.status === 'APPROVED'
                                                                    ? 'bg-green-500/10 text-green-400'
                                                                    : 'bg-red-500/10 text-red-400'
                                                                    }`}>
                                                                    {request.status === 'APPROVED' ? t('common.approved') : t('common.rejected')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Add/Edit Service Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {t(editingService ? 'admin.services.editService' : 'admin.services.addNewService')}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">{t('admin.services.form.nameEn')}</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">{t('admin.services.form.nameAr')}</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.nameAr}
                                        onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-dark-300 text-sm mb-2">{t('admin.services.form.descEn')}</label>
                                <textarea
                                    className="input min-h-[80px]"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-dark-300 text-sm mb-2">{t('admin.services.form.descAr')}</label>
                                <textarea
                                    className="input min-h-[80px]"
                                    value={formData.descriptionAr}
                                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">{t('admin.services.form.category')}</label>
                                    <select
                                        className="input"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {categories.map((cat) => (
                                            <option key={cat.value} value={cat.value}>{t(`services.categories.${cat.value.toLowerCase()}`)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-dark-300 text-sm mb-2">{t('admin.services.form.price')} ($)</label>
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
                                    <label className="text-dark-300 text-sm">💰 {t('admin.services.form.flexiblePrice')}</label>
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
                                            <label className="block text-dark-400 text-xs mb-1">{t('admin.services.form.minPrice')} ($)</label>
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
                                            <label className="block text-dark-400 text-xs mb-1">{t('admin.services.form.maxPrice')} ($)</label>
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

                            {/* Required Fields */}
                            <div className="bg-dark-800/50 rounded-xl p-4">
                                <label className="block text-dark-300 text-sm mb-3">📋 {t('admin.services.form.requiredInfo')}</label>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.requirePhone}
                                            onChange={(e) => setFormData({ ...formData, requirePhone: e.target.checked })}
                                            className="w-5 h-5 rounded accent-primary-500"
                                        />
                                        <span className="text-white">📱 {t('common.phone')}</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.requireEmail}
                                            onChange={(e) => setFormData({ ...formData, requireEmail: e.target.checked })}
                                            className="w-5 h-5 rounded accent-primary-500"
                                        />
                                        <span className="text-white">📧 {t('common.email')}</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.requireUsername}
                                            onChange={(e) => setFormData({ ...formData, requireUsername: e.target.checked })}
                                            className="w-5 h-5 rounded accent-primary-500"
                                        />
                                        <span className="text-white">👤 {t('services.username')}</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.requireNote}
                                            onChange={(e) => setFormData({ ...formData, requireNote: e.target.checked })}
                                            className="w-5 h-5 rounded accent-primary-500"
                                        />
                                        <span className="text-white">📝 {t('common.notes')}</span>
                                    </label>
                                    <div className="pt-2">
                                        <input
                                            type="text"
                                            className="input text-sm"
                                            value={formData.customFieldLabel}
                                            onChange={(e) => setFormData({ ...formData, customFieldLabel: e.target.value })}
                                            placeholder={t('admin.services.form.customField')}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-5 h-5 rounded"
                                />
                                <label htmlFor="isActive" className="text-white">{t('admin.services.form.isActive')}</label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" className="btn-primary flex-1">
                                    {t(editingService ? 'common.save' : 'admin.services.addServiceAction')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-ghost flex-1"
                                >
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Review Request Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="card p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold text-white mb-4">{t('admin.services.reviewService')}</h2>

                        <div className="bg-dark-800 rounded-xl overflow-hidden mb-6">
                            {/* Service Image */}
                            {selectedRequest.imageUrl && (
                                <div className="h-40 overflow-hidden">
                                    <img
                                        src={selectedRequest.imageUrl}
                                        alt={selectedRequest.nameAr || selectedRequest.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="p-4">
                                <h3 className="text-white font-semibold mb-2">{selectedRequest.nameAr || selectedRequest.name}</h3>
                                <p className="text-dark-400 text-sm mb-3">{selectedRequest.descriptionAr || selectedRequest.description}</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-dark-500">السعر:</span>
                                        <span className="text-primary-500 font-bold mr-1">{selectedRequest.price} $</span>
                                    </div>
                                    <div>
                                        <span className="text-dark-500">التصنيف:</span>
                                        <span className="text-white mr-1">{selectedRequest.categoryAr || selectedRequest.category}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-dark-500">البائع:</span>
                                        <span className="text-white mr-1">{selectedRequest.seller?.fullNameAr || selectedRequest.seller?.fullName}</span>
                                        <span className="text-dark-500 text-xs">({selectedRequest.seller?.phone})</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-dark-300 text-sm mb-2">{t('admin.services.rejectReason')}</label>
                            <input
                                type="text"
                                className="input"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder={t('admin.services.rejectReasonPlaceholder')}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => handleAction('approve')}
                                disabled={processing}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                {t('common.approve')}
                            </button>
                            <button
                                onClick={() => handleAction('reject')}
                                disabled={processing}
                                className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center gap-2"
                            >
                                <XCircleIcon className="w-5 h-5" />
                                {t('common.reject')}
                            </button>
                        </div>
                        <button
                            onClick={() => { setSelectedRequest(null); setRejectionReason(''); }}
                            className="btn-ghost w-full mt-3"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
