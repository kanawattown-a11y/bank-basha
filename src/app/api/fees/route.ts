import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders } from '@/lib/auth/security';

// GET - Get fee settings (public for calculation preview)
export async function GET() {
    try {
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
