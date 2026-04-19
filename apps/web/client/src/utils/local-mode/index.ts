import { env } from '@/env';
import { SEED_USER } from '@onlook/db';
import type { UsageResult } from '@onlook/models';
import {
    PriceKey,
    ProductType,
    SubscriptionStatus,
    type Subscription,
} from '@onlook/stripe';

export const LOCAL_MODE_ENABLED = env.NEXT_PUBLIC_LOCAL_MODE;

export const LOCAL_MODE_USER = {
    id: SEED_USER.ID,
    firstName: SEED_USER.FIRST_NAME,
    lastName: SEED_USER.LAST_NAME,
    displayName: SEED_USER.DISPLAY_NAME,
    email: SEED_USER.EMAIL,
    avatarUrl: SEED_USER.AVATAR_URL,
} as const;

export const LOCAL_MODE_SUBSCRIPTION: Subscription = {
    id: 'local-subscription',
    status: SubscriptionStatus.ACTIVE,
    startedAt: new Date('2024-01-01T00:00:00.000Z'),
    endedAt: null,
    product: {
        name: 'Onlook Local',
        type: ProductType.PRO,
        stripeProductId: 'local-product',
    },
    price: {
        id: 'local-price',
        productId: 'local-product',
        key: PriceKey.PRO_MONTHLY_TIER_11,
        monthlyMessageLimit: 99999,
        stripePriceId: 'local-price',
    },
    scheduledChange: null,
    stripeSubscriptionId: 'local-subscription',
    stripeSubscriptionItemId: 'local-subscription-item',
    stripeCustomerId: 'local-customer',
};

export const LOCAL_MODE_USAGE: UsageResult = {
    daily: {
        period: 'day',
        usageCount: 0,
        limitCount: 99999,
    },
    monthly: {
        period: 'month',
        usageCount: 0,
        limitCount: 99999,
    },
};
