import crypto from 'crypto';

/**
 * Generates a deterministic QR code value based on a merchant code.
 * This ensures that the same merchant always has the same QR code.
 */
export function generateMerchantQR(merchantCode: string): string {
    // We use a salt to ensure the QR code isn't just a direct hash of the code
    const salt = 'BANKBASHA_OFFICIAL_QR';
    const hash = crypto
        .createHash('sha256')
        .update(`${salt}_${merchantCode}`)
        .digest('hex')
        .slice(0, 16)
        .toUpperCase();

    // Prefix with QR to identify it as a Bank Basha QR code
    return `QR_${hash}`;
}
