import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import { Routes } from '@/utils/constants';
import { redirect } from 'next/navigation';
import { LandingContent } from './_components/landing-content';

export default function Main() {
    if (LOCAL_MODE_ENABLED) {
        redirect(Routes.PROJECTS);
    }

    return <LandingContent />;
}
