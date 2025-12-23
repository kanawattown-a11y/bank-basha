import { NextRequest, NextResponse } from 'next/server';
import { getSecurityHeaders } from '@/lib/auth/security';
import { randomUUID } from 'crypto';

// Store for temporary image data (in-memory for simplicity)
const tempImageStore = new Map<string, { data: Buffer; filename: string; expires: number }>();

// Cleanup expired images periodically
setInterval(() => {
    const now = Date.now();
    const entries = Array.from(tempImageStore.entries());
    for (const [key, value] of entries) {
        if (value.expires < now) {
            tempImageStore.delete(key);
        }
    }
}, 60000); // Every minute

/**
 * POST: Accept base64 image, store temporarily, return download ID
 */
export async function POST(request: NextRequest) {
    try {
        const { imageData, filename } = await request.json();

        if (!imageData || !filename) {
            return NextResponse.json(
                { error: 'Image data and filename required' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Remove data URL prefix if present
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate unique ID and store temporarily (expires in 5 minutes)
        const downloadId = randomUUID();
        tempImageStore.set(downloadId, {
            data: buffer,
            filename,
            expires: Date.now() + 5 * 60 * 1000,
        });

        // Return download URL
        return NextResponse.json({
            success: true,
            downloadUrl: `/api/download-image?id=${downloadId}`,
        });
    } catch (error) {
        console.error('Image upload error:', error);
        return NextResponse.json(
            { error: 'Failed to process image' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

/**
 * GET: Retrieve and serve the temporary image (triggers native download)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const downloadId = searchParams.get('id');

        if (!downloadId) {
            return NextResponse.json(
                { error: 'Download ID required' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const imageData = tempImageStore.get(downloadId);
        if (!imageData || imageData.expires < Date.now()) {
            tempImageStore.delete(downloadId);
            return NextResponse.json(
                { error: 'Download expired or not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Delete after serving (one-time download)
        tempImageStore.delete(downloadId);

        // Return as downloadable image
        return new NextResponse(new Uint8Array(imageData.data), {
            status: 200,
            headers: {
                ...getSecurityHeaders(),
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename="${imageData.filename}"`,
                'Content-Length': imageData.data.length.toString(),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Image download error:', error);
        return NextResponse.json(
            { error: 'Failed to serve image' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
