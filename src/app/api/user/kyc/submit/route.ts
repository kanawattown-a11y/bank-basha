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
        const idPhoto = formData.get('idPhoto') as File | null;
        const selfie = formData.get('selfie') as File | null;

        if (!idPhoto || !selfie) {
            return NextResponse.json(
                { error: 'Both ID photo and selfie are required' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Upload to S3
        const idUpload = await uploadToS3(idPhoto, 'kyc/id', userId);
        if (!idUpload.success || !idUpload.url) {
            return NextResponse.json(
                { error: 'Failed to upload ID photo: ' + idUpload.error },
                { status: 500, headers: getSecurityHeaders() }
            );
        }

        const selfieUpload = await uploadToS3(selfie, 'kyc/selfie', userId);
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
                    idPhotoUrl: idUpload.url!, // Non-null assertion asserted by check above
                    selfiePhotoUrl: selfieUpload.url!,
                },
            });

            // Add to Document History
            await tx.kYCDocument.createMany({
                data: [
                    {
                        userId: userId,
                        documentType: 'ID_FRONT',
                        documentUrl: idUpload.url!, // Non-null assertion
                        status: 'PENDING',
                    },
                    {
                        userId: userId,
                        documentType: 'SELFIE',
                        documentUrl: selfieUpload.url!, // Non-null assertion
                        status: 'PENDING',
                    },
                ],
            });
        });

        // Notify admins
        const admins = await prisma.user.findMany({
            where: { userType: 'ADMIN' },
            select: { id: true },
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
