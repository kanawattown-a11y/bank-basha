'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { CameraIcon, XMarkIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface CameraCaptureProps {
    label: string;
    onCapture: (file: File | null) => void;
    error?: string;
}

export default function CameraCapture({
    label,
    onCapture,
    error,
}: CameraCaptureProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isLoading, setIsLoading] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Cleanup function to stop all camera tracks
    const stopAllTracks = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraReady(false);
    }, []);

    // Request camera permissions first, then start stream
    const startCamera = useCallback(async (mode: 'user' | 'environment') => {
        setCameraError(null);
        setIsLoading(true);
        setIsCameraReady(false);

        // First, stop any existing stream to prevent "Failed to allocate videosource"
        stopAllTracks();

        // Small delay to ensure previous stream is fully released
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Check if we're on HTTPS or localhost (required for camera)
            if (typeof window !== 'undefined' &&
                window.location.protocol !== 'https:' &&
                !window.location.hostname.includes('localhost') &&
                window.location.hostname !== '127.0.0.1') {
                throw new Error('الكاميرا تتطلب اتصال آمن (HTTPS). الموقع الحالي غير آمن.');
            }

            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('الكاميرا غير مدعومة في هذا المتصفح. جرب استخدام Chrome أو Safari.');
            }

            // Check permission status if API is available
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
                    if (permissionStatus.state === 'denied') {
                        throw new Error('تم رفض إذن الكاميرا سابقاً. يرجى إعادة تعيين الصلاحيات من إعدادات المتصفح ثم إعادة تحميل الصفحة.');
                    }
                } catch (e) {
                    // Permission API not available, continue anyway
                    console.log('Permission API not available');
                }
            }

            // Try to get camera with the requested facing mode
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: mode,
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 }
                },
                audio: false
            };

            let mediaStream: MediaStream;

            try {
                mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
                // If specific facing mode fails, try with just video: true
                console.log('Specific constraints failed, trying basic video...');
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }

            streamRef.current = mediaStream;

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;

                // Wait for video to be ready
                await new Promise<void>((resolve, reject) => {
                    if (!videoRef.current) {
                        reject(new Error('Video element not found'));
                        return;
                    }

                    const video = videoRef.current;

                    const handleCanPlay = () => {
                        video.removeEventListener('canplay', handleCanPlay);
                        video.removeEventListener('error', handleError);
                        resolve();
                    };

                    const handleError = (e: Event) => {
                        video.removeEventListener('canplay', handleCanPlay);
                        video.removeEventListener('error', handleError);
                        reject(new Error('Video playback error'));
                    };

                    video.addEventListener('canplay', handleCanPlay);
                    video.addEventListener('error', handleError);

                    // Timeout after 5 seconds
                    setTimeout(() => {
                        video.removeEventListener('canplay', handleCanPlay);
                        video.removeEventListener('error', handleError);
                        resolve(); // Resolve anyway as video might still work
                    }, 5000);
                });

                setIsCameraReady(true);
            }
        } catch (err: any) {
            console.error('Camera error:', err);

            let errorMessage = 'لا يمكن الوصول للكاميرا';

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = 'تم رفض إذن الكاميرا. يرجى السماح بالوصول للكاميرا من إعدادات المتصفح.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage = 'لم يتم العثور على كاميرا في هذا الجهاز.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage = 'الكاميرا قيد الاستخدام من تطبيق آخر. أغلق أي تطبيقات أخرى تستخدم الكاميرا.';
            } else if (err.name === 'OverconstrainedError') {
                errorMessage = 'إعدادات الكاميرا غير مدعومة.';
            } else if (err.message) {
                errorMessage = err.message;
            }

            setCameraError(errorMessage);
            stopAllTracks();
        } finally {
            setIsLoading(false);
        }
    }, [stopAllTracks]);

    const openCamera = async () => {
        setIsOpen(true);
        setCapturedImage(null);
        setCameraError(null);
        await startCamera(facingMode);
    };

    const closeCamera = () => {
        stopAllTracks();
        setIsOpen(false);
        setCameraError(null);
    };

    const switchCamera = async () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newMode);
        await startCamera(newMode);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAllTracks();
        };
    }, [stopAllTracks]);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // Draw the video frame to canvas (mirror for selfie)
        if (facingMode === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Stop camera immediately after capture
        stopAllTracks();

        // Convert to blob and create file
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
                const imageUrl = URL.createObjectURL(blob);
                setCapturedImage(imageUrl);
                onCapture(file);
            }
        }, 'image/jpeg', 0.85);
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        onCapture(null);
        startCamera(facingMode);
    };

    const removePhoto = () => {
        setCapturedImage(null);
        onCapture(null);
        setIsOpen(false);
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-300">{label}</label>

            {!capturedImage && !isOpen ? (
                <button
                    type="button"
                    onClick={openCamera}
                    className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all ${error
                        ? 'border-red-500 bg-red-500/5'
                        : 'border-dark-700 hover:border-primary-500 bg-dark-800/50'
                        }`}
                >
                    <CameraIcon className={`w-12 h-12 mx-auto mb-3 ${error ? 'text-red-500' : 'text-dark-400'}`} />
                    <p className="text-dark-300 mb-1">اضغط لفتح الكاميرا</p>
                    <p className="text-dark-500 text-xs">التقط صورة سيلفي واضحة</p>
                </button>
            ) : isOpen && !capturedImage ? (
                <div className="relative rounded-xl overflow-hidden bg-dark-900">
                    {cameraError ? (
                        <div className="p-8 text-center">
                            <CameraIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <p className="text-red-400 mb-4 text-sm">{cameraError}</p>
                            <div className="flex gap-2 justify-center">
                                <button
                                    type="button"
                                    onClick={() => startCamera(facingMode)}
                                    className="btn-primary text-sm"
                                >
                                    إعادة المحاولة
                                </button>
                                <button
                                    type="button"
                                    onClick={closeCamera}
                                    className="btn-ghost text-sm"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="p-8 text-center">
                            <div className="spinner w-12 h-12 mx-auto mb-4"></div>
                            <p className="text-dark-400">جاري تشغيل الكاميرا...</p>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-64 sm:h-80 object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Camera Controls */}
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={closeCamera}
                                    className="w-12 h-12 rounded-full bg-dark-800/80 text-white flex items-center justify-center active:bg-dark-700"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    disabled={!isCameraReady}
                                    className={`w-16 h-16 rounded-full bg-white border-4 border-primary-500 flex items-center justify-center ${!isCameraReady ? 'opacity-50' : 'active:scale-95'}`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-primary-500" />
                                </button>
                                <button
                                    type="button"
                                    onClick={switchCamera}
                                    className="w-12 h-12 rounded-full bg-dark-800/80 text-white flex items-center justify-center active:bg-dark-700"
                                >
                                    <ArrowPathIcon className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Selfie Guide */}
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-dark-900/80 px-4 py-2 rounded-full">
                                <p className="text-white text-sm">ضع وجهك في المنتصف</p>
                            </div>
                        </>
                    )}
                </div>
            ) : capturedImage ? (
                <div className="relative">
                    <img
                        src={capturedImage}
                        alt={label}
                        className="w-full h-48 sm:h-64 object-cover rounded-xl border-2 border-dark-700"
                    />
                    {/* Always visible controls on mobile */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={retakePhoto}
                            className="bg-primary-500/90 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"
                        >
                            <CameraIcon className="w-4 h-4" />
                            إعادة
                        </button>
                        <button
                            type="button"
                            onClick={removePhoto}
                            className="bg-red-500/90 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"
                        >
                            <XMarkIcon className="w-4 h-4" />
                            حذف
                        </button>
                    </div>
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                        <CheckCircleIcon className="w-5 h-5" />
                    </div>
                </div>
            ) : null}

            {error && (
                <p className="text-red-500 text-sm">{error}</p>
            )}
        </div>
    );
}
