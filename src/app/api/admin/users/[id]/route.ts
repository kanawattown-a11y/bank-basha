import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { softDelete } from '@/lib/db/soft-delete';

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

        const userId = params.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallet: {
                    select: { balance: true },
                },
                kycDocuments: {
                    select: {
                        documentType: true,
                        documentUrl: true,
                        status: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Get user transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
                id: true,
                referenceNumber: true,
                type: true,
                amount: true,
                fee: true,
                status: true,
                description: true,
                descriptionAr: true,
                createdAt: true,
                senderId: true,
                receiverId: true,
                sender: {
                    select: { fullName: true },
                },
                receiver: {
                    select: { fullName: true },
                },
            },
        });

        // Extract ID back photo from KYC documents if available
        const idBackDocument = user.kycDocuments?.find(doc => doc.documentType === 'ID_BACK');
        const idBackPhotoUrl = idBackDocument?.documentUrl || null;

        return NextResponse.json(
            {
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    phone: user.phone,
                    email: user.email,
                    dateOfBirth: user.dateOfBirth,
                    userType: user.userType,
                    kycStatus: user.kycStatus,
                    isActive: user.isActive,
                    hasMerchantAccount: user.hasMerchantAccount,
                    idPhotoUrl: user.idPhotoUrl,
                    idPhotoBackUrl: idBackPhotoUrl,
                    selfiePhotoUrl: user.selfiePhotoUrl,
                    kycSubmittedAt: user.kycSubmittedAt,
                    kycReviewedAt: user.kycReviewedAt,
                    kycRejectionReason: user.kycRejectionReason,
                    createdAt: user.createdAt,
                    wallet: user.wallet,
                },
                transactions: transactions.map(t => ({
                    ...t,
                    isOutgoing: t.senderId === userId,
                    counterparty: t.senderId === userId
                        ? t.receiver?.fullName || 'N/A'
                        : t.sender?.fullName || 'N/A',
                })),
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// DELETE - Soft delete a user
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
            model: 'user',
            id: params.id,
            deletedBy: payload.userId,
            reason: 'Deleted by admin',
        });

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
