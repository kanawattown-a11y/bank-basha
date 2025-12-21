import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify-session';
import { getSignedUrlFromFullUrl } from '@/lib/storage/s3';

/**
 * Generate pre-signed URLs for viewing private S3 images
 * Admin only - used for viewing KYC documents
 */
export async function POST(request: NextRequest) {
    try {
        // Verify admin
        const auth = await verifyAuth(request);
        if (!auth.success || !auth.user || auth.user.userType !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { urls } = body;

        if (!urls || !Array.isArray(urls)) {
            return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
        }

        // Generate signed URLs for each
        const signedUrls: Record<string, string | null> = {};

        for (const url of urls) {
            if (url && typeof url === 'string') {
                try {
                    const signedUrl = await getSignedUrlFromFullUrl(url, 3600); // 1 hour expiry
                    signedUrls[url] = signedUrl;
                } catch (error) {
                    console.error('Error generating signed URL for:', url, error);
                    signedUrls[url] = null;
                }
            }
        }

        return NextResponse.json({ signedUrls });
    } catch (error) {
        console.error('Signed URL API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

