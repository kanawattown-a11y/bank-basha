import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, generateReferenceNumber } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { generateMerchantQR } from '@/lib/utils/qr';

// GET - List pending merchant requests
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
        if (!payload || payload.userType !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const requests = await prisma.merchantRequest.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        email: true,
                        kycStatus: true,
                    },
                },
            },
        });

        // Also get recent processed requests
        const recentProcessed = await prisma.merchantRequest.findMany({
            where: { status: { in: ['APPROVED', 'REJECTED'] } },
            orderBy: { reviewedAt: 'desc' },
            take: 20,
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });

        return NextResponse.json(
            { pendingRequests: requests, recentProcessed },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error fetching merchant requests:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// POST - Approve or reject a merchant request
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
        if (!payload || payload.userType !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const { requestId, action, rejectionReason } = await request.json();

        if (!requestId || !action) {
            return NextResponse.json(
                { error: 'Request ID and action are required' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const merchantRequest = await prisma.merchantRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });

        if (!merchantRequest) {
            return NextResponse.json(
                { error: 'Request not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        if (merchantRequest.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'Request already processed' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        if (action === 'approve') {
            // Generate merchant code and QR code
            const merchantCode = 'M' + Date.now().toString().slice(-8);
            const qrCode = generateMerchantQR(merchantCode);

            // Create business wallets (USD and SYP) linked to user
            const businessWalletUSD = await prisma.wallet.create({
                data: {
                    userId: merchantRequest.userId,
                    balance: 0,
                    walletType: 'BUSINESS',
                    currency: 'USD',
                },
            });

            await prisma.wallet.create({
                data: {
                    userId: merchantRequest.userId,
                    balance: 0,
                    walletType: 'BUSINESS',
                    currency: 'SYP',
                },
            });

            // Create merchant profile
            await prisma.merchantProfile.create({
                data: {
                    userId: merchantRequest.userId,
                    merchantCode,
                    businessName: merchantRequest.businessName,
                    businessNameAr: merchantRequest.businessNameAr,
                    businessType: merchantRequest.businessType,
                    businessAddress: merchantRequest.businessAddress,
                    qrCode,
                    // USD Stats
                    totalSales: 0,
                    totalTransactions: 0,
                    // SYP Stats
                    totalSalesSYP: 0,
                    totalTransactionsSYP: 0,
                },
            });

            // Update user
            await prisma.user.update({
                where: { id: merchantRequest.userId },
                data: {
                    hasMerchantAccount: true,
                    // businessWalletId is no longer needed - wallets are linked via userId
                },
            });

            // Update request
            await prisma.merchantRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    reviewedBy: payload.userId,
                    reviewedAt: new Date(),
                },
            });

            // Notify user
            await prisma.notification.create({
                data: {
                    userId: merchantRequest.userId,
                    type: 'SYSTEM',
                    title: 'تمت الموافقة على حساب البزنس!',
                    titleAr: 'تمت الموافقة على حساب البزنس!',
                    message: `مبروك! تم قبول طلبك لفتح حساب بزنس باسم "${merchantRequest.businessName}". يمكنك الآن استقبال المدفوعات.`,
                    messageAr: `مبروك! تم قبول طلبك لفتح حساب بزنس باسم "${merchantRequest.businessName}". يمكنك الآن استقبال المدفوعات.`,
                },
            });

            return NextResponse.json(
                { success: true, message: 'Merchant account approved' },
                { status: 200, headers: getSecurityHeaders() }
            );
        } else {
            // Reject
            if (!rejectionReason) {
                return NextResponse.json(
                    { error: 'Rejection reason is required' },
                    { status: 400, headers: getSecurityHeaders() }
                );
            }

            await prisma.merchantRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    rejectionReason,
                    reviewedBy: payload.userId,
                    reviewedAt: new Date(),
                },
            });

            // Notify user
            await prisma.notification.create({
                data: {
                    userId: merchantRequest.userId,
                    type: 'SYSTEM',
                    title: 'تم رفض طلب حساب البزنس',
                    titleAr: 'تم رفض طلب حساب البزنس',
                    message: `للأسف تم رفض طلبك لفتح حساب بزنس. السبب: ${rejectionReason}`,
                    messageAr: `للأسف تم رفض طلبك لفتح حساب بزنس. السبب: ${rejectionReason}`,
                },
            });

            return NextResponse.json(
                { success: true, message: 'Request rejected' },
                { status: 200, headers: getSecurityHeaders() }
            );
        }
    } catch (error) {
        console.error('Error processing merchant request:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
