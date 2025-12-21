'use client';

import { useState, useEffect } from 'react';
import { PhotoIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface SecureImageProps {
    src: string | null | undefined;
    alt: string;
    className?: string;
    fallbackClassName?: string;
}

/**
 * Component to display private S3 images using pre-signed URLs
 * Used for KYC documents and other sensitive images
 */
export default function SecureImage({
    src,
    alt,
    className = 'w-full h-48 object-cover rounded-xl',
    fallbackClassName = 'w-full h-48 bg-dark-800 rounded-xl flex items-center justify-center'
}: SecureImageProps) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchSignedUrl() {
            if (!src) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/admin/signed-urls', {
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

    if (!src) {
        return (
            <div className={fallbackClassName}>
                <PhotoIcon className="w-12 h-12 text-dark-600" />
            </div>
        );
    }

    if (loading) {
        return (
            <div className={fallbackClassName}>
                <div className="spinner w-8 h-8"></div>
            </div>
        );
    }

    if (error || !signedUrl) {
        return (
            <div className={fallbackClassName}>
                <div className="text-center">
                    <ExclamationCircleIcon className="w-10 h-10 text-red-500 mx-auto mb-2" />
                    <p className="text-dark-400 text-sm">فشل تحميل الصورة</p>
                </div>
            </div>
        );
    }

    return (
        <img
            src={signedUrl}
            alt={alt}
            className={className}
            onError={() => setError(true)}
        />
    );
}
