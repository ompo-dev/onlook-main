import { getServerSupabaseUser } from '@/utils/local-mode/server';
import { Routes } from '@/utils/constants';
import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ImportGithubProjectProvider } from './_context';

export const metadata: Metadata = {
    title: 'Onlook',
    description: 'Onlook – Import Github Project',
};

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const user = await getServerSupabaseUser();
    if (!user) {
        redirect(Routes.LOGIN);
    }
    return (
        <ImportGithubProjectProvider totalSteps={3}>{children}</ImportGithubProjectProvider>
    );
}
