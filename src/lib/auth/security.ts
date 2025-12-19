import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // More rounds = more secure but slower
    return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// JWT Token generation
export interface TokenPayload {
    userId: string;
    userType: string;
    sessionId: string;
}

export function generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        algorithm: 'HS256',
    });
}

export function generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        algorithm: 'HS256',
    });
}

export function verifyAccessToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
        return null;
    }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
    } catch {
        return null;
    }
}

// PIN hashing (4-6 digit)
export async function hashPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
    return bcrypt.compare(pin, hash);
}

// Generate secure random strings
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

export function generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[crypto.randomInt(digits.length)];
    }
    return otp;
}

// Generate unique codes
export function generateAgentCode(): string {
    const prefix = 'AG';
    const random = crypto.randomInt(100000, 999999);
    return `${prefix}${random}`;
}

export function generateMerchantCode(): string {
    const prefix = 'MR';
    const random = crypto.randomInt(100000, 999999);
    return `${prefix}${random}`;
}

export function generateReferenceNumber(prefix: string = 'TX'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomInt(1000, 9999);
    return `${prefix}${timestamp}${random}`;
}

export function generateQRCode(): string {
    return `QR${generateSecureToken(16).toUpperCase()}`;
}

// Session ID
export function generateSessionId(): string {
    return generateSecureToken(24);
}

// Hash for ledger entries (blockchain-like)
export function generateLedgerHash(data: string, previousHash?: string): string {
    const combined = previousHash ? `${previousHash}:${data}` : data;
    return crypto.createHash('sha256').update(combined).digest('hex');
}

// Sanitize and validate phone number
export function sanitizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle Syrian phone numbers
    if (cleaned.startsWith('963')) {
        return '+' + cleaned;
    }
    if (cleaned.startsWith('0')) {
        return '+963' + cleaned.substring(1);
    }
    if (cleaned.length === 9) {
        return '+963' + cleaned;
    }

    return '+' + cleaned;
}

export function isValidSyrianPhone(phone: string): boolean {
    const sanitized = sanitizePhoneNumber(phone);
    // Syrian mobile numbers: +963 9xx xxxxxx
    const pattern = /^\+963(9\d{8})$/;
    return pattern.test(sanitized);
}

// Rate limiting helpers
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
}

const rateLimitStore = new Map<string, { count: number; resetAt: Date }>();

export function checkRateLimit(
    key: string,
    maxRequests: number = 100,
    windowMs: number = 900000 // 15 minutes
): RateLimitResult {
    const now = new Date();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
        const resetAt = new Date(now.getTime() + windowMs);
        rateLimitStore.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: maxRequests - 1, resetAt };
    }

    if (entry.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// Security headers for API responses
export function getSecurityHeaders(): Record<string, string> {
    return {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
}

// Input validation
export function escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

export function validateAmount(amount: number): boolean {
    return (
        typeof amount === 'number' &&
        !isNaN(amount) &&
        isFinite(amount) &&
        amount > 0 &&
        amount <= 100000000 // Max 100 million $
    );
}
