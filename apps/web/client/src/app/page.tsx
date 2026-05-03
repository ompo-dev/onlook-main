import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import { ACTIVE_PROJECT_ROUTE } from '@/utils/constants';
import { redirect } from 'next/navigation';

export default function Main() {
    if (LOCAL_MODE_ENABLED) {
        redirect(ACTIVE_PROJECT_ROUTE);
    }

    redirect(ACTIVE_PROJECT_ROUTE);
}
