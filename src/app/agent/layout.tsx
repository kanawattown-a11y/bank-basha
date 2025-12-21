'use client';

import AppLockProvider from '@/components/AppLockProvider';

export default function AgentLayout({
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
