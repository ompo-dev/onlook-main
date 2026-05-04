import { env } from '@/env';
import { SEED_USER } from '@onlook/db';

export const LOCAL_MODE_ENABLED = env.NEXT_PUBLIC_LOCAL_MODE;

export const LOCAL_MODE_USER = {
    id: SEED_USER.ID,
    firstName: SEED_USER.FIRST_NAME,
    lastName: SEED_USER.LAST_NAME,
    displayName: SEED_USER.DISPLAY_NAME,
    email: SEED_USER.EMAIL,
    avatarUrl: SEED_USER.AVATAR_URL,
} as const;
