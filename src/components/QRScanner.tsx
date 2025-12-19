'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';

interface QRScannerProps {
    onScan: (result: string) => void;
    onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        const scannerId = 'qr-scanner-container';

        const initScanner = async () => {
            try {
                setIsInitializing(true);
                setError(null);

                // Create scanner instance
                const html5QrCode = new Html5Qrcode(scannerId);
                scannerRef.current = html5QrCode;

                // Get cameras
                const cameras = await Html5Qrcode.getCameras();
                if (cameras.length === 0) {
                    setError('لم يتم العثور على كاميرا');
                    setIsInitializing(false);
                    return;
                }

                // Use back camera if available, otherwise use first camera
                const cameraId = cameras.find(c =>
                    c.label.toLowerCase().includes('back') ||
                    c.label.toLowerCase().includes('rear')
                )?.id || cameras[0].id;

                // Start scanning
                await html5QrCode.start(
                    cameraId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1,
                    },
                    (decodedText) => {
                        // QR code detected
                        console.log('QR Code scanned:', decodedText);

                        // Stop scanner
                        if (scannerRef.current?.getState() === Html5QrcodeScannerState.SCANNING) {
                            scannerRef.current.stop().catch(console.error);
                        }

                        // Callback with result
                        onScan(decodedText);
                    },
                    () => {
                        // QR code not detected (ignore)
                    }
                );

                setIsInitializing(false);
            } catch (err) {
                console.error('Scanner init error:', err);
                if (err instanceof Error) {
                    if (err.message.includes('Permission')) {
                        setError('الرجاء السماح بالوصول للكاميرا');
                    } else {
                        setError('فشل تشغيل الكاميرا');
                    }
                } else {
                    setError('خطأ غير متوقع');
                }
                setIsInitializing(false);
            }
        };

        initScanner();

        // Cleanup
        return () => {
            if (scannerRef.current) {
                const state = scannerRef.current.getState();
                if (state === Html5QrcodeScannerState.SCANNING) {
                    scannerRef.current.stop().catch(console.error);
                }
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-50 bg-black">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">📷 مسح رمز QR</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                    >
                        <XMarkIcon className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>

            {/* Scanner Container */}
            <div className="h-full flex items-center justify-center p-4">
                <div className="relative w-full max-w-md">
                    {/* Scanner Element */}
                    <div
                        id="qr-scanner-container"
                        className="w-full aspect-square rounded-2xl overflow-hidden bg-dark-900"
                    />

                    {/* Overlay */}
                    {isInitializing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-dark-900 rounded-2xl">
                            <div className="text-center">
                                <CameraIcon className="w-16 h-16 text-primary-500 mx-auto mb-4 animate-pulse" />
                                <p className="text-white">جاري تشغيل الكاميرا...</p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-dark-900 rounded-2xl">
                            <div className="text-center p-4">
                                <p className="text-red-400 mb-4">{error}</p>
                                <button
                                    onClick={onClose}
                                    className="btn-primary"
                                >
                                    العودة
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Scanning Frame */}
                    {!isInitializing && !error && (
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-64 h-64 border-2 border-primary-500 rounded-2xl">
                                    {/* Corner decorations */}
                                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
                                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
                                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-center">
                    وجّه الكاميرا نحو رمز QR الخاص بالتاجر
                </p>
            </div>
        </div>
    );
}
