'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AppLockScreen from './AppLockScreen';

interface AppLockContextType {
    isLocked: boolean;
    hasAppLock: boolean;
    lockApp: () => void;
    unlockApp: () => void;
}

const AppLockContext = createContext<AppLockContextType>({
    isLocked: false,
    hasAppLock: false,
    lockApp: () => { },
    unlockApp: () => { },
});

export const useAppLock = () => useContext(AppLockContext);

interface AppLockProviderProps {
    children: ReactNode;
}

export default function AppLockProvider({ children }: AppLockProviderProps) {
    const [isLocked, setIsLocked] = useState(true); // Start locked
    const [hasAppLock, setHasAppLock] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        checkAppLockStatus();

        // Lock app when returning from background (visibility change)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && hasAppLock) {
                // Only lock if was hidden for more than 30 seconds
                const lastActive = sessionStorage.getItem('lastActive');
                if (lastActive) {
                    const elapsed = Date.now() - parseInt(lastActive);
                    if (elapsed > 30000) { // 30 seconds
                        setIsLocked(true);
                    }
                }
            } else if (document.visibilityState === 'hidden') {
                sessionStorage.setItem('lastActive', Date.now().toString());
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [hasAppLock]);

    const checkAppLockStatus = async () => {
        try {
            const res = await fetch('/api/user/app-lock');
            if (res.ok) {
                const data = await res.json();
                setHasAppLock(data.hasAppLock);

                // If no app lock set, unlock immediately
                if (!data.hasAppLock) {
                    setIsLocked(false);
                } else {
                    // Check if we have a valid session lock state
                    const unlocked = sessionStorage.getItem('appUnlocked');
                    const lastActive = sessionStorage.getItem('lastActive');

                    if (unlocked === 'true' && lastActive) {
                        const elapsed = Date.now() - parseInt(lastActive);
                        // If was active within last 30 seconds, stay unlocked
                        if (elapsed <= 30000) {
                            setIsLocked(false);
                        }
                    }
                }
            } else if (res.status === 401) {
                // Not logged in, no need to lock
                setIsLocked(false);
                setHasAppLock(false);
            }
        } catch (error) {
            console.error('Error checking app lock:', error);
            setIsLocked(false);
        } finally {
            setIsChecking(false);
        }
    };

    const lockApp = () => {
        if (hasAppLock) {
            setIsLocked(true);
            sessionStorage.removeItem('appUnlocked');
        }
    };

    const unlockApp = () => {
        setIsLocked(false);
        sessionStorage.setItem('appUnlocked', 'true');
        sessionStorage.setItem('lastActive', Date.now().toString());
    };

    // Show loading while checking
    if (isChecking) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    // Show lock screen if locked
    if (isLocked && hasAppLock) {
        return <AppLockScreen onUnlock={unlockApp} />;
    }

    return (
        <AppLockContext.Provider value={{ isLocked, hasAppLock, lockApp, unlockApp }}>
            {children}
        </AppLockContext.Provider>
    );
}
