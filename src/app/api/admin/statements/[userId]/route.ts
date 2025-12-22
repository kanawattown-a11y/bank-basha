import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { generateStatement, getStatementFilename, StatementData } from '@/lib/pdf/statement-generator';
import { cookies } from 'next/headers';
import arMessages from '@/messages/ar.json';
import enMessages from '@/messages/en.json';

// Admin can generate statement for any user
export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
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

        const targetUserId = params.userId;

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get('month');
        const yearParam = searchParams.get('year');

        // Default to current month if not specified
        const now = new Date();
        const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1;
        const year = yearParam ? parseInt(yearParam) : now.getFullYear();

        // Get target user with wallet
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            include: {
                wallet: true,
                merchantProfile: true,
                agentProfile: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: getSecurityHeaders() }
            );
        }

        // Get date range for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // Get transactions for the month
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { senderId: user.id },
                    { receiverId: user.id },
                ],
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'COMPLETED',
            },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { fullName: true } },
                receiver: { select: { fullName: true } },
            },
        });

        // Calculate running balance and totals
        let totalIncoming = 0;
        let totalOutgoing = 0;
        let totalFees = 0;

        const currentBalance = user.wallet?.balance || 0;

        // Calculate balance change this month
        const allTxThisMonth = await prisma.transaction.findMany({
            where: {
                OR: [
                    { senderId: user.id },
                    { receiverId: user.id },
                ],
                createdAt: { gte: startDate },
                status: 'COMPLETED',
            },
        });

        let balanceChange = 0;
        allTxThisMonth.forEach(tx => {
            const isIncoming = tx.receiverId === user.id;
            if (isIncoming) {
                balanceChange += tx.amount;
            } else {
                balanceChange -= (tx.amount + (tx.fee || 0));
            }
        });

        const openingBalance = currentBalance - balanceChange;

        // Process transactions with running balance
        let runningBalance = openingBalance;
        const processedTransactions = transactions.map(tx => {
            const isIncoming = tx.receiverId === user.id;

            if (isIncoming) {
                runningBalance += tx.amount;
                totalIncoming += tx.amount;
            } else {
                runningBalance -= (tx.amount + (tx.fee || 0));
                totalOutgoing += tx.amount;
                totalFees += tx.fee || 0;
            }

            return {
                id: tx.id,
                referenceNumber: tx.referenceNumber,
                date: tx.createdAt,
                type: tx.type,
                description: tx.descriptionAr || tx.description || '',
                amount: tx.amount,
                fee: tx.fee || 0,
                isIncoming,
                balance: runningBalance,
            };
        });

        // Determine user type
        let userType: 'USER' | 'MERCHANT' | 'AGENT' = 'USER';
        if (user.userType === 'MERCHANT') userType = 'MERCHANT';
        if (user.userType === 'AGENT') userType = 'AGENT';

        // Prepare statement data
        const statementData: StatementData = {
            userId: user.id,
            fullName: user.fullName,
            fullNameAr: user.fullNameAr || undefined,
            phone: user.phone,
            email: user.email || undefined,
            userType,

            businessName: user.merchantProfile?.businessName || user.agentProfile?.businessName || undefined,
            businessNameAr: user.merchantProfile?.businessNameAr || user.agentProfile?.businessNameAr || undefined,
            merchantCode: user.merchantProfile?.merchantCode || undefined,
            agentCode: user.agentProfile?.agentCode || undefined,

            month,
            year,

            openingBalance,
            closingBalance: runningBalance,

            transactions: processedTransactions,

            totalIncoming,
            totalOutgoing,
            totalFees,
            transactionCount: transactions.length,

            labels: (cookieStore.get('NEXT_LOCALE')?.value === 'en' ? enMessages : arMessages).pdf,
        };

        // Generate PDF
        const pdfBuffer = await generateStatement(statementData);
        const filename = getStatementFilename(statementData);

        // Return PDF - Convert to Buffer for NextResponse
        return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                ...getSecurityHeaders(),
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'private, no-cache',
            },
        });

    } catch (error) {
        console.error('Admin statement generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate statement' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
