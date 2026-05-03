import '@/styles/globals.css';
import '@onlook/ui/globals.css';

import RB2BLoader from '@/components/rb2b-loader';
import { TelemetryProvider } from '@/components/telemetry-provider';
import { env } from '@/env';
import { FeatureFlagsProvider } from '@/hooks/use-feature-flags';
import { TRPCReactProvider } from '@/trpc/react';
import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import { Toaster } from '@onlook/ui/sonner';
import { type Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { ThemeProvider } from './_components/theme';

const isProduction = env.NODE_ENV === 'production';

export const metadata: Metadata = {
    title: 'Onlook Studio',
    description: 'Projeto aberto no editor.',
    icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();

    return (
        <html lang={locale} className={inter.variable} suppressHydrationWarning>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body suppressHydrationWarning>
                {isProduction && !LOCAL_MODE_ENABLED && (
                    <>
                        <Script src="https://z.onlook.com/cdn-cgi/zaraz/i.js" strategy="lazyOnload" />
                        <RB2BLoader />
                    </>
                )}
                <TRPCReactProvider>
                    <FeatureFlagsProvider>
                        <TelemetryProvider>
                            <ThemeProvider
                                attribute="class"
                                forcedTheme="dark"
                                enableSystem
                                disableTransitionOnChange
                            >
                                <NextIntlClientProvider>
                                    {children}
                                    <Toaster />
                                </NextIntlClientProvider>
                            </ThemeProvider>
                        </TelemetryProvider>
                    </FeatureFlagsProvider>
                </TRPCReactProvider>
            </body>
        </html>
    );
}
