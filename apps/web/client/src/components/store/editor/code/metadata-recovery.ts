import type { Provider } from '@onlook/code-provider';
import type { CodeFileSystem, JsxElementMetadata } from '@onlook/file-system';

const CODE_FILE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
const EXCLUDED_PROVIDER_DIRECTORIES = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo'];

export async function recoverJsxMetadataForOid(
    codeEditor: CodeFileSystem,
    provider: Provider | null | undefined,
    oid: string,
): Promise<JsxElementMetadata | undefined> {
    let metadata = await codeEditor.getJsxElementMetadata(oid);
    if (metadata) {
        return metadata;
    }

    await codeEditor.rebuildIndex();
    metadata = await codeEditor.getJsxElementMetadata(oid);
    if (metadata) {
        return metadata;
    }

    if (!provider) {
        return undefined;
    }

    const providerPath = await findProviderFileByOid(provider, oid);
    if (!providerPath) {
        return undefined;
    }

    const result = await provider.readFile({ args: { path: providerPath } });
    if (result.file.type !== 'text' || typeof result.file.content !== 'string') {
        return undefined;
    }

    await codeEditor.writeFile(providerPath, result.file.content);
    await codeEditor.rebuildIndex();
    return codeEditor.getJsxElementMetadata(oid);
}

async function findProviderFileByOid(
    provider: Provider,
    oid: string,
    directory = './',
): Promise<string | null> {
    const { files } = await provider.listFiles({ args: { path: directory } });

    for (const file of files) {
        const nextPath = directory === './' ? file.name : `${directory}/${file.name}`;
        const normalizedPath = nextPath.replace(/\\/g, '/').replace(/^\.\//, '');

        if (EXCLUDED_PROVIDER_DIRECTORIES.some((segment) => normalizedPath.split('/').includes(segment))) {
            continue;
        }

        if (file.type === 'directory') {
            const nestedPath = await findProviderFileByOid(provider, oid, normalizedPath);
            if (nestedPath) {
                return nestedPath;
            }
            continue;
        }

        if (!CODE_FILE_EXTENSIONS.some((extension) => normalizedPath.endsWith(extension))) {
            continue;
        }

        try {
            const result = await provider.readFile({ args: { path: normalizedPath } });
            if (
                result.file.type === 'text' &&
                typeof result.file.content === 'string' &&
                result.file.content.includes(`data-oid="${oid}"`)
            ) {
                return normalizedPath;
            }
        } catch (error) {
            console.warn(`Failed to inspect provider file ${normalizedPath}:`, error);
        }
    }

    return null;
}
