'use client';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { ExternalRoutes } from '@/utils/constants';
import { AuthModal } from './auth-modal';
import { Hero } from './hero';
import { ContributorSection } from './landing-page/contributor-section';
import { CTASection } from './landing-page/cta-section';
import { FAQSection } from './landing-page/faq-section';
import { ResponsiveMockupSection } from './landing-page/responsive-mockup-section';
import { TestimonialsSection } from './landing-page/testimonials-section';
import { WhatCanOnlookDoSection } from './landing-page/what-can-onlook-do-section';
import { WebsiteLayout } from './website-layout';

export function LandingContent() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                <div className="w-screen h-screen flex items-center justify-center" id="hero">
                    <Hero />
                </div>
                <ResponsiveMockupSection />
                <WhatCanOnlookDoSection />
                <ContributorSection />
                <TestimonialsSection />
                <FAQSection />
                <CTASection href={ExternalRoutes.BOOK_DEMO} />
                <AuthModal />
                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
