'use client';

import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface ImageLightboxProps {
    images: { src: string; alt: string }[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Full-screen image lightbox component for viewing images in full size
 */
export default function ImageLightbox({
    images,
    initialIndex = 0,
    isOpen,
    onClose,
}: ImageLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    // Fetch signed URLs for all images
    useEffect(() => {
        async function fetchSignedUrls() {
            if (!isOpen || images.length === 0) return;
            setLoading(true);

            const urlsToSign = images
                .map(img => img.src)
                .filter(src => src && src.includes('.s3.') && !src.includes('X-Amz-Signature'));

            if (urlsToSign.length === 0) {
                // All URLs are already signed or public
                const directUrls: { [key: string]: string } = {};
                images.forEach(img => {
                    if (img.src) directUrls[img.src] = img.src;
                });
                setSignedUrls(directUrls);
                setLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/user/signed-urls', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls: urlsToSign }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const allUrls: { [key: string]: string } = {};

                    images.forEach(img => {
                        if (img.src) {
                            allUrls[img.src] = data.signedUrls?.[img.src] || img.src;
                        }
                    });

                    setSignedUrls(allUrls);
                }
            } catch (error) {
                console.error('Error fetching signed URLs:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchSignedUrls();
    }, [isOpen, images]);

    const goToPrevious = useCallback(() => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    }, [images.length]);

    const goToNext = useCallback(() => {
        setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    }, [images.length]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, goToPrevious, goToNext]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const currentImage = images[currentIndex];
    const currentSrc = currentImage?.src ? signedUrls[currentImage.src] || currentImage.src : '';

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-dark-800/80 text-white flex items-center justify-center hover:bg-dark-700 transition-colors"
            >
                <XMarkIcon className="w-6 h-6" />
            </button>

            {/* Navigation arrows */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-dark-800/80 text-white flex items-center justify-center hover:bg-dark-700 transition-colors"
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); goToNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-dark-800/80 text-white flex items-center justify-center hover:bg-dark-700 transition-colors"
                    >
                        <ArrowRightIcon className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* Image */}
            <div
                className="max-w-[95vw] max-h-[90vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                {loading ? (
                    <div className="spinner w-12 h-12"></div>
                ) : (
                    <img
                        src={currentSrc}
                        alt={currentImage?.alt || 'Image'}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                    />
                )}
            </div>

            {/* Image counter */}
            {images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-dark-800/80 px-4 py-2 rounded-full text-white text-sm">
                    {currentIndex + 1} / {images.length}
                </div>
            )}

            {/* Caption */}
            {currentImage?.alt && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-dark-800/80 px-4 py-2 rounded-lg text-white text-sm max-w-md text-center">
                    {currentImage.alt}
                </div>
            )}
        </div>
    );
}
