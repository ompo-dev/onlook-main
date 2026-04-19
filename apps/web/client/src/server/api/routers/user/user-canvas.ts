import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import { localGetProjectWithCanvas } from '@/utils/local-mode/local-store';
import {
    canvases,
    createDefaultUserCanvas,
    projects,
    fromDbCanvas,
    fromDbFrame,
    userCanvases,
    userCanvasUpdateSchema,
    type UserCanvas
} from '@onlook/db';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const userCanvasRouter = createTRPCRouter({
    get: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) {
                const data = localGetProjectWithCanvas(input.projectId, ctx.user.id);
                if (!data) throw new Error('User canvas not found');
                return {
                    id: data.canvas.id,
                    scale: Number(data.canvas.scale),
                    position: { x: Number(data.canvas.x), y: Number(data.canvas.y) },
                    userId: ctx.user.id,
                };
            }
            const userCanvas = await ctx.db.query.userCanvases.findFirst({
                where: and(
                    eq(canvases.projectId, input.projectId),
                    eq(userCanvases.userId, ctx.user.id),
                ),
                with: {
                    canvas: true,
                },
            });

            if (!userCanvas) {
                throw new Error('User canvas not found');
            }
            return fromDbCanvas(userCanvas);
        }),
    getWithFrames: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) {
                const data = localGetProjectWithCanvas(input.projectId, ctx.user.id);
                if (!data) return null;
                return {
                    userCanvas: {
                        id: data.canvas.id,
                        scale: Number(data.canvas.scale),
                        position: { x: Number(data.canvas.x), y: Number(data.canvas.y) },
                        userId: ctx.user.id,
                    },
                    frames: data.frames.map((f) => ({
                        id: f.id,
                        canvasId: f.canvasId,
                        branchId: f.branchId,
                        url: f.url || data.project.sandboxUrl || '',
                        position: { x: Number(f.x ?? 120), y: Number(f.y ?? 120) },
                        dimension: { width: Number(f.width), height: Number(f.height) },
                    })),
                };
            }
            const dbCanvas = await ctx.db.query.canvases.findFirst({
                where: eq(canvases.projectId, input.projectId),
                with: {
                    frames: true,
                    userCanvases: {
                        where: eq(userCanvases.userId, ctx.user.id),
                    },
                },
            });
            if (!dbCanvas) {
                return null;
            }
            const userCanvas: UserCanvas = dbCanvas.userCanvases[0] ?? createDefaultUserCanvas(ctx.user.id, dbCanvas.id);
            return {
                userCanvas: fromDbCanvas(userCanvas),
                frames: dbCanvas.frames.map(fromDbFrame),
            };
        }),
    update: protectedProcedure.input(
        z.object({
            projectId: z.string(),
            canvasId: z.string(),
            canvas: userCanvasUpdateSchema,
        })).mutation(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) return true;
            try {
                await ctx.db
                    .update(userCanvases)
                    .set(input.canvas)
                    .where(
                        and(
                            eq(userCanvases.canvasId, input.canvasId),
                            eq(userCanvases.userId, ctx.user.id),
                        ),
                    );
                await ctx.db.update(projects).set({
                    updatedAt: new Date(),
                }).where(eq(projects.id, input.projectId));
                return true;
            } catch (error) {
                console.error('Error updating user canvas', error);
                return false;
            }
        }),
});
