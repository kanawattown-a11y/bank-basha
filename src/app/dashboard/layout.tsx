'use client';

import AppLockProvider from '@/components/AppLockProvider';

export default function DashboardLayout({
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
