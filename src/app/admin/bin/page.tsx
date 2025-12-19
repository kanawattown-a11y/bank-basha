'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    TrashIcon,
    ArrowPathIcon,
    XMarkIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface DeletedItem {
    id: string;
    itemType: string;
    itemId: string;
    itemData: string;
    deletedBy: string;
    deletedAt: string;
    reason?: string;
}

export default function BinPage() {
    const t = useTranslations();
    const router = useRouter();
    const [items, setItems] = useState<DeletedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [mounted, setMounted] = useState(false);
    const [selectedItem, setSelectedItem] = useState<DeletedItem | null>(null);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchDeletedItems();
    }, [filter]);

    const fetchDeletedItems = async () => {
        try {
            setIsLoading(true);
            const url = filter === 'ALL'
                ? '/api/admin/bin'
                : `/api/admin/bin?type=${filter}`;

            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed to fetch');
            }
            const data = await response.json();
            setItems(data.deletedItems || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (item: DeletedItem) => {
        try {
            const response = await fetch('/api/admin/bin/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemType: item.itemType,
                    itemId: item.itemId,
                }),
            });

            if (response.ok) {
                alert(t('admin.bin.restoreSuccess'));
                fetchDeletedItems();
                setShowRestoreModal(false);
            } else {
                alert('Failed to restore');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error restoring item');
        }
    };

    const handlePermanentDelete = async (item: DeletedItem) => {
        try {
            const response = await fetch('/api/admin/bin/permanent', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemType: item.itemType,
                    itemId: item.itemId,
                }),
            });

            if (response.ok) {
                alert(t('admin.bin.deleteSuccess'));
                fetchDeletedItems();
                setShowDeleteModal(false);
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting item');
        }
    };

    const getItemName = (item: DeletedItem) => {
        try {
            const data = JSON.parse(item.itemData);
            return data.fullName || data.name || data.businessName || item.itemId;
        } catch {
            return item.itemId;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ar-SY', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };

    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 p-4 lg:p-8 lg:ms-64">
                <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
                    <div className="spinner w-12 h-12"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950 p-4 lg:p-8 lg:ms-64">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="btn-ghost btn-icon"
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {t('admin.bin.title')}
                        </h1>
                        <p className="text-dark-400">{t('admin.bin.subtitle')}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="card p-4 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {['ALL', 'USER', 'SERVICE', 'AGENT', 'MERCHANT'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg transition-colors ${filter === f
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                    }`}
                            >
                                {f === 'ALL' ? t('admin.bin.filter.all') : t(`admin.bin.types.${f}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Items List */}
                {items.length === 0 ? (
                    <div className="card p-12 text-center">
                        <TrashIcon className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                        <p className="text-xl text-dark-400">{t('admin.bin.empty')}</p>
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-dark-800">
                                    <tr>
                                        <th className="px-6 py-3 text-start text-xs font-medium text-dark-400 uppercase tracking-wider">
                                            {t('common.name')}
                                        </th>
                                        <th className="px-6 py-3 text-start text-xs font-medium text-dark-400 uppercase tracking-wider">
                                            {t('admin.bin.itemType')}
                                        </th>
                                        <th className="px-6 py-3 text-start text-xs font-medium text-dark-400 uppercase tracking-wider">
                                            {t('admin.bin.deletedAt')}
                                        </th>
                                        <th className="px-6 py-3 text-start text-xs font-medium text-dark-400 uppercase tracking-wider">
                                            {t('admin.bin.deletedBy')}
                                        </th>
                                        <th className="px-6 py-3 text-end text-xs font-medium text-dark-400 uppercase tracking-wider">
                                            {t('common.actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-700">
                                    {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-dark-800/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                                {getItemName(item)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="badge-info">
                                                    {t(`admin.bin.types.${item.itemType}`)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                                                {formatDate(item.deletedAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                                                {item.deletedBy}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-end text-sm">
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setShowRestoreModal(true);
                                                        }}
                                                        className="btn-icon bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                                    >
                                                        <ArrowPathIcon className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="btn-icon bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                                    >
                                                        <XMarkIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Restore Modal */}
                {showRestoreModal && selectedItem && (
                    <div className="modal-backdrop" onClick={() => setShowRestoreModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="text-xl font-semibold text-white">
                                    {t('admin.bin.restore')}
                                </h3>
                                <button onClick={() => setShowRestoreModal(false)}>
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="text-dark-300">{t('admin.bin.confirmRestore')}</p>
                                <p className="text-white font-medium mt-2">{getItemName(selectedItem)}</p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    onClick={() => setShowRestoreModal(false)}
                                    className="btn-secondary"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={() => handleRestore(selectedItem)}
                                    className="btn-primary"
                                >
                                    {t('admin.bin.restore')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Modal */}
                {showDeleteModal && selectedItem && (
                    <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="text-xl font-semibold text-white">
                                    {t('admin.bin.permanentDelete')}
                                </h3>
                                <button onClick={() => setShowDeleteModal(false)}>
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="text-red-400 font-semibold mb-2">
                                    {t('admin.bin.confirmPermanent')}
                                </p>
                                <p className="text-white font-medium">{getItemName(selectedItem)}</p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="btn-secondary"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={() => handlePermanentDelete(selectedItem)}
                                    className="btn-danger"
                                >
                                    {t('admin.bin.permanentDelete')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
