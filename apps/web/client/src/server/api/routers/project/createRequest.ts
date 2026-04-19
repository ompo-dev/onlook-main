import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import {
    projectCreateRequests
} from '@onlook/db';
import { ProjectCreateRequestStatus } from '@onlook/models';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const projectCreateRequestRouter = createTRPCRouter({
    getPendingRequest: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) return null;
            const request = await ctx.db.query.projectCreateRequests.findFirst({
                where: and(
                    eq(projectCreateRequests.projectId, input.projectId),
                    eq(projectCreateRequests.status, ProjectCreateRequestStatus.PENDING),
                ),
            });
            return request ?? null;
        }),
    updateStatus: protectedProcedure
        .input(z.object({
            projectId: z.string(),
            status: z.nativeEnum(ProjectCreateRequestStatus),
        }))
        .mutation(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) return;
            await ctx.db.update(projectCreateRequests).set({
                status: input.status,
            }).where(
                eq(projectCreateRequests.projectId, input.projectId),
            ).returning();
        }),
});