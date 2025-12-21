'use client';

import { useState, useEffect } from 'react';
import { PhotoIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface AttachmentImageProps {
    src: string;
    alt: string;
    className?: string;
    onClick?: () => void;
}

/**
 * Component to display support ticket attachments using pre-signed URLs
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

    useEffect(() => {
        async function fetchSignedUrl() {
            if (!src) {
                setLoading(false);
                setError(true);
                return;
            }

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
