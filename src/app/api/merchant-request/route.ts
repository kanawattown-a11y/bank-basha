import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// GET - Get user's existing merchant request
export async function GET() {
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

        // Get latest request
        const request = await prisma.merchantRequest.findFirst({
            where: { userId: payload.userId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ request }, { status: 200, headers: getSecurityHeaders() });
    } catch (error) {
        console.error('Error fetching merchant request:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST - Submit new merchant request
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

        // Check if user already has an approved request or is already a merchant
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: { merchantProfile: true },
        });

        if (user?.merchantProfile || user?.hasMerchantAccount) {
            return NextResponse.json(
                { error: 'You already have a merchant account' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Check for pending request
        const pendingRequest = await prisma.merchantRequest.findFirst({
            where: { userId: payload.userId, status: 'PENDING' },
        });

        if (pendingRequest) {
            return NextResponse.json(
                { error: 'You already have a pending request' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Parse form data
        const formData = await request.formData();
        const businessName = formData.get('businessName') as string;
        const businessNameAr = formData.get('businessNameAr') as string;
        const businessType = formData.get('businessType') as string;
        const businessAddress = formData.get('businessAddress') as string;
        const businessPhone = formData.get('businessPhone') as string;
        const businessEmail = formData.get('businessEmail') as string;
        const businessDescription = formData.get('businessDescription') as string;

        // Validate required fields
        if (!businessName || !businessType || !businessAddress) {
            return NextResponse.json(
                { error: 'Business name, type, and address are required' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Handle file uploads with S3
        const licenseFile = formData.get('license') as File | null;
        const idPhotoFile = formData.get('idPhoto') as File | null;

        let licenseUrl = null;
        let idPhotoUrl = null;

        // Import S3 upload function
        const { uploadToS3 } = await import('@/lib/storage/s3');

        if (licenseFile && licenseFile.size > 0) {
            const result = await uploadToS3(licenseFile, 'merchant-licenses', payload.userId);
            if (result.success) {
                licenseUrl = result.url;
            }
        }

        if (idPhotoFile && idPhotoFile.size > 0) {
            const result = await uploadToS3(idPhotoFile, 'merchant-ids', payload.userId);
            if (result.success) {
                idPhotoUrl = result.url;
            }
        }

        // Create merchant request
        const merchantRequest = await prisma.merchantRequest.create({
            data: {
                userId: payload.userId,
                businessName,
                businessNameAr: businessNameAr || null,
                businessType,
                businessAddress,
                businessPhone: businessPhone || null,
                businessEmail: businessEmail || null,
                businessDescription: businessDescription || null,
                licenseUrl,
                idPhotoUrl,
                status: 'PENDING',
            },
        });

        // Create notification for admins
        const admins = await prisma.user.findMany({
            where: { userType: 'ADMIN' },
        });

        for (const admin of admins) {
            await prisma.notification.create({
                data: {
                    userId: admin.id,
                    type: 'ADMIN_ALERT',
                    title: 'طلب حساب بزنس جديد',
                    titleAr: 'طلب حساب بزنس جديد',
                    message: `${user?.fullName} طلب فتح حساب بزنس باسم "${businessName}"`,
                    messageAr: `${user?.fullName} طلب فتح حساب بزنس باسم "${businessName}"`,
                    metadata: JSON.stringify({ requestId: merchantRequest.id }),
                },
            });
        }

        return NextResponse.json(
            { success: true, request: merchantRequest },
            { status: 201, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error creating merchant request:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
