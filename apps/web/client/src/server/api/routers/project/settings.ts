import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import {
    localDeleteProjectSettings,
    localGetProjectSettings,
    localUpsertProjectSettings,
} from '@/utils/local-mode/local-store';
import {
    projectSettings,
    projectSettingsInsertSchema,
    fromDbProjectSettings
} from '@onlook/db';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const settingsRouter = createTRPCRouter({
    get: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) {
                return localGetProjectSettings(input.projectId);
            }
            const setting = await ctx.db.query.projectSettings.findFirst({
                where: eq(projectSettings.projectId, input.projectId),
            });
            if (!setting) {
                return null;
            }
            return fromDbProjectSettings(setting);
        }),
    upsert: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
                settings: projectSettingsInsertSchema,
            }),
        )
        .mutation(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) {
                return localUpsertProjectSettings(input.projectId, {
                    commands: {
                        run: input.settings.runCommand,
                        build: input.settings.buildCommand,
                        install: input.settings.installCommand,
                    },
                });
            }
            const [updatedSettings] = await ctx.db
                .insert(projectSettings)
                .values(input)
                .onConflictDoUpdate({
                    target: [projectSettings.projectId],
                    set: input.settings,
                })
                .returning();
            if (!updatedSettings) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update project settings',
                });
            }
            return fromDbProjectSettings(updatedSettings);
        }),
    delete: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) return localDeleteProjectSettings(input.projectId);
            await ctx.db
                .delete(projectSettings)
                .where(eq(projectSettings.projectId, input.projectId));
            return true;
        }),
});
