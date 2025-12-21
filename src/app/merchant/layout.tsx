'use client';

import AppLockProvider from '@/components/AppLockProvider';

export default function MerchantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AppLockProvider>
            {children}
        </AppLockProvider>
    );
}
