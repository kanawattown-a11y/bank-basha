import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, validateAmount } from '@/lib/auth/security';
import { processWithdrawal } from '@/lib/ledger/ledger';
import { sendTransactionEmail } from '@/lib/email/email';
import { cookies } from 'next/headers';
import { z } from 'zod';

const withdrawSchema = z.object({
    customerPhone: z.string().min(9, 'Invalid phone number'),
    amount: z.number().positive('Amount must be positive'),
});

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
        if (!payload || payload.userType !== 'AGENT') {
            return NextResponse.json(
                { error: 'Unauthorized - Agent access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const result = withdrawSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { customerPhone, amount } = result.data;

        if (!validateAmount(amount)) {
            return NextResponse.json(
                { error: 'Invalid amount' },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Find customer
        const customer = await prisma.user.findFirst({
            where: {
                phone: { contains: customerPhone.replace(/\D/g, '').slice(-9) },
            },
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Process withdrawal
        const withdrawResult = await processWithdrawal(
            customer.id,
            payload.userId,
            amount
        );

        if (!withdrawResult.success) {
            return NextResponse.json(
                { error: withdrawResult.error },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: payload.userId,
                action: 'WITHDRAW_COMPLETED',
                entity: 'Transaction',
                entityId: withdrawResult.transactionId,
                newValue: JSON.stringify({ amount, customerPhone }),
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
            },
        });

        // Create notification for customer
        await prisma.notification.create({
            data: {
                userId: customer.id,
                type: 'TRANSACTION',
                title: 'Withdrawal Completed',
                titleAr: 'تم السحب',
                message: `You withdrew ${amount} $`,
                messageAr: `تم سحب ${amount} $ من حسابك`,
                metadata: JSON.stringify({ transactionId: withdrawResult.transactionId }),
            },
        });

        // Send email notification
        if (customer.email) {
            const wallet = await prisma.wallet.findUnique({ where: { userId: customer.id } });
            await sendTransactionEmail({
                to: customer.email,
                userName: customer.fullNameAr || customer.fullName,
                transactionType: 'WITHDRAW',
                amount,
                referenceNumber: withdrawResult.referenceNumber || '',
                status: 'COMPLETED',
                date: new Date(),
                balance: wallet?.balance || 0,
            }).catch(err => console.error('Email send error:', err));
        }

        return NextResponse.json(
            {
                success: true,
                transactionId: withdrawResult.transactionId,
                referenceNumber: withdrawResult.referenceNumber,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Agent withdraw error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
