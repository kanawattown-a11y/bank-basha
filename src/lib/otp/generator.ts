import bcrypt from 'bcryptjs';

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
}

/**
 * Hash OTP for secure storage
 */
export async function hashOTP(otp: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(otp, salt);
    return hash;
}

/**
 * Verify OTP against stored hash
 */
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(otp, hash);
}

/**
 * Generate OTP expiry time (default 5 minutes from now)
 */
export function getOTPExpiry(minutes: number = 5): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + minutes);
    return expiry;
}

/**
 * Check if OTP is expired
 */
export function isOTPExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
}
