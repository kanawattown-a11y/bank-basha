import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders } from '@/lib/auth/security';
import { verifyAuth, hasRole } from '@/lib/auth/verify-session';
import { initializeAllAccounts } from '@/lib/financial/core-ledger';

/**
 * POST /api/admin/init-ledger
 * Initialize all required ledger accounts
 * Only accessible by ADMIN users
 */
export async function POST(request: NextRequest) {
    try {
        // Verify admin authentication
        const auth = await verifyAuth(request);

        if (!auth.success || !hasRole(auth.user, ['ADMIN'])) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        // Initialize all accounts
        await initializeAllAccounts();

        // Verify they were created
        const ledgerCount = await prisma.ledgerAccount.count();
        const internalCount = await prisma.internalAccount.count();

        return NextResponse.json(
            {
                success: true,
                message: 'Ledger accounts initialized successfully',
                ledgerAccounts: ledgerCount,
                internalAccounts: internalCount,
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Init ledger error:', error);
        return NextResponse.json(
            { error: 'Failed to initialize ledger accounts', details: String(error) },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}

/**
 * GET /api/admin/init-ledger
 * Check if ledger accounts exist
 */
export async function GET(request: NextRequest) {
    try {
        const auth = await verifyAuth(request);

        if (!auth.success || !hasRole(auth.user, ['ADMIN'])) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403, headers: getSecurityHeaders() }
            );
        }

        const ledgerAccounts = await prisma.ledgerAccount.findMany({
            select: { code: true, name: true, balance: true },
        });

        const internalAccounts = await prisma.internalAccount.findMany({
            select: { code: true, name: true },
        });

        return NextResponse.json({
            ledgerAccounts,
            internalAccounts,
            isInitialized: ledgerAccounts.length >= 7 && internalAccounts.length >= 7,
        }, { headers: getSecurityHeaders() });
    } catch (error) {
        console.error('Check ledger error:', error);
        return NextResponse.json(
            { error: 'Failed to check ledger accounts' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
