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
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = useCallback(async () => {
        setCameraError(null);
        try {
            // Stop any existing stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Camera error:', err);
            setCameraError('لا يمكن الوصول للكاميرا. تأكد من إعطاء الصلاحيات.');
        }
    }, [facingMode, stream]);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    const openCamera = async () => {
        setIsOpen(true);
        setCapturedImage(null);
        await startCamera();
    };

    const closeCamera = () => {
        stopCamera();
        setIsOpen(false);
        setCameraError(null);
    };

    const switchCamera = async () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    useEffect(() => {
        if (isOpen && !capturedImage) {
            startCamera();
        }
    }, [facingMode, isOpen, capturedImage, startCamera]);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the video frame to canvas (mirror for selfie)
        if (facingMode === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob and create file
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
                const imageUrl = URL.createObjectURL(blob);
                setCapturedImage(imageUrl);
                onCapture(file);
                stopCamera();
            }
        }, 'image/jpeg', 0.9);
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        onCapture(null);
        startCamera();
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
                            <p className="text-red-400 mb-4">{cameraError}</p>
                            <button
                                type="button"
                                onClick={startCamera}
                                className="btn-primary"
                            >
                                إعادة المحاولة
                            </button>
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
                                    className="w-12 h-12 rounded-full bg-dark-800/80 text-white flex items-center justify-center"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    className="w-16 h-16 rounded-full bg-white border-4 border-primary-500 flex items-center justify-center"
                                >
                                    <div className="w-12 h-12 rounded-full bg-primary-500" />
                                </button>
                                <button
                                    type="button"
                                    onClick={switchCamera}
                                    className="w-12 h-12 rounded-full bg-dark-800/80 text-white flex items-center justify-center"
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
                <div className="relative group">
                    <img
                        src={capturedImage}
                        alt={label}
                        className="w-full h-48 sm:h-64 object-cover rounded-xl border-2 border-dark-700"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={retakePhoto}
                            className="btn-ghost bg-primary-500/20 text-primary-500 px-4 py-2"
                        >
                            <CameraIcon className="w-5 h-5 inline ml-2" />
                            إعادة الالتقاط
                        </button>
                        <button
                            type="button"
                            onClick={removePhoto}
                            className="btn-ghost bg-red-500/20 text-red-500 px-4 py-2"
                        >
                            <XMarkIcon className="w-5 h-5 inline ml-2" />
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
