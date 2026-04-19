import 'server-only';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient as createRequestSupabaseClient } from '@/utils/supabase/request-server';
import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';
import { userInsertSchema, users } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import type { User } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { LOCAL_MODE_ENABLED, LOCAL_MODE_USER } from '.';

const LOCAL_MODE_USER_METADATA = {
    name: LOCAL_MODE_USER.displayName,
    display_name: LOCAL_MODE_USER.displayName,
    full_name: LOCAL_MODE_USER.displayName,
    first_name: LOCAL_MODE_USER.firstName,
    last_name: LOCAL_MODE_USER.lastName,
    avatar_url: LOCAL_MODE_USER.avatarUrl,
    avatarUrl: LOCAL_MODE_USER.avatarUrl,
};

export async function ensureLocalModeUser(): Promise<User> {
    const adminClient = createAdminClient();
    const existingAuthUser = await adminClient.auth.admin.getUserById(LOCAL_MODE_USER.id);

    let authUser = existingAuthUser.data.user;

    if (!authUser) {
        const createdAuthUser = await adminClient.auth.admin.createUser({
            id: LOCAL_MODE_USER.id,
            email: LOCAL_MODE_USER.email,
            password: 'local-mode-password',
            email_confirm: true,
            user_metadata: LOCAL_MODE_USER_METADATA,
        });

        if (!createdAuthUser.data.user) {
            throw new Error(createdAuthUser.error?.message ?? 'Failed to create local mode auth user');
        }

        authUser = createdAuthUser.data.user;
    }

    await db
        .insert(users)
        .values(
            userInsertSchema.parse({
                id: LOCAL_MODE_USER.id,
                firstName: LOCAL_MODE_USER.firstName,
                lastName: LOCAL_MODE_USER.lastName,
                displayName: LOCAL_MODE_USER.displayName,
                email: LOCAL_MODE_USER.email,
                avatarUrl: LOCAL_MODE_USER.avatarUrl,
            }),
        )
        .onConflictDoUpdate({
            target: users.id,
            set: {
                firstName: LOCAL_MODE_USER.firstName,
                lastName: LOCAL_MODE_USER.lastName,
                displayName: LOCAL_MODE_USER.displayName,
                email: LOCAL_MODE_USER.email,
                avatarUrl: LOCAL_MODE_USER.avatarUrl,
                updatedAt: new Date(),
            },
        });

    return authUser;
}

export function buildLocalUser(): User {
    return {
        id: LOCAL_MODE_USER.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: LOCAL_MODE_USER.email,
        email_confirmed_at: '2024-01-01T00:00:00.000Z',
        phone: '',
        confirmed_at: '2024-01-01T00:00:00.000Z',
        last_sign_in_at: '2024-01-01T00:00:00.000Z',
        app_metadata: { provider: 'local', providers: ['local'] },
        user_metadata: {
            name: LOCAL_MODE_USER.displayName,
            display_name: LOCAL_MODE_USER.displayName,
            full_name: LOCAL_MODE_USER.displayName,
            first_name: LOCAL_MODE_USER.firstName,
            last_name: LOCAL_MODE_USER.lastName,
            avatar_url: LOCAL_MODE_USER.avatarUrl,
            avatarUrl: LOCAL_MODE_USER.avatarUrl,
        },
        identities: [],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        is_anonymous: false,
    } as User;
}

export async function getServerSupabaseUser(): Promise<User | null> {
    if (LOCAL_MODE_ENABLED) {
        return buildLocalUser();
    }

    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
}

export async function getRequestSupabaseUser(request: NextRequest): Promise<User | null> {
    if (LOCAL_MODE_ENABLED) {
        return buildLocalUser();
    }

    const supabase = await createRequestSupabaseClient(request);
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
}

export async function isKnownAppUser(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    return !!user;
}
