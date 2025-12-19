import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/agent', '/merchant', '/admin'];

// Routes that require specific user types
// Note: /merchant is not restricted here because regular users can have merchant accounts
// The API validates access based on hasMerchantAccount or userType === 'MERCHANT'
const roleRoutes: Record<string, string[]> = {
    '/admin': ['ADMIN'],
    '/agent': ['AGENT'],
    // '/merchant' - access controlled via hasMerchantAccount in API, not userType
};

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the route is protected
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    const accessToken = request.cookies.get('accessToken')?.value;

    if (isProtectedRoute) {
        if (!accessToken) {
            // Redirect to login if no token
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // For role-based routes, we'll check in the API/page level
        // since we can't decode JWT without the secret here
    }

    // Redirect authenticated users from landing page to dashboard
    if (pathname === '/' && accessToken) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Add security headers to all responses
    const response = NextResponse.next();

    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
    ],
};
