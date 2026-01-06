import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';

// GET - Get fee settings (public for calculation preview)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const currency = searchParams.get('currency') || 'USD';

        const settings = await prisma.systemSettings.findFirst();

        if (!settings) {
            // Return defaults
            return NextResponse.json({
                transferFeePercent: 0.5,
                transferFeeFixed: 0,
                qrPaymentFeePercent: 0.5,
                qrPaymentFeeFixed: 0,
                depositFeePercent: 1.0,
                depositFeeFixed: 0,
                withdrawalFeePercent: 1.5,
                withdrawalFeeFixed: 0,
            }, { status: 200, headers: getSecurityHeaders() });
        }

        if (currency === 'SYP') {
            return NextResponse.json({
                transferFeePercent: settings.transferFeePercentSYP,
                transferFeeFixed: settings.transferFeeFixedSYP,
                qrPaymentFeePercent: settings.qrPaymentFeePercentSYP,
                qrPaymentFeeFixed: settings.qrPaymentFeeFixedSYP,
                depositFeePercent: settings.depositFeePercentSYP,
                depositFeeFixed: settings.depositFeeFixedSYP,
                withdrawalFeePercent: settings.withdrawalFeePercentSYP,
                withdrawalFeeFixed: settings.withdrawalFeeFixedSYP,
            }, { status: 200, headers: getSecurityHeaders() });
        }

        return NextResponse.json({
            transferFeePercent: settings.transferFeePercent,
            transferFeeFixed: settings.transferFeeFixed,
            qrPaymentFeePercent: settings.qrPaymentFeePercent,
            qrPaymentFeeFixed: settings.qrPaymentFeeFixed,
            depositFeePercent: settings.depositFeePercent,
            depositFeeFixed: settings.depositFeeFixed,
            withdrawalFeePercent: settings.withdrawalFeePercent,
            withdrawalFeeFixed: settings.withdrawalFeeFixed,
        }, { status: 200, headers: getSecurityHeaders() });
    } catch (error) {
        console.error('Error fetching fee settings:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
