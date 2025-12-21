import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { softDelete } from '@/lib/db/soft-delete';

// GET - Get merchant details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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
        if (!payload || payload.userType !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const merchantId = params.id;

        // First try finding by merchantProfile.id (this is what the list API returns)
        let merchantProfile = await prisma.merchantProfile.findUnique({
            where: { id: merchantId },
            include: {
                user: {
                    include: {
                        wallet: true,
                        merchantRequests: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                    },
                },
            },
        });

        // If not found, try by userId
        if (!merchantProfile) {
            const user = await prisma.user.findUnique({
                where: { id: merchantId },
                include: {
                    merchantProfile: {
                        include: {
                            user: {
                                include: {
                                    wallet: true,
                                    merchantRequests: {
                                        orderBy: { createdAt: 'desc' },
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                },
            });
            if (user?.merchantProfile) {
                merchantProfile = user.merchantProfile;
            }
        }

        if (!merchantProfile || !merchantProfile.user) {
            return NextResponse.json(
                { error: 'Merchant not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        const user = merchantProfile.user;

        // Get transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { senderId: merchantId },
                    { receiverId: merchantId },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                sender: { select: { fullName: true } },
                receiver: { select: { fullName: true } },
            },
        });

        return NextResponse.json({
            merchant: {
                id: user.id,
                fullName: user.fullName,
                fullNameAr: user.fullNameAr,
                phone: user.phone,
                email: user.email,
                isActive: user.isActive,
                createdAt: user.createdAt,
                balance: user.wallet?.balance || 0,

                // Merchant Profile
                businessName: merchantProfile.businessName,
                businessNameAr: merchantProfile.businessNameAr,
                merchantCode: merchantProfile.merchantCode,
                qrCode: merchantProfile.qrCode,
                businessType: merchantProfile.businessType,
                businessAddress: merchantProfile.businessAddress,
                totalSales: merchantProfile.totalSales,
                totalTransactions: merchantProfile.totalTransactions,

                // License from merchant request
                licenseUrl: user.merchantRequests[0]?.licenseUrl || null,
                idPhotoUrl: user.merchantRequests[0]?.idPhotoUrl || null,
                businessDescription: user.merchantRequests[0]?.businessDescription || null,
            },
            transactions: transactions.map(t => ({
                ...t,
                isIncoming: t.receiverId === user.id,
                counterparty: t.receiverId === user.id
                    ? t.sender?.fullName || 'N/A'
                    : t.receiver?.fullName || 'N/A',
            })),
        }, { status: 200, headers: getSecurityHeaders() });

    } catch (error) {
        console.error('Get merchant error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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
        if (!payload || payload.userType !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        await softDelete({
            model: 'merchantProfile',
            id: params.id,
            deletedBy: payload.userId,
            reason: 'Deleted by admin',
        });

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error deleting merchant:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
