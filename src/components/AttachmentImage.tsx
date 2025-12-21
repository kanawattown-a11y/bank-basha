'use client';

import { useState, useEffect } from 'react';
import { PhotoIcon, ExclamationCircleIcon, DocumentIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface AttachmentImageProps {
    src: string;
    alt: string;
    className?: string;
    onClick?: () => void;
}

/**
 * Component to display attachments (images or PDFs) using pre-signed URLs
 * - For images: displays thumbnail with click to enlarge
 * - For PDFs: displays icon with click to open/download
 */
export default function AttachmentImage({
    src,
    alt,
    className = 'w-full h-20 sm:h-28 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity',
    onClick
}: AttachmentImageProps) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isPdf, setIsPdf] = useState(false);

    useEffect(() => {
        async function fetchSignedUrl() {
            if (!src) {
                setLoading(false);
                setError(true);
                return;
            }

            // Check if file is a PDF
            const isPdfFile = src.toLowerCase().includes('.pdf');
            setIsPdf(isPdfFile);

            // Check if URL is already a signed URL or a public URL
            if (src.includes('X-Amz-Signature') || !src.includes('.s3.')) {
                setSignedUrl(src);
                setLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/user/signed-urls', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls: [src] }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.signedUrls && data.signedUrls[src]) {
                        setSignedUrl(data.signedUrls[src]);
                    } else {
                        setError(true);
                    }
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error('Error fetching signed URL:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchSignedUrl();
    }, [src]);

    const handleClick = () => {
        if (signedUrl && onClick) {
            onClick();
        } else if (signedUrl) {
            window.open(signedUrl, '_blank');
        }
    };

    if (loading) {
        return (
            <div className={`${className} bg-dark-700 flex items-center justify-center`}>
                <div className="spinner w-6 h-6"></div>
            </div>
        );
    }

    if (error || !signedUrl) {
        return (
            <div className={`${className} bg-dark-700 flex items-center justify-center`}>
                <div className="text-center">
                    <ExclamationCircleIcon className="w-6 h-6 text-dark-500 mx-auto" />
                    <p className="text-dark-500 text-[10px] mt-1">خطأ</p>
                </div>
            </div>
        );
    }

    // Render PDF viewer
    if (isPdf) {
        return (
            <div
                className={`${className} bg-dark-800 flex flex-col items-center justify-center cursor-pointer hover:bg-dark-700 transition-colors border border-dark-600 rounded-lg`}
                onClick={handleClick}
            >
                <DocumentIcon className="w-10 h-10 text-red-500 mb-2" />
                <p className="text-dark-300 text-xs font-medium">ملف PDF</p>
                <div className="flex items-center gap-1 mt-1 text-primary-500 text-xs">
                    <ArrowDownTrayIcon className="w-3 h-3" />
                    <span>اضغط للعرض</span>
                </div>
            </div>
        );
    }

    // Render image
    return (
        <img
            src={signedUrl}
            alt={alt}
            className={className}
            onClick={handleClick}
            onError={() => setError(true)}
        />
    );
}
