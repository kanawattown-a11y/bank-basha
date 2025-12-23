import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { uploadToS3 } from '@/lib/storage/s3';

// POST - Submit KYC documents
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

        const userId = payload.userId;

        // Check if user already has pending/approved KYC
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { kycStatus: true },
        });

        if (user?.kycStatus === 'PENDING') {
            return NextResponse.json(
                { error: 'KYC already pending review' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        if (user?.kycStatus === 'APPROVED') {
            return NextResponse.json(
                { error: 'KYC already approved' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Parse form data
        const formData = await request.formData();
        const idPhotoFront = formData.get('idPhotoFront') as File | null;
        const idPhotoBack = formData.get('idPhotoBack') as File | null;
        const selfie = formData.get('selfiePhoto') as File | null;

        // Also support the old field names for backwards compatibility
        const legacyIdPhoto = formData.get('idPhoto') as File | null;
        const legacySelfie = formData.get('selfie') as File | null;

        const frontPhoto = idPhotoFront || legacyIdPhoto;
        const backPhoto = idPhotoBack;
        const selfiePhoto = selfie || legacySelfie;

        if (!frontPhoto || !selfiePhoto) {
            return NextResponse.json(
                { error: 'ID photo (front) and selfie are required' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Upload front ID to S3
        const frontUpload = await uploadToS3(frontPhoto, 'kyc/id-front', userId);
        if (!frontUpload.success || !frontUpload.url) {
            return NextResponse.json(
                { error: 'Failed to upload ID front photo: ' + frontUpload.error },
                { status: 500, headers: getSecurityHeaders() }
            );
        }

        // Upload back ID to S3 (optional but recommended)
        let backUpload: { success: boolean; url?: string; error?: string } = { success: true };
        if (backPhoto) {
            backUpload = await uploadToS3(backPhoto, 'kyc/id-back', userId);
            if (!backUpload.success || !backUpload.url) {
                return NextResponse.json(
                    { error: 'Failed to upload ID back photo: ' + backUpload.error },
                    { status: 500, headers: getSecurityHeaders() }
                );
            }
        }

        const selfieUpload = await uploadToS3(selfiePhoto, 'kyc/selfie', userId);
        if (!selfieUpload.success || !selfieUpload.url) {
            return NextResponse.json(
                { error: 'Failed to upload selfie: ' + selfieUpload.error },
                { status: 500, headers: getSecurityHeaders() }
            );
        }

        // Update User and Create Documents
        await prisma.$transaction(async (tx) => {
            // Update User Profile with new Docs
            await tx.user.update({
                where: { id: userId },
                data: {
                    kycStatus: 'PENDING',
                    kycSubmittedAt: new Date(),
                    kycRejectionReason: null,
                    idPhotoUrl: frontUpload.url!,
                    selfiePhotoUrl: selfieUpload.url!,
                },
            });

            // Add to Document History
            const documents = [
                {
                    userId: userId,
                    documentType: 'ID_FRONT',
                    documentUrl: frontUpload.url!,
                    status: 'PENDING',
                },
                {
                    userId: userId,
                    documentType: 'SELFIE',
                    documentUrl: selfieUpload.url!,
                    status: 'PENDING',
                },
            ];

            // Add back photo if provided
            if (backUpload.url) {
                documents.push({
                    userId: userId,
                    documentType: 'ID_BACK',
                    documentUrl: backUpload.url,
                    status: 'PENDING',
                });
            }

            await tx.kYCDocument.createMany({
                data: documents,
            });
        });

        // Notify admins
        const admins = await prisma.user.findMany({
            where: { userType: 'ADMIN' },
            select: { id: true, fcmToken: true },
        });

        if (admins.length > 0) {
            await prisma.notification.createMany({
                data: admins.map(admin => ({
                    userId: admin.id,
                    type: 'SYSTEM',
                    title: 'طلب توثيق جديد',
                    titleAr: 'طلب توثيق جديد',
                    message: 'تم استلام طلب توثيق KYC جديد للمراجعة',
                    messageAr: 'تم استلام طلب توثيق KYC جديد للمراجعة',
                })),
            });

            // Send push notifications to admins
            const { sendPushNotification } = await import('@/lib/firebase/admin');
            for (const admin of admins) {
                if (admin.fcmToken) {
                    sendPushNotification(
                        admin.fcmToken,
                        '📋 طلب توثيق جديد',
                        'تم استلام طلب KYC جديد للمراجعة',
                        { type: 'KYC_REQUEST', url: '/admin/kyc' }
                    ).catch(err => console.error('Push notification error:', err));
                }
            }
        }

        return NextResponse.json(
            { success: true, message: 'KYC submitted successfully' },
            { status: 200, headers: getSecurityHeaders() }
        );

    } catch (error) {
        console.error('KYC submit error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
