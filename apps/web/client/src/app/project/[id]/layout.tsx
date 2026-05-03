import { api } from "@/trpc/server";
import { SUPPORT_EMAIL } from "@onlook/constants";
import Link from "next/link";

export default async function Layout({ params, children }: Readonly<{ params: Promise<{ id: string }>, children: React.ReactNode }>) {
    const projectId = (await params).id;
    const hasAccess = await api.project.hasAccess({ projectId });
    if (!hasAccess) {
        return <NoAccess />;
    }
    return <>{children}</>;
}

const NoAccess = () => {
    return (
        <main className="flex flex-1 flex-col items-center justify-center h-screen w-screen p-4 text-center">
            <div className="space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground-primary">Access denied</h1>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground-primary">{`Please contact the project owner to request access.`}</h2>
                    <p className="text-foreground-secondary">
                        {`Please email `}
                        <Link href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
                            {SUPPORT_EMAIL}
                        </Link>
                        {` if you believe this is an error.`}
                    </p>
                </div>
            </div>
        </main>
    );
};
