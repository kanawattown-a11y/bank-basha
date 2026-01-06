/**
 * Prisma Middleware for Soft Delete
 * Automatically excludes soft-deleted records from queries
 */

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Models that support soft delete
 */
const SOFT_DELETE_MODELS = [
    'user',
    'service',
    'agentProfile',
    'merchantProfile',
    'merchantRequest'
];

/**
 * Initialize soft delete middleware
 * Call this once when app starts
 */
export function initializeSoftDeleteMiddleware() {
    prisma.$use(async (params, next) => {
        // Only apply to soft-delete models
        if (!SOFT_DELETE_MODELS.includes(params.model || '')) {
            return next(params);
        }

        // Exclude soft-deleted records from queries
        if (params.action === 'findUnique' || params.action === 'findFirst') {
            // Change findUnique to findFirst with combined where clause
            params.action = 'findFirst';
            params.args.where = {
                ...params.args.where,
                deletedAt: null,
            };
        }

        if (params.action === 'findMany') {
            if (params.args.where) {
                // Check if query explicitly includes deleted records
                if (params.args.where.deletedAt === undefined) {
                    params.args.where = {
                        ...params.args.where,
                        deletedAt: null,
                    };
                }
            } else {
                params.args.where = { deletedAt: null };
            }
        }

        // For update/updateMany, prevent updating deleted records
        if (params.action === 'update' || params.action === 'updateMany') {
            params.args.where = {
                ...params.args.where,
                deletedAt: null,
            };
        }

        // For delete, convert to soft delete (update deletedAt)
        if (params.action === 'delete') {
            params.action = 'update';
            params.args.data = {
                deletedAt: new Date(),
            };
        }

        if (params.action === 'deleteMany') {
            params.action = 'updateMany';
            if (params.args.data !== undefined) {
                params.args.data.deletedAt = new Date();
            } else {
                params.args.data = { deletedAt: new Date() };
            }
        }

        return next(params);
    });

    console.log('✅ Soft delete middleware initialized');
}
