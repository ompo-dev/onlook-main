import { getRequestSupabaseUser } from '@/utils/local-mode/server';
import { type Usage } from '@onlook/models';
import { type NextRequest } from 'next/server';

const UNLIMITED_USAGE: Usage = {
    period: 'month',
    usageCount: 0,
    limitCount: Number.MAX_SAFE_INTEGER,
};

export const checkMessageLimit = async (_req: NextRequest): Promise<{
    exceeded: boolean;
    usage: Usage;
}> => {
    return {
        exceeded: false,
        usage: UNLIMITED_USAGE,
    };
};

export const getSupabaseUser = async (request: NextRequest) => {
    return getRequestSupabaseUser(request);
};

export const incrementUsage = async (
    _req: NextRequest,
    _traceId?: string,
): Promise<{
    usageRecordId: string | undefined;
    rateLimitId: string | undefined;
} | null> => {
    return null;
};

export const decrementUsage = async (
    _req: NextRequest,
    _usageRecord: {
        usageRecordId: string | undefined;
        rateLimitId: string | undefined;
    } | null,
): Promise<void> => {
    return;
};
