// S3 Storage Utility for Bank Basha
// Handles file uploads to AWS S3 with validation

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'bank-basha-documents';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

export interface UploadResult {
    success: boolean;
    url?: string;
    key?: string;
    error?: string;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Only JPG, PNG, and WebP are allowed' };
    }

    return { valid: true };
}

/**
 * Upload file to S3
 * @param file File to upload
 * @param folder Folder path in S3 (e.g., 'kyc/id', 'kyc/selfie')
 * @param userId User ID for organizing files
 */
export async function uploadToS3(
    file: File,
    folder: string,
    userId: string
): Promise<UploadResult> {
    try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Generate unique key
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const key = `${folder}/${userId}/${timestamp}.${extension}`;

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to S3
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: file.type,
            Metadata: {
                userId,
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
            },
        });

        await s3Client.send(command);

        // Return S3 URL
        const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

        return {
            success: true,
            url,
            key,
        };
    } catch (error) {
        console.error('S3 upload error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed',
        };
    }
}

/**
 * Generate signed URL for viewing private S3 objects
 * @param key S3 object key
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 */
export async function getS3SignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
        // Import GetObjectCommand dynamically to avoid unused import warning
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return url;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        throw error;
    }
}

/**
 * Generate signed URL from a full S3 URL
 * @param s3Url Full S3 URL
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 */
export async function getSignedUrlFromFullUrl(s3Url: string, expiresIn: number = 3600): Promise<string | null> {
    const key = extractS3Key(s3Url);
    if (!key) {
        return null;
    }
    return await getS3SignedUrl(key, expiresIn);
}

/**
 * Delete file from S3
 * @param key S3 object key
 */
export async function deleteFromS3(key: string): Promise<boolean> {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
        return true;
    } catch (error) {
        console.error('S3 delete error:', error);
        return false;
    }
}

/**
 * Extract S3 key from URL
 */
export function extractS3Key(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        return path.startsWith('/') ? path.substring(1) : path;
    } catch {
        return null;
    }
}
