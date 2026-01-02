import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// POST - Switch between personal and business accounts
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

        const { accountType } = await request.json();

        if (!accountType || !['PERSONAL', 'BUSINESS'].includes(accountType)) {
            return NextResponse.json(
                { error: 'Invalid account type. Must be PERSONAL or BUSINESS' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Get user with wallets
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                wallets: true,
                merchantProfile: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Check if user can switch to business
        if (accountType === 'BUSINESS') {
            if (!user.hasMerchantAccount || !user.merchantProfile) {
                return NextResponse.json(
                    { error: 'You do not have a business account' },
                    { status: 400, headers: getSecurityHeaders() }
                );
            }
        }

        // Update active account type
        await prisma.user.update({
            where: { id: payload.userId },
            data: { activeAccountType: accountType },
        });

        // Get wallets organized by type
        const personalWalletUSD = user.wallets.find(
            (w: { currency: string; walletType: string }) => w.currency === 'USD' && w.walletType === 'PERSONAL'
        );
        const businessWalletUSD = user.wallets.find(
            (w: { currency: string; walletType: string }) => w.currency === 'USD' && w.walletType === 'BUSINESS'
        );

        const activeWallet = accountType === 'BUSINESS' ? businessWalletUSD : personalWalletUSD;

        return NextResponse.json({
            success: true,
            activeAccountType: accountType,
            wallet: activeWallet ? {
                id: activeWallet.id,
                balance: activeWallet.balance,
                walletType: activeWallet.walletType,
            } : null,
            merchantProfile: accountType === 'BUSINESS' ? user.merchantProfile : null,
        }, { status: 200, headers: getSecurityHeaders() });

    } catch (error) {
        console.error('Error switching account:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

// GET - Get current account status
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
            include: {
                wallets: true,
                merchantProfile: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Organize wallets
        const personalWalletUSD = user.wallets.find(
            (w: { currency: string; walletType: string }) => w.currency === 'USD' && w.walletType === 'PERSONAL'
        );
        const personalWalletSYP = user.wallets.find(
            (w: { currency: string; walletType: string }) => w.currency === 'SYP' && w.walletType === 'PERSONAL'
        );
        const businessWalletUSD = user.wallets.find(
            (w: { currency: string; walletType: string }) => w.currency === 'USD' && w.walletType === 'BUSINESS'
        );
        const businessWalletSYP = user.wallets.find(
            (w: { currency: string; walletType: string }) => w.currency === 'SYP' && w.walletType === 'BUSINESS'
        );

        const activeWallet = user.activeAccountType === 'BUSINESS' ? businessWalletUSD : personalWalletUSD;

        return NextResponse.json({
            hasMerchantAccount: user.hasMerchantAccount,
            activeAccountType: user.activeAccountType,
            personalWallets: {
                USD: personalWalletUSD ? { balance: personalWalletUSD.balance } : null,
                SYP: personalWalletSYP ? { balance: personalWalletSYP.balance } : null,
            },
            businessWallets: user.hasMerchantAccount ? {
                USD: businessWalletUSD ? { balance: businessWalletUSD.balance } : null,
                SYP: businessWalletSYP ? { balance: businessWalletSYP.balance } : null,
            } : null,
            activeBalance: activeWallet?.balance || 0,
            merchantProfile: user.merchantProfile ? {
                businessName: user.merchantProfile.businessName,
                qrCode: user.merchantProfile.qrCode,
            } : null,
        }, { status: 200, headers: getSecurityHeaders() });

    } catch (error) {
        console.error('Error getting account status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
