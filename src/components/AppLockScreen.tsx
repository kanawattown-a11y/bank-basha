'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LockClosedIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface AppLockScreenProps {
    onUnlock: () => void;
}

export default function AppLockScreen({ onUnlock }: AppLockScreenProps) {
    const router = useRouter();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    const MAX_ATTEMPTS = 3;

    // Handle PIN input
    const handlePinChange = (value: string) => {
        const numericValue = value.replace(/\D/g, '').slice(0, 6);
        setPin(numericValue);
        setError('');

        // Auto-verify when 6 digits entered
        if (numericValue.length === 6) {
            verifyPin(numericValue);
        }
    };

    const verifyPin = async (pinValue: string) => {
        setIsVerifying(true);
        setError('');

        try {
            const res = await fetch('/api/user/app-lock', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pinValue }),
            });

            if (res.ok) {
                // Success - unlock the app
                onUnlock();
            } else {
                // Wrong PIN
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);
                setPin('');

                if (newAttempts >= MAX_ATTEMPTS) {
                    // Lock out user - force logout
                    setIsLocked(true);
                    setTimeout(async () => {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        router.push('/login');
                    }, 2000);
                } else {
                    setError(`رمز خاطئ! (${MAX_ATTEMPTS - newAttempts} محاولات متبقية)`);
                }
            }
        } catch (err) {
            setError('خطأ في الاتصال');
            setPin('');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    // Pin pad buttons
    const pinButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

    const handlePinButton = (value: string) => {
        if (isVerifying || isLocked) return;

        if (value === 'del') {
            setPin(prev => prev.slice(0, -1));
            setError('');
        } else if (value && pin.length < 6) {
            const newPin = pin + value;
            setPin(newPin);
            setError('');
            if (newPin.length === 6) {
                verifyPin(newPin);
            }
        }
    };

    if (isLocked) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <LockClosedIcon className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">تم قفل الحساب</h1>
                    <p className="text-dark-400 text-sm mb-4">
                        تجاوزت عدد المحاولات المسموحة
                    </p>
                    <p className="text-red-400 text-sm">
                        جاري تسجيل الخروج...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center px-4 safe-top safe-bottom">
            {/* Logo / Icon */}
            <div className="mb-8">
                <div className="w-20 h-20 rounded-2xl bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                    <LockClosedIcon className="w-10 h-10 text-primary-500" />
                </div>
                <h1 className="text-xl font-bold text-white text-center">أدخل رمز الفتح</h1>
                <p className="text-dark-400 text-sm text-center mt-1">
                    رمز من 6 أرقام
                </p>
            </div>

            {/* PIN Dots */}
            <div className="flex gap-3 mb-6">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className={`w-4 h-4 rounded-full transition-colors ${i < pin.length
                                ? 'bg-primary-500'
                                : 'bg-dark-700 border border-dark-600'
                            }`}
                    />
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
            )}

            {/* Verifying Indicator */}
            {isVerifying && (
                <div className="mb-4">
                    <div className="spinner w-6 h-6"></div>
                </div>
            )}

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-3 max-w-xs w-full">
                {pinButtons.map((btn, idx) => (
                    <button
                        key={idx}
                        onClick={() => handlePinButton(btn)}
                        disabled={isVerifying || !btn}
                        className={`h-16 rounded-xl text-2xl font-medium transition-colors ${!btn
                                ? 'bg-transparent'
                                : btn === 'del'
                                    ? 'bg-dark-800 text-dark-400 hover:bg-dark-700 text-lg'
                                    : 'bg-dark-800 text-white hover:bg-dark-700 active:bg-primary-500 active:text-dark-900'
                            } disabled:opacity-50`}
                    >
                        {btn === 'del' ? '⌫' : btn}
                    </button>
                ))}
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="mt-8 flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
            >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="text-sm">تسجيل خروج</span>
            </button>
        </div>
    );
}
