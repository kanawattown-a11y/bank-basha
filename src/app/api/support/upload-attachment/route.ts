import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('accessToken')?.value;

        let userId: string | undefined;
        if (token) {
            const payload = verifyAccessToken(token);
            userId = payload?.userId;
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 5MB.' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Convert File to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const extension = file.name.split('.').pop();
        const fileName = `ticket-${timestamp}-${randomStr}.${extension}`;

        // Upload to S3
        const key = `support-tickets/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET || 'bank-basha-documents',
            Key: key,
            Body: buffer,
            ContentType: file.type,
            Metadata: {
                originalName: file.name,
                uploadedBy: userId || 'public',
            },
        });

        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });

        await s3Client.send(command);

        const fileUrl = `https://${process.env.AWS_S3_BUCKET || 'bank-basha-documents'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

        return NextResponse.json(
            {
                success: true,
                fileUrl,
                fileName,
                fileSize: file.size,
                mimeType: file.type,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Upload attachment error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
