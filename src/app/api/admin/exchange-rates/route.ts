import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

// GET - Get all exchange rates (admin)
export async function GET(request: NextRequest) {
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

        let rates: any[] = [];
        try {
            rates = await prisma.exchangeRate.findMany({
                where: { isActive: true },
                orderBy: { type: 'asc' },
            });
        } catch (dbError) {
            console.error('Database error fetching exchange rates:', dbError);
            // Return empty rates if table doesn't exist
            rates = [];
        }

        return NextResponse.json(
            { rates },
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

// POST - Update exchange rates (admin)
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

        const body = await request.json();
        const { depositRate, withdrawRate } = body;

        if (!depositRate || !withdrawRate || depositRate <= 0 || withdrawRate <= 0) {
            return NextResponse.json(
                { error: 'Invalid rates provided' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Use transaction with direct SQL-like approach to avoid constraint issues
        try {
            await prisma.$transaction(async (tx) => {
                // Find existing active deposit rate
                const existingDeposit = await tx.exchangeRate.findFirst({
                    where: { type: 'DEPOSIT', isActive: true }
                });

                // Find existing active withdraw rate  
                const existingWithdraw = await tx.exchangeRate.findFirst({
                    where: { type: 'WITHDRAW', isActive: true }
                });

                // Update existing or create new deposit rate
                if (existingDeposit) {
                    await tx.exchangeRate.update({
                        where: { id: existingDeposit.id },
                        data: {
                            rate: parseFloat(depositRate),
                            updatedBy: payload.userId,
                            updatedAt: new Date()
                        }
                    });
                } else {
                    await tx.exchangeRate.create({
                        data: {
                            type: 'DEPOSIT',
                            rate: parseFloat(depositRate),
                            isActive: true,
                            updatedBy: payload.userId,
                        }
                    });
                }

                // Update existing or create new withdraw rate
                if (existingWithdraw) {
                    await tx.exchangeRate.update({
                        where: { id: existingWithdraw.id },
                        data: {
                            rate: parseFloat(withdrawRate),
                            updatedBy: payload.userId,
                            updatedAt: new Date()
                        }
                    });
                } else {
                    await tx.exchangeRate.create({
                        data: {
                            type: 'WITHDRAW',
                            rate: parseFloat(withdrawRate),
                            isActive: true,
                            updatedBy: payload.userId,
                        }
                    });
                }
            });
        } catch (dbError: any) {
            console.error('Database error updating exchange rates:', dbError);
            return NextResponse.json(
                { error: `Database error: ${dbError.message || 'Unknown error'}` },
                { status: 500, headers: getSecurityHeaders() }
            );
        }

        return NextResponse.json(
            { success: true, message: 'Exchange rates updated successfully' },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error: any) {
        console.error('Update exchange rates error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
