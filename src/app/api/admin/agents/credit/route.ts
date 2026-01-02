import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders, sanitizePhoneNumber, generateReferenceNumber } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const grantCreditSchema = z.object({
    agentPhone: z.string().min(9, 'Invalid phone number'),
    amount: z.number().positive('Amount must be positive'),
    currency: z.enum(['USD', 'SYP']).default('USD'),
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
        if (!payload || payload.userType !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const result = grantCreditSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { agentPhone, amount, currency } = result.data;
        const sanitizedPhone = sanitizePhoneNumber(agentPhone);

        // Find agent
        const agent = await prisma.user.findFirst({
            where: {
                phone: { contains: sanitizedPhone.replace('+963', '') },
                userType: 'AGENT',
            },
            include: {
                wallets: true,
                agentProfile: true,
            },
        });

        if (!agent || !agent.agentProfile) {
            return NextResponse.json(
                { error: 'Agent not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Grant credit in a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Debit Central Bank (goes negative - source of all money)
            const centralBank = await tx.user.findFirst({
                where: { phone: 'CENTRAL_BANK' },
                include: { wallets: true },
            });

            // Find central bank wallet for the specified currency
            const centralBankWallet = (centralBank?.wallets as any[])?.find(
                (w: { currency: string }) => w.currency === currency
            );

            if (centralBankWallet) {
                await tx.wallet.update({
                    where: { id: centralBankWallet.id },
                    data: { balance: { decrement: amount } }, // Goes negative
                });
            }

            // 2. Credit Agent (add to currentCredit based on currency)
            if (currency === 'SYP') {
                await tx.agentProfile.update({
                    where: { id: agent.agentProfile!.id },
                    data: {
                        currentCreditSYP: { increment: amount },
                    },
                });
            } else {
                await tx.agentProfile.update({
                    where: { id: agent.agentProfile!.id },
                    data: {
                        currentCredit: { increment: amount },
                    },
                });
            }

            // 3. Create transaction record
            await tx.transaction.create({
                data: {
                    referenceNumber: generateReferenceNumber('CRD'),
                    type: 'CREDIT_GRANT',
                    status: 'COMPLETED',
                    receiverId: agent.id,
                    amount,
                    fee: 0,
                    platformFee: 0,
                    agentFee: 0,
                    netAmount: amount,
                    currency,
                    description: `Credit grant from admin (${currency})`,
                    descriptionAr: `منح رصيد من الإدارة (${currency})`,
                    completedAt: new Date(),
                },
            });
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: payload.userId,
                action: 'CREDIT_GRANTED',
                entity: 'AgentProfile',
                entityId: agent.agentProfile.id,
                newValue: JSON.stringify({ amount, agentPhone: sanitizedPhone }),
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
            },
        });

        // Notification
        await prisma.notification.create({
            data: {
                userId: agent.id,
                type: 'SYSTEM',
                title: 'Credit Granted',
                titleAr: 'تم منحك رصيد',
                message: `You have been granted ${amount} ${currency === 'SYP' ? 'SYP' : 'USD'} credit`,
                messageAr: `تم منحك رصيد بقيمة ${amount} ${currency === 'SYP' ? 'ل.س' : '$'}`,
            },
        });

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Grant credit error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
