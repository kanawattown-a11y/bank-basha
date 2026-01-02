import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

export const metadata: Metadata = {
    title: {
        default: 'بنك باشا - Bank Basha',
        template: '%s | بنك باشا'
    },
    description: 'نظام الدفع الإلكتروني - Electronic Payment System',
    keywords: ['Bank Basha', 'بنك باشا', 'digital wallet', 'محفظة رقمية', 'money transfer', 'تحويل أموال', 'السويداء', 'Sweida'],
    authors: [{ name: 'Bank Basha' }],
    creator: 'Bank Basha',
    publisher: 'Bank Basha',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    openGraph: {
        title: 'Bank Basha | بنك باشا',
        description: 'Your Digital Financial Partner',
        url: '/',
        siteName: 'Bank Basha',
        locale: 'ar_SY',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Bank Basha | بنك باشا',
        description: 'Your Digital Financial Partner',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    icons: {
        icon: [
            { url: '/logo.png', type: 'image/png', sizes: '512x512' },
            { url: '/logo.png', type: 'image/png', sizes: '192x192' },
        ],
        apple: '/logo.png',
        shortcut: '/logo.png',
    },
    manifest: '/manifest.json',
};

export const viewport: Viewport = {
    themeColor: '#FEC00F',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();
    const messages = await getMessages();
    const direction = locale === 'ar' ? 'rtl' : 'ltr';

    return (
        <html lang={locale} dir={direction} className="dark" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className={`${direction === 'rtl' ? 'font-arabic' : 'font-english'} min-h-screen antialiased`} suppressHydrationWarning>
                <NextIntlClientProvider messages={messages}>
                    {children}
                </NextIntlClientProvider>
            </body>
        </html>
    );
}


