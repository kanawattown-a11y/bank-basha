import { useEffect, useRef, useState } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, ShareIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import html2canvas from 'html2canvas';

interface TransactionDetails {
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    fee?: number;
    netAmount?: number;
    platformFee?: number;
    agentFee?: number;
    status: string;
    createdAt: string;
    // Parties
    senderName?: string;
    senderPhone?: string;
    receiverName?: string;
    receiverPhone?: string;
    agentName?: string;
    customerName?: string; // For agent view
    businessName?: string; // For merchant view
    // Metadata
    description?: string;
    note?: string;
}

interface TransactionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: TransactionDetails | null;
    userType: 'USER' | 'AGENT' | 'MERCHANT' | 'ADMIN';
}

export default function TransactionDetailsModal({
    isOpen,
    onClose,
    transaction,
    userType
}: TransactionDetailsModalProps) {
    const t = useTranslations();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !transaction) return null;

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            dateStyle: 'full',
            timeStyle: 'medium',
        }).format(new Date(dateString));
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'text-green-500 bg-green-500/10';
            case 'PENDING': return 'text-yellow-500 bg-yellow-500/10';
            case 'FAILED': return 'text-red-500 bg-red-500/10';
            case 'REJECTED': return 'text-red-500 bg-red-500/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

    // Helper to get transaction title based on type
    const getTransactionTitle = (type: string) => {
        // Fallback or specific mapping if localization keys don't match exactly
        return t(`transaction.types.${type.toLowerCase()}`) || type;
    };

    const handleDownload = async () => {
        if (!receiptRef.current) return;
        setIsDownloading(true);

        try {
            const isRtl = document.dir === 'rtl' || document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';
            const isAndroidApp = navigator.userAgent.includes('BankBashaApp');

            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#1E1E1E', // Match dark theme background
                scale: 4, // Maximum quality (Retina/4K ready)
                logging: false,
                useCORS: true,
                allowTaint: true,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.querySelector('[data-receipt-container]') as HTMLElement;
                    if (clonedElement) {
                        // Critical fixes for accurate text rendering
                        clonedElement.style.direction = isRtl ? 'rtl' : 'ltr';
                        clonedElement.style.fontFamily = 'inherit';
                        clonedElement.style.letterSpacing = 'normal'; // Fixes disjointed Arabic letters
                        clonedElement.style.fontFeatureSettings = '"liga" 1, "calt" 1'; // Force ligatures
                        clonedElement.style.textRendering = 'geometricPrecision'; // Sharper text

                        // Ensure all child text elements inherit these properties
                        const allElements = clonedElement.querySelectorAll('*');
                        allElements.forEach((el) => {
                            if (el instanceof HTMLElement) {
                                el.style.letterSpacing = 'normal';
                            }
                        });
                    }
                }
            });

            // Get image as base64
            const imageData = canvas.toDataURL('image/png', 1.0);
            const filename = `receipt-${transaction.referenceNumber}.png`;

            // For Android App: Use server API to trigger native download (same as PDF)
            if (isAndroidApp) {
                try {
                    // Send to server and get download URL
                    const response = await fetch('/api/download-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageData, filename }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // Navigate to download URL - triggers native DownloadManager
                        window.location.href = data.downloadUrl;
                    } else {
                        throw new Error('Download failed');
                    }
                } catch (err) {
                    // Final fallback: try direct anchor click
                    const link = document.createElement('a');
                    link.href = imageData;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            } else {
                // For Web Browser: Standard download
                const link = document.createElement('a');
                link.href = imageData;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Receipt download failed:', error);
            alert(t('transaction.receipt.error'));
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="flex min-h-full items-center justify-center p-4 text-center">
                <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-dark-900 border border-dark-700 p-6 text-left shadow-xl transition-all animate-scale-in">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium leading-6 text-white">
                            {t('common.details')}
                        </h3>
                        <button onClick={onClose} className="text-dark-400 hover:text-white transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Receipt Content Wrapper for Capture */}
                    <div className="overflow-hidden rounded-xl border border-dark-700">
                        <div ref={receiptRef} data-receipt-container className="bg-dark-900 p-6 relative">
                            {/* Watermark/Background Decoration */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
                                <img
                                    src="/logo.png"
                                    alt=""
                                    className="w-[80%] max-w-[300px] object-contain"
                                    crossOrigin="anonymous"
                                />
                            </div>

                            {/* Receipt Header */}
                            <div className="relative text-center mb-6 pt-2">
                                <div className="w-16 h-16 mx-auto mb-3 bg-dark-800 rounded-xl p-2 flex items-center justify-center border border-dark-700">
                                    <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-1">Bank Basha</h2>
                                <p className="text-dark-400 text-xs uppercase tracking-wider">{t('common.appName')}</p>
                            </div>

                            {/* Status & Amount */}
                            <div className="relative text-center mb-8 border-b border-dark-700/50 pb-8">
                                <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold mb-4 ${getStatusColor(transaction.status)}`}>
                                    {t(`transaction.status.${transaction.status.toLowerCase()}`)}
                                </div>
                                <div className="text-5xl font-bold text-white mb-2 tracking-tight">
                                    {formatAmount(transaction.amount)} <span className="text-2xl text-primary-500">$</span>
                                </div>
                                <div className="text-dark-300 font-medium">
                                    {getTransactionTitle(transaction.type)}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="relative space-y-4">
                                {/* Reference */}
                                <div className="flex justify-between items-center gap-4 py-1">
                                    <span className="text-dark-400 text-sm font-medium whitespace-nowrap">{t('transaction.reference')}</span>
                                    <span className="text-white font-mono text-sm bg-dark-800 px-2 py-1 rounded truncate max-w-[200px] text-center" dir="ltr">{transaction.referenceNumber}</span>
                                </div>

                                {/* Date */}
                                <div className="flex justify-between items-center gap-4 py-1">
                                    <span className="text-dark-400 text-sm font-medium whitespace-nowrap">{t('common.date')}</span>
                                    <span className="text-white text-sm text-end">{formatDate(transaction.createdAt)}</span>
                                </div>

                                <div className="my-4 border-b border-dark-700/50" />

                                {/* Parties */}
                                {transaction.customerName && (
                                    <div className="flex justify-between items-center gap-4 py-1">
                                        <span className="text-dark-400 text-sm font-medium whitespace-nowrap">{t('common.customer')}</span>
                                        <span className="text-white text-sm font-semibold text-end">{transaction.customerName}</span>
                                    </div>
                                )}
                                {transaction.senderName && (
                                    <div className="flex justify-between items-center gap-4 py-1">
                                        <span className="text-dark-400 text-sm font-medium whitespace-nowrap">{t('transaction.sender')}</span>
                                        <span className="text-white text-sm font-semibold text-end">{transaction.senderName}</span>
                                    </div>
                                )}
                                {transaction.receiverName && (
                                    <div className="flex justify-between items-center gap-4 py-1">
                                        <span className="text-dark-400 text-sm font-medium whitespace-nowrap">{t('transaction.receiver')}</span>
                                        <span className="text-white text-sm font-semibold text-end">{transaction.receiverName}</span>
                                    </div>
                                )}

                                {/* Financials */}
                                {transaction.fee !== undefined && transaction.fee > 0 && (
                                    <div className="flex justify-between items-center gap-4 py-1">
                                        <span className="text-dark-400 text-sm font-medium whitespace-nowrap">{t('transaction.fee')}</span>
                                        <span className="text-red-400 text-sm">-{formatAmount(transaction.fee)} $</span>
                                    </div>
                                )}

                                {userType === 'AGENT' && transaction.agentFee !== undefined && transaction.agentFee > 0 && (
                                    <>
                                        <div className="my-2 border-b border-dark-700/50" />
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-dark-400 text-sm font-medium">{t('agent.settlement.commission')}</span>
                                            <span className="text-green-500 text-sm font-bold">+{formatAmount(transaction.agentFee)} $</span>
                                        </div>
                                    </>
                                )}

                                {/* Notes */}
                                {(transaction.description || transaction.note) && (
                                    <div className="mt-4 pt-4 border-t border-dark-700/50">
                                        <p className="text-dark-400 text-xs mb-2 font-medium uppercase tracking-wider">{t('common.notes')}</p>
                                        <div className="bg-dark-800 p-3 rounded-lg text-sm text-white/90 leading-relaxed">
                                            {transaction.description || transaction.note}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="relative mt-8 pt-6 border-t-2 border-dashed border-dark-700 text-center">
                                <p className="text-dark-500 text-xs">{t('transaction.receipt.generatedBy')}</p>
                                <p className="text-dark-600 text-[10px] mt-1">{new Date().toLocaleString(new Intl.DateTimeFormat().resolvedOptions().locale)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 grid grid-cols-2 gap-3">
                        <button
                            className="btn-secondary flex items-center justify-center gap-2"
                            onClick={handleDownload}
                            disabled={isDownloading}
                        >
                            {isDownloading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <ArrowDownTrayIcon className="w-5 h-5" />
                            )}
                            <span>{isDownloading ? t('common.loading') : t('common.download')}</span>
                        </button>
                        <button
                            className="btn-primary flex items-center justify-center gap-2"
                            onClick={async () => {
                                const shareData = {
                                    title: t('transaction.receipt.title'),
                                    text: `${t('transaction.receipt.title')}\n\n` +
                                        `${t('transaction.reference')}: ${transaction.referenceNumber}\n` +
                                        `${t('common.amount')}: ${formatAmount(transaction.amount)} $\n` +
                                        `${t('common.date')}: ${formatDate(transaction.createdAt)}\n` +
                                        `${t('transaction.status')}: ${t('transaction.status.' + transaction.status.toLowerCase())}`
                                };

                                if (navigator.share) {
                                    try {
                                        await navigator.share(shareData);
                                    } catch (error) {
                                        console.error('Error sharing:', error);
                                    }
                                } else {
                                    try {
                                        await navigator.clipboard.writeText(shareData.text);
                                        setIsCopied(true);
                                        setTimeout(() => setIsCopied(false), 2000);
                                    } catch (err) {
                                        console.error('Failed to copy keys', err);
                                    }
                                }
                            }}
                        >
                            {isCopied ? (
                                <ClipboardDocumentCheckIcon className="w-5 h-5" />
                            ) : (
                                <ShareIcon className="w-5 h-5" />
                            )}
                            <span>{isCopied ? t('common.copied') : t('common.share')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
}
