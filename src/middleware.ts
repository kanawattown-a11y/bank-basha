import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/agent', '/merchant', '/admin'];

// Routes that require specific user types
// Note: /merchant is for users with hasMerchantAccount, not a separate userType
const roleRoutes: Record<string, string[]> = {
    '/admin': ['ADMIN'],
    '/agent': ['AGENT'],
    // '/merchant' - accessed by USER with hasMerchantAccount (checked in page/API level)
    // '/dashboard' - accessed by USER
};

// Helper to decode JWT payload without verification (for routing only)
function decodeJWTPayload(token: string): { userId: string; userType: string; sessionId: string } | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload;
    } catch {
        return null;
    }
}

// Get correct dashboard based on user type
// Note: MERCHANT is not a userType - regular users access /merchant via hasMerchantAccount
function getDashboardForUserType(userType: string): string {
    switch (userType) {
        case 'ADMIN':
            return '/admin';
        case 'AGENT':
            return '/agent';
        default:
            // USER goes to /dashboard (can access /merchant if hasMerchantAccount)
            return '/dashboard';
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const accessToken = request.cookies.get('accessToken')?.value;

    // Decode user info from token if available
    const userPayload = accessToken ? decodeJWTPayload(accessToken) : null;
    const userType = userPayload?.userType || 'USER';

    // Check if the route is protected
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    if (isProtectedRoute) {
        if (!accessToken) {
            // Redirect to login if no token
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Check role-based access for admin and agent only
        for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
            if (pathname.startsWith(route)) {
                if (!allowedRoles.includes(userType)) {
                    // Redirect to correct dashboard instead of blocking
                    const correctDashboard = getDashboardForUserType(userType);
                    return NextResponse.redirect(new URL(correctDashboard, request.url));
                }
            }
        }

        // /merchant and /dashboard are accessible by USER (merchant check happens in page)
    }

    // Redirect authenticated users from landing page to their correct dashboard
    if (pathname === '/' && accessToken && userPayload) {
        const dashboard = getDashboardForUserType(userType);
        return NextResponse.redirect(new URL(dashboard, request.url));
    }

    // Redirect authenticated users from login page to their correct dashboard
    if (pathname === '/login' && accessToken && userPayload) {
        const dashboard = getDashboardForUserType(userType);
        return NextResponse.redirect(new URL(dashboard, request.url));
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


