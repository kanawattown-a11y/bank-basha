import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, TokenPayload } from './security';

export interface AuthResult {
    success: boolean;
    payload: TokenPayload | null;
    user: {
        id: string;
        userType: string;
        phone: string;
        fullName: string;
        status: string;
        isActive: boolean;
    } | null;
    error?: string;
}

/**
 * Verify user authentication by checking both:
 * 1. JWT token validity
 * 2. Session existence in database
 * 3. User active status
 * 
 * This ensures that:
 * - Logged out users can't access protected routes
 * - Expired sessions are rejected
 * - Blocked/suspended users can't access the system
 */
export async function verifyAuth(request?: NextRequest): Promise<AuthResult> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('accessToken')?.value;

        // No token
        if (!token) {
            return {
                success: false,
                payload: null,
                user: null,
                error: 'NO_TOKEN',
            };
        }

        // Verify JWT token
        const payload = verifyAccessToken(token);
        if (!payload) {
            return {
                success: false,
                payload: null,
                user: null,
                error: 'INVALID_TOKEN',
            };
        }

        // Verify session exists in database
        const session = await prisma.session.findUnique({
            where: { token },
            include: {
                user: {
                    select: {
                        id: true,
                        userType: true,
                        phone: true,
                        fullName: true,
                        status: true,
                        isActive: true,
                    },
                },
            },
        });

        // Session not found (user logged out)
        if (!session) {
            return {
                success: false,
                payload,
                user: null,
                error: 'SESSION_NOT_FOUND',
            };
        }

        // Session expired
        if (session.expiresAt < new Date()) {
            // Clean up expired session
            await prisma.session.delete({ where: { id: session.id } });
            return {
                success: false,
                payload,
                user: null,
                error: 'SESSION_EXPIRED',
            };
        }

        // User inactive or blocked
        if (!session.user.isActive || session.user.status === 'BLOCKED' || session.user.status === 'SUSPENDED') {
            return {
                success: false,
                payload,
                user: session.user,
                error: 'USER_INACTIVE',
            };
        }

        // All checks passed
        return {
            success: true,
            payload,
            user: session.user,
        };
    } catch (error) {
        console.error('Auth verification error:', error);
        return {
            success: false,
            payload: null,
            user: null,
            error: 'INTERNAL_ERROR',
        };
    }
}

/**
 * Check if user has specific role
 */
export function hasRole(user: AuthResult['user'], roles: string[]): boolean {
    if (!user) return false;
    return roles.includes(user.userType);
}

/**
 * Get error message for auth failure
 */
export function getAuthErrorMessage(error: string, locale: 'ar' | 'en' = 'en'): string {
    const messages: Record<string, { ar: string; en: string }> = {
        NO_TOKEN: {
            ar: 'يرجى تسجيل الدخول',
            en: 'Please login',
        },
        INVALID_TOKEN: {
            ar: 'جلسة غير صالحة. يرجى تسجيل الدخول مجدداً',
            en: 'Invalid session. Please login again',
        },
        SESSION_NOT_FOUND: {
            ar: 'انتهت الجلسة. يرجى تسجيل الدخول مجدداً',
            en: 'Session ended. Please login again',
        },
        SESSION_EXPIRED: {
            ar: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً',
            en: 'Session expired. Please login again',
        },
        USER_INACTIVE: {
            ar: 'حسابك معطل. تواصل مع الدعم',
            en: 'Your account is disabled. Contact support',
        },
        INTERNAL_ERROR: {
            ar: 'حدث خطأ. حاول مجدداً',
            en: 'An error occurred. Try again',
        },
    };

    return messages[error]?.[locale] || messages.INTERNAL_ERROR[locale];
}
