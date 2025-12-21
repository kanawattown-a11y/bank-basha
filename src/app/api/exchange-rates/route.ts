import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders } from '@/lib/auth/security';

// GET - Get active exchange rates (public)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const rates = await prisma.exchangeRate.findMany({
            where: { isActive: true },
            select: {
                type: true,
                rate: true,
            },
        });

        const deposit = rates.find(r => r.type === 'DEPOSIT');
        const withdraw = rates.find(r => r.type === 'WITHDRAW');

        return NextResponse.json(
            {
                deposit: deposit ? { rate: deposit.rate } : null,
                withdraw: withdraw ? { rate: withdraw.rate } : null,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Get exchange rates error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
