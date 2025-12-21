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

        // Try finding by userId first
        const user = await prisma.user.findUnique({
            where: { id: merchantId },
            include: {
                merchantProfile: true,
                wallet: true,
                merchantRequests: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!user || !user.merchantProfile) {
            return NextResponse.json(
                { error: 'Merchant not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

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
                businessName: user.merchantProfile.businessName,
                businessNameAr: user.merchantProfile.businessNameAr,
                merchantCode: user.merchantProfile.merchantCode,
                qrCode: user.merchantProfile.qrCode,
                businessType: user.merchantProfile.businessType,
                businessAddress: user.merchantProfile.businessAddress,
                totalSales: user.merchantProfile.totalSales,
                totalTransactions: user.merchantProfile.totalTransactions,

                // License from merchant request
                licenseUrl: user.merchantRequests[0]?.licenseUrl || null,
                idPhotoUrl: user.merchantRequests[0]?.idPhotoUrl || null,
                businessDescription: user.merchantRequests[0]?.businessDescription || null,
            },
            transactions: transactions.map(t => ({
                ...t,
                isIncoming: t.receiverId === merchantId,
                counterparty: t.receiverId === merchantId
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
