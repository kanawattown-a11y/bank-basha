import { prisma } from './prisma';

/**
 * Soft delete a record by setting deletedAt and deletedBy
 */
export async function softDelete(params: {
    model: 'user' | 'service' | 'agentProfile' | 'merchantProfile';
    id: string;
    deletedBy: string;
    reason?: string;
}) {
    const { model, id, deletedBy, reason } = params;

    // Get the record before deletion for snapshot
    const record = await (prisma[model] as any).findUnique({
        where: { id },
    });

    if (!record) {
        throw new Error(`${model} not found`);
    }

    // Create deleted item snapshot
    await prisma.deletedItem.create({
        data: {
            itemType: model.toUpperCase(),
            itemId: id,
            itemData: JSON.stringify(record),
            deletedBy,
        },
    });

    // Update record with soft delete
    return await (prisma[model] as any).update({
        where: { id },
        data: {
            deletedAt: new Date(),
            deletedBy,
        },
    });
}

/**
 * Restore a soft-deleted record
 */
export async function restore(params: {
    model: 'user' | 'service' | 'agentProfile' | 'merchantProfile';
    id: string;
}) {
    const { model, id } = params;

    // Clear deletedAt and deletedBy
    const restored = await (prisma[model] as any).update({
        where: { id },
        data: {
            deletedAt: null,
            deletedBy: null,
        },
    });

    // Remove from deleted items tracking
    await prisma.deletedItem.deleteMany({
        where: {
            itemType: model.toUpperCase(),
            itemId: id,
        },
    });

    return restored;
}

/**
 * Permanently delete a record (hard delete)
 */
export async function permanentDelete(params: {
    model: 'user' | 'service' | 'agentProfile' | 'merchantProfile';
    id: string;
}) {
    const { model, id } = params;

    // Delete from deleted items tracking
    await prisma.deletedItem.deleteMany({
        where: {
            itemType: model.toUpperCase(),
            itemId: id,
        },
    });

    // Hard delete the record
    return await (prisma[model] as any).delete({
        where: { id },
    });
}

/**
 * Get all deleted items with optional filtering
 */
export async function getDeletedItems(params?: {
    itemType?: string;
    limit?: number;
    offset?: number;
}) {
    const { itemType, limit = 50, offset = 0 } = params || {};

    const where: any = {};
    if (itemType) {
        where.itemType = itemType;
    }

    return await prisma.deletedItem.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
        take: limit,
        skip: offset,
    });
}

/**
 * Query modifier to exclude soft-deleted items
 */
export function withoutDeleted<T extends { deletedAt?: Date | null }>(query: any) {
    return {
        ...query,
        where: {
            ...query.where,
            deletedAt: null,
        },
    };
}
