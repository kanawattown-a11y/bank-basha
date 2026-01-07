import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken, getSecurityHeaders } from '@/lib/auth/security';
import { cookies } from 'next/headers';

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

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const action = searchParams.get('action') || undefined;
        const entity = searchParams.get('entity') || undefined;
        const userId = searchParams.get('userId') || undefined;
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const where: any = {};

        if (action) where.action = { contains: action };
        if (entity) where.entity = entity;
        if (userId) where.userId = userId;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.auditLog.count({ where }),
        ]);

        // Get user names for display
        const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds as string[] } },
            select: { id: true, fullName: true, fullNameAr: true, phone: true },
        });
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));

        // Enrich logs with user info
        const enrichedLogs = logs.map(log => ({
            ...log,
            user: log.userId ? userMap[log.userId] : null,
        }));

        return NextResponse.json({
            logs: enrichedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        }, { headers: getSecurityHeaders() });

    } catch (error) {
        console.error('Audit logs error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
