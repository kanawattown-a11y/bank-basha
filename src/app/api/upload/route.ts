import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('accessToken')?.value;

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const payload = verifyAccessToken(token);
        if (!payload) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401, headers: getSecurityHeaders() }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const folder = formData.get('folder') as string || 'services';

        if (!file) {
            return NextResponse.json(
                { error: 'ملف الصورة مطلوب' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'حجم الملف يتجاوز 5MB' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Import S3 upload function
        const { uploadToS3 } = await import('@/lib/storage/s3');

        const result = await uploadToS3(file, folder, payload.userId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'فشل رفع الملف' },
                { status: 500, headers: getSecurityHeaders() }
            );
        }

        return NextResponse.json(
            {
                success: true,
                url: result.url,
                key: result.key,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
