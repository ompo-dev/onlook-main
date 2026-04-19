import { getServerSupabaseUser } from '@/utils/local-mode/server';
import { Routes } from "@/utils/constants";
import { checkUserSubscriptionAccess } from "@/utils/subscription";
import { redirect } from "next/navigation";

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const user = await getServerSupabaseUser();
    if (!user) {
        redirect(Routes.LOGIN);
    }

    // Check if user has an active subscription
    const { hasActiveSubscription, hasLegacySubscription } = await checkUserSubscriptionAccess(
        user.id,
        user.email,
    );

    // If no subscription, redirect to demo page
    if (!hasActiveSubscription && !hasLegacySubscription) {
        redirect(Routes.DEMO_ONLY);
    }

    return <>{children}</>;
}
