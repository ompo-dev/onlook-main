import { env } from "@/env";
import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import { PostHog, type EventMessage } from "posthog-node";

class PostHogSingleton {
    private static instance: PostHog | null = null;
    private constructor() { }

    public static getInstance(): PostHog | null {
        if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
            console.warn('PostHog key not found');
            return null;
        }
        if (!PostHogSingleton.instance) {
            PostHogSingleton.instance = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
                host: env.NEXT_PUBLIC_POSTHOG_HOST,
                flushAt: 1,
                flushInterval: 0,
            });
        }
        return PostHogSingleton.instance;
    }
}

const client = PostHogSingleton.getInstance();

export const trackEvent = (props: EventMessage) => {
    if (LOCAL_MODE_ENABLED) {
        return;
    }

    try {
        client?.capture(props);
    } catch (error) {
        console.error('Error tracking event:', error);
    }
};
