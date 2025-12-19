import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ar';

export default getRequestConfig(async () => {
    // Get locale from cookie or header
    const cookieStore = await cookies();
    const headersList = await headers();

    let locale: Locale = defaultLocale;

    // Check cookie first
    const cookieLocale = cookieStore.get('locale')?.value;
    if (cookieLocale && locales.includes(cookieLocale as Locale)) {
        locale = cookieLocale as Locale;
    } else {
        // Check Accept-Language header
        const acceptLanguage = headersList.get('accept-language');
        if (acceptLanguage) {
            const preferredLocale = acceptLanguage.split(',')[0].split('-')[0];
            if (locales.includes(preferredLocale as Locale)) {
                locale = preferredLocale as Locale;
            }
        }
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default
    };
});
