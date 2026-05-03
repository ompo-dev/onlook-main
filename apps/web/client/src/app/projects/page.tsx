import { ACTIVE_PROJECT_ROUTE } from '@/utils/constants';
import { redirect } from 'next/navigation';

const Page = () => {
    redirect(ACTIVE_PROJECT_ROUTE);
};

export default Page;
