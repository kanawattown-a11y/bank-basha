import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSecurityHeaders } from '@/lib/auth/security';

export async function GET(request: NextRequest) {
    try {
        // Get all active agents
        const agents = await prisma.agentProfile.findMany({
            where: { isActive: true },
            select: {
                id: true,
                agentCode: true,
                businessName: true,
                businessNameAr: true,
                businessAddress: true,
                latitude: true,
                longitude: true,
            },
            take: 20,
        });

        return NextResponse.json(
            {
                agents: agents.map(agent => ({
                    id: agent.id,
                    agentCode: agent.agentCode,
                    businessName: agent.businessNameAr || agent.businessName,
                    businessAddress: agent.businessAddress,
                    latitude: agent.latitude,
                    longitude: agent.longitude,
                })),
            },
            { status: 200, headers: getSecurityHeaders() }
        );
    } catch (error) {
        console.error('Nearby agents error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: getSecurityHeaders() }
        );
    }
}
