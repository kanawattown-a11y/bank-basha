import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

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

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                fullName: true,
                fullNameAr: true,
                phone: true,
                email: true,
                kycStatus: true,
                city: true,
                avatarUrl: true,
                address: true,
                dateOfBirth: true,
                hasMerchantAccount: true,
                wallets: {
                    select: {
                        id: true,
                        balance: true,
                        frozenBalance: true,
                        currency: true,
                        walletType: true,
                        isActive: true,
                    },
                    orderBy: [
                        { walletType: 'asc' },
                        { currency: 'asc' },
                    ],
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Format wallets for easy frontend consumption
        const walletsSummary = {
            personal: {
                USD: user.wallets.find(w => w.walletType === 'PERSONAL' && w.currency === 'USD'),
                SYP: user.wallets.find(w => w.walletType === 'PERSONAL' && w.currency === 'SYP'),
            },
            business: user.hasMerchantAccount ? {
                USD: user.wallets.find(w => w.walletType === 'BUSINESS' && w.currency === 'USD'),
                SYP: user.wallets.find(w => w.walletType === 'BUSINESS' && w.currency === 'SYP'),
            } : null,
        };

        return NextResponse.json(
            { user, walletsSummary },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
