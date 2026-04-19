import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import { CodeProvider, createCodeProviderClient, getStaticCodeProvider, NodeFsProvider, type Provider } from '@onlook/code-provider';
import { v4 as uuidv4 } from 'uuid';

export async function forkBuildSandbox(
    sandboxId: string,
    userId: string,
    deploymentId: string,
): Promise<{ provider: Provider; sandboxId: string }> {
    if (LOCAL_MODE_ENABLED) {
        const localId = `local-${uuidv4()}`;
        const provider = new NodeFsProvider({});
        return { provider, sandboxId: localId };
    }

    const CodesandboxProvider = await getStaticCodeProvider(CodeProvider.CodeSandbox);
    const project = await CodesandboxProvider.createProject({
        source: 'template',
        id: sandboxId,
        title: 'Deployment Fork of ' + sandboxId,
        description: 'Forked sandbox for deployment',
        tags: ['deployment', 'preview', userId, deploymentId],
    });

    const forkedProvider = await createCodeProviderClient(CodeProvider.CodeSandbox, {
        providerOptions: {
            codesandbox: {
                sandboxId: project.id,
                userId,
                initClient: true,
            },
        },
    });

    return {
        provider: forkedProvider,
        sandboxId: project.id,
    };
}
