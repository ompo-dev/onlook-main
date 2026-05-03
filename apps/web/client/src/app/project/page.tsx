import { ACTIVE_PROJECT_ROUTE } from "@/utils/constants";
import { redirect } from "next/navigation";

export default function Page() {
    redirect(ACTIVE_PROJECT_ROUTE);
}
