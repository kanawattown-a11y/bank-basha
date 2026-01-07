import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';
import { z } from 'zod';

const settlementActionSchema = z.object({
    settlementId: z.string(),
    action: z.enum(['approve', 'reject', 'confirm_delivery']),
    deliveryMethod: z.enum(['FROM_PLATFORM', 'FROM_ADMIN', 'FROM_AGENT']).optional(),
    sourceAgentId: z.string().optional(),
    notes: z.string().optional(),
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
                { error: 'Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const body = await request.json();
        const result = settlementActionSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400, headers: getSecurityHeaders() }
            );
        }

        const { settlementId, action, deliveryMethod, sourceAgentId, notes } = result.data;

        const settlement = await prisma.settlement.findUnique({
            where: { id: settlementId },
            include: { agent: { include: { user: true } } },
        });

        if (!settlement) {
            return NextResponse.json(
                { error: 'Settlement not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        const adminId = payload.userId;

        // ═══════════════════════════════════════════════════════════
        // APPROVE SETTLEMENT
        // ═══════════════════════════════════════════════════════════
        if (action === 'approve') {
            if (settlement.type === 'CASH_TO_CREDIT') {
                // Agent gives cash → receives digital credit
                const currency = settlement.currency || 'USD';
                const cashField = currency === 'SYP' ? 'cashCollectedSYP' : 'cashCollected';
                const creditField = currency === 'SYP' ? 'currentCreditSYP' : 'currentCredit';

                // ═══════════════════════════════════════════════════════════════
                // ATOMIC TRANSACTION - Prevents Race Condition
                // ═══════════════════════════════════════════════════════════════
                await prisma.$transaction(async (tx) => {
                    // Atomic balance check - only update if cash is sufficient
                    const updated = await tx.agentProfile.updateMany({
                        where: {
                            id: settlement.agentId,
                            [cashField]: { gte: settlement.cashCollected! }
                        },
                        data: {
                            [cashField]: { decrement: settlement.cashCollected! },
                            [creditField]: { increment: settlement.amountDue! },
                            totalSettlements: { increment: 1 },
                            lastSettlement: new Date(),
                        },
                    });

                    if (updated.count === 0) {
                        throw new Error('INSUFFICIENT_CASH');
                    }

                    await tx.settlement.update({
                        where: { id: settlementId },
                        data: {
                            status: 'COMPLETED',
                            reviewedBy: adminId,
                            reviewedAt: new Date(),
                            completedBy: adminId,
                            completedAt: new Date(),
                        },
                    });
                });

                // Notify agent
                const symbol = currency === 'SYP' ? 'ل.س' : '$';
                await prisma.notification.create({
                    data: {
                        userId: settlement.agent.userId,
                        type: 'SYSTEM',
                        title: 'Settlement Approved',
                        titleAr: 'تمت الموافقة على التسوية',
                        message: `Your cash to credit settlement of ${symbol}${settlement.requestedAmount?.toLocaleString()} has been approved. You received ${symbol}${settlement.amountDue?.toLocaleString()} credit.`,
                        messageAr: `تمت الموافقة على تحويل ${symbol}${settlement.requestedAmount?.toLocaleString()} نقد إلى رصيد. حصلت على ${symbol}${settlement.amountDue?.toLocaleString()} رصيد.`,
                    },
                });
            }
            else if (settlement.type === 'CREDIT_REQUEST') {
                // Agent requests additional credit (loan)
                const currency = settlement.currency || 'USD';

                if (currency === 'SYP') {
                    await prisma.agentProfile.update({
                        where: { id: settlement.agentId },
                        data: {
                            currentCreditSYP: { increment: settlement.creditGiven! },
                            pendingDebtSYP: { increment: settlement.creditGiven! },
                            totalSettlements: { increment: 1 },
                            lastSettlement: new Date(),
                        },
                    });
                } else {
                    await prisma.agentProfile.update({
                        where: { id: settlement.agentId },
                        data: {
                            currentCredit: { increment: settlement.creditGiven! },
                            pendingDebt: { increment: settlement.creditGiven! },
                            totalSettlements: { increment: 1 },
                            lastSettlement: new Date(),
                        },
                    });
                }

                await prisma.settlement.update({
                    where: { id: settlementId },
                    data: {
                        status: 'APPROVED',
                        reviewedBy: adminId,
                        reviewedAt: new Date(),
                    },
                });

                // Notify agent
                await prisma.notification.create({
                    data: {
                        userId: settlement.agent.userId,
                        type: 'SYSTEM',
                        title: 'Credit Request Approved',
                        titleAr: 'تمت الموافقة على طلب الرصيد',
                        message: `Your credit request of ${settlement.currency === 'SYP' ? 'ل.س' : '$'}${settlement.creditGiven} has been approved. Remember to repay this amount.`,
                        messageAr: `تمت الموافقة على طلب رصيد بقيمة ${settlement.currency === 'SYP' ? 'ل.س' : '$'}${settlement.creditGiven}. تذكر أن تسدد هذا المبلغ.`,
                    },
                });
            }
            else if (settlement.type === 'CASH_REQUEST') {
                // Agent requests physical cash
                if (!deliveryMethod) {
                    return NextResponse.json(
                        { error: 'Delivery method is required for cash requests' },
                        { status: 400, headers: getSecurityHeaders() }
                    );
                }

                const currency = settlement.currency || 'USD';

                // Deduct credit from requesting agent
                if (currency === 'SYP') {
                    await prisma.agentProfile.update({
                        where: { id: settlement.agentId },
                        data: {
                            currentCreditSYP: { decrement: settlement.creditDeducted! },
                        },
                    });
                } else {
                    await prisma.agentProfile.update({
                        where: { id: settlement.agentId },
                        data: {
                            currentCredit: { decrement: settlement.creditDeducted! },
                        },
                    });
                }

                // If FROM_AGENT, deduct cash from source agent
                if (deliveryMethod === 'FROM_AGENT' && sourceAgentId) {
                    if (currency === 'SYP') {
                        await prisma.agentProfile.update({
                            where: { id: sourceAgentId },
                            data: {
                                cashCollectedSYP: { decrement: settlement.cashToReceive! },
                            },
                        });
                    } else {
                        await prisma.agentProfile.update({
                            where: { id: sourceAgentId },
                            data: {
                                cashCollected: { decrement: settlement.cashToReceive! },
                            },
                        });
                    }
                }

                await prisma.settlement.update({
                    where: { id: settlementId },
                    data: {
                        status: 'APPROVED',
                        deliveryMethod,
                        sourceAgentId: deliveryMethod === 'FROM_AGENT' ? sourceAgentId : null,
                        deliveryStatus: 'PENDING',
                        deliveryNotes: notes,
                        reviewedBy: adminId,
                        reviewedAt: new Date(),
                    },
                });

                const deliveryMessages: Record<string, { en: string; ar: string }> = {
                    FROM_PLATFORM: { en: 'Cash will be available at platform office', ar: 'سيكون النقد متاحًا في مكتب المنصة' },
                    FROM_ADMIN: { en: 'Admin will deliver cash directly', ar: 'سيسلم المسؤول النقد مباشرة' },
                    FROM_AGENT: { en: 'Cash will be provided by another agent', ar: 'سيوفر وكيل آخر النقد' },
                };

                const deliveryMsg = deliveryMessages[deliveryMethod];

                const symbol = currency === 'SYP' ? 'ل.س' : '$';
                // Notify requesting agent
                await prisma.notification.create({
                    data: {
                        userId: settlement.agent.userId,
                        type: 'SYSTEM',
                        title: 'Cash Request Approved',
                        titleAr: 'تمت الموافقة على طلب النقد',
                        message: `Your cash request of ${symbol}${settlement.cashToReceive?.toLocaleString()} has been approved. ${deliveryMsg.en}.`,
                        messageAr: `تمت الموافقة على طلب نقد بقيمة ${symbol}${settlement.cashToReceive?.toLocaleString()}. ${deliveryMsg.ar}.`,
                    },
                });
            }
        }
        // ═══════════════════════════════════════════════════════════
        // REJECT SETTLEMENT
        // ═══════════════════════════════════════════════════════════
        else if (action === 'reject') {
            await prisma.settlement.update({
                where: { id: settlementId },
                data: {
                    status: 'REJECTED',
                    rejectionReason: notes,
                    reviewedBy: adminId,
                    reviewedAt: new Date(),
                },
            });

            // Notify agent
            await prisma.notification.create({
                data: {
                    userId: settlement.agent.userId,
                    type: 'SYSTEM',
                    title: 'Settlement Rejected',
                    titleAr: 'تم رفض التسوية',
                    message: `Your settlement request was rejected${notes ? `: ${notes}` : ''}`,
                    messageAr: `تم رفض طلب التسوية${notes ? `: ${notes}` : ''}`,
                },
            });
        }
        // ═══════════════════════════════════════════════════════════
        // CONFIRM DELIVERY (for CASH_REQUEST only)
        // ═══════════════════════════════════════════════════════════
        else if (action === 'confirm_delivery') {
            if (settlement.type !== 'CASH_REQUEST') {
                return NextResponse.json(
                    { error: 'Delivery confirmation is only for cash requests' },
                    { status: 400, headers: getSecurityHeaders() }
                );
            }

            const currency = settlement.currency || 'USD';

            // Add cash to requesting agent's balance
            if (currency === 'SYP') {
                await prisma.agentProfile.update({
                    where: { id: settlement.agentId },
                    data: {
                        cashCollectedSYP: { increment: settlement.cashToReceive! },
                        totalSettlements: { increment: 1 },
                        lastSettlement: new Date(),
                    },
                });
            } else {
                await prisma.agentProfile.update({
                    where: { id: settlement.agentId },
                    data: {
                        cashCollected: { increment: settlement.cashToReceive! },
                        totalSettlements: { increment: 1 },
                        lastSettlement: new Date(),
                    },
                });
            }

            await prisma.settlement.update({
                where: { id: settlementId },
                data: {
                    status: 'COMPLETED',
                    deliveryStatus: 'DELIVERED',
                    completedBy: adminId,
                    completedAt: new Date(),
                },
            });

            const symbol = currency === 'SYP' ? 'ل.س' : '$';
            // Notify agent
            await prisma.notification.create({
                data: {
                    userId: settlement.agent.userId,
                    type: 'SYSTEM',
                    title: 'Cash Delivered',
                    titleAr: 'تم تسليم النقد',
                    message: `Cash of ${symbol}${settlement.cashToReceive?.toLocaleString()} has been delivered to you.`,
                    messageAr: `تم تسليمك نقد بقيمة ${symbol}${settlement.cashToReceive?.toLocaleString()}.`,
                },
            });
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: adminId,
                action: `SETTLEMENT_${action.toUpperCase()}`,
                entity: 'Settlement',
                entityId: settlementId,
                newValue: JSON.stringify({ type: settlement.type, action, deliveryMethod, sourceAgentId }),
            },
        });

        return NextResponse.json(
            { success: true },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Settlement action error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
