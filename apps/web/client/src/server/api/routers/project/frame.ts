import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import {
    localCreateFrame,
    localDeleteFrame,
    localGetFrame,
    localGetFramesByCanvasId,
    localUpdateFrame,
} from '@/utils/local-mode/local-store';
import { frameInsertSchema, frames, frameUpdateSchema, fromDbFrame } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

const toFrame = (f: ReturnType<typeof localGetFrame>) => {
    if (!f) return null;
    return {
        id: f.id,
        canvasId: f.canvasId,
        branchId: f.branchId,
        url: f.url,
        position: { x: Number(f.x), y: Number(f.y) },
        dimension: { width: Number(f.width), height: Number(f.height) },
    };
};

export const frameRouter = createTRPCRouter({
    get: protectedProcedure
        .input(
            z.object({
                frameId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) return toFrame(localGetFrame(input.frameId));
            const dbFrame = await ctx.db.query.frames.findFirst({
                where: eq(frames.id, input.frameId),
            });
            if (!dbFrame) {
                return null;
            }
            return fromDbFrame(dbFrame);
        }),
    getByCanvas: protectedProcedure
        .input(
            z.object({
                canvasId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) {
                return localGetFramesByCanvasId(input.canvasId).map((f) => toFrame(f)!);
            }
            const dbFrames = await ctx.db.query.frames.findMany({
                where: eq(frames.canvasId, input.canvasId),
                orderBy: (frames, { asc }) => [asc(frames.x), asc(frames.y)],
            });
            return dbFrames.map((frame) => fromDbFrame(frame));
        }),
    create: protectedProcedure
        .input(frameInsertSchema)
        .mutation(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) {
                try {
                    localCreateFrame({
                        id: input.id ?? '',
                        canvasId: input.canvasId ?? '',
                        branchId: input.branchId ?? '',
                        url: input.url ?? '',
                        x: input.x ?? '0',
                        y: input.y ?? '0',
                        width: input.width ?? '1200',
                        height: input.height ?? '800',
                        type: input.type ?? 'desktop',
                    });
                    return true;
                } catch (error) {
                    console.error('Error creating frame locally', error);
                    return false;
                }
            }
            try {
                await ctx.db.insert(frames).values(input);
                return true;
            } catch (error) {
                console.error('Error creating frame', error);
                return false;
            }
        }),
    update: protectedProcedure
        .input(frameUpdateSchema)
        .mutation(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) {
                try {
                    const updates: Parameters<typeof localUpdateFrame>[1] = {};
                    if (input.url != null) updates.url = input.url;
                    if (input.x != null) updates.x = input.x;
                    if (input.y != null) updates.y = input.y;
                    if (input.width != null) updates.width = input.width;
                    if (input.height != null) updates.height = input.height;
                    localUpdateFrame(input.id, updates);
                    return true;
                } catch (error) {
                    console.error('Error updating frame locally', error);
                    return false;
                }
            }
            try {
                await ctx.db
                    .update(frames)
                    .set(input)
                    .where(
                        eq(frames.id, input.id)
                    );
                return true;
            } catch (error) {
                console.error('Error updating frame', error);
                return false;
            }
        }),
    delete: protectedProcedure
        .input(
            z.object({
                frameId: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            if (LOCAL_MODE_ENABLED) {
                localDeleteFrame(input.frameId);
                return true;
            }
            try {
                await ctx.db.delete(frames).where(eq(frames.id, input.frameId));
                return true;
            } catch (error) {
                console.error('Error deleting frame', error);
                return false;
            }
        }),
});
