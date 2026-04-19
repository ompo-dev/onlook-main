import { getServerSupabaseUser } from '@/utils/local-mode/server';
import { type Metadata } from 'next';
import { HandleAuth } from './_components/auth';

export const metadata: Metadata = {
    title: 'Onlook',
    description: 'Onlook – Invitation',
};

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const user = await getServerSupabaseUser();
    if (!user) {
        return <HandleAuth />;
    }
    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center">
            {children}
        </div>
    );
}
