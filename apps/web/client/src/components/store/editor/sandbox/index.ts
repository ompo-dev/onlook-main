import { CodeProviderSync } from '@/services/sync-engine/sync-engine';
import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import { normalizeLocalFolderPath } from '@/utils/local-mode/path';
import type { Provider } from '@onlook/code-provider';
import { EXCLUDED_SYNC_PATHS, ONLOOK_PRELOAD_SCRIPT_SRC } from '@onlook/constants';
import type { CodeFileSystem } from '@onlook/file-system';
import { type FileEntry } from '@onlook/file-system';
import { RouterType, type Branch, type RouterConfig } from '@onlook/models';
import { getAstFromContent, getContentFromAst, t, traverse } from '@onlook/parser';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';
import type { ErrorManager } from '../error';
import { GitManager } from '../git';
import { detectRouterConfig } from '../pages/helper';
import { copyPreloadScriptToPublic, getLayoutPath as detectLayoutPath } from './preload-script';
import { SessionManager } from './session';

const APP_ROUTER_PATHS = ['src/app', 'app'];
const PAGES_ROUTER_PATHS = ['src/pages', 'pages'];
const ALLOWED_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

async function stripInjectedPreloadScript(content: string): Promise<string> {
    const ast = getAstFromContent(content, { logErrors: false });
    if (!ast) {
        return content;
    }

    let removedScript = false;

    traverse(ast, {
        JSXElement(path) {
            if (!t.isJSXIdentifier(path.node.openingElement.name, { name: 'Script' })) {
                return;
            }

            const srcAttribute = path.node.openingElement.attributes.find(
                (attribute) =>
                    t.isJSXAttribute(attribute) &&
                    t.isJSXIdentifier(attribute.name, { name: 'src' }) &&
                    t.isStringLiteral(attribute.value, { value: ONLOOK_PRELOAD_SCRIPT_SRC }),
            );

            if (!srcAttribute) {
                return;
            }

            removedScript = true;
            path.remove();
        },
    });

    if (!removedScript) {
        return content;
    }

    let hasRemainingScriptUsage = false;

    traverse(ast, {
        JSXElement(path) {
            if (t.isJSXIdentifier(path.node.openingElement.name, { name: 'Script' })) {
                hasRemainingScriptUsage = true;
                path.stop();
            }
        },
    });

    if (!hasRemainingScriptUsage) {
        traverse(ast, {
            ImportDeclaration(path) {
                if (
                    !t.isStringLiteral(path.node.source, { value: 'next/script' }) ||
                    !path.node.specifiers.some(
                        (specifier) =>
                            t.isImportDefaultSpecifier(specifier) &&
                            t.isIdentifier(specifier.local, { name: 'Script' }),
                    )
                ) {
                    return;
                }

                path.remove();
                path.stop();
            },
        });
    }

    return getContentFromAst(ast, content);
}

export enum PreloadScriptState {
    NOT_INJECTED = 'not-injected',
    LOADING = 'loading',
    INJECTED = 'injected'
}
export class SandboxManager {
    readonly session: SessionManager;
    readonly gitManager: GitManager;
    private providerReactionDisposer?: () => void;
    private sync: CodeProviderSync | null = null;
    preloadScriptState: PreloadScriptState = PreloadScriptState.NOT_INJECTED
    routerConfig: RouterConfig | null = null;

    constructor(
        private branch: Branch,
        private readonly editorEngine: EditorEngine,
        private readonly errorManager: ErrorManager,
        private readonly fs: CodeFileSystem,
    ) {
        this.session = new SessionManager(this.branch, this.errorManager);
        this.gitManager = new GitManager(this);
        makeAutoObservable(this);
    }

    async init() {
        // Start connection asynchronously (don't wait)
        if (!this.session.provider) {
            this.session.start(this.branch.sandbox.id).catch(err => {
                console.error('[SandboxManager] Initial connection failed:', err);
                // Don't throw - let reaction handle retries/reconnects
            });
        }

        // React to provider becoming available (now or later)
        this.providerReactionDisposer = reaction(
            () => this.session.provider,
            async (provider) => {
                if (provider) {
                    await this.initializeSyncEngine(provider);
                    await this.gitManager.init();
                } else if (this.sync) {
                    // If the provider is null, release the sync engine reference
                    this.sync.release();
                    this.sync = null;
                }
            },
            { fireImmediately: true },
        );
    }

    async getRouterConfig(): Promise<RouterConfig | null> {
        if (!!this.routerConfig) {
            return this.routerConfig;
        }

        if (LOCAL_MODE_ENABLED) {
            this.routerConfig = await this.detectRouterConfigFromFs();
            if (this.routerConfig) {
                return this.routerConfig;
            }
        }

        if (!this.session.provider) {
            throw new Error('Provider not initialized');
        }
        this.routerConfig = await detectRouterConfig(this.session.provider);
        return this.routerConfig;
    }

    async initializeSyncEngine(provider: Provider) {
        if (this.sync) {
            this.sync.release();
            this.sync = null;
        }

        const localFolderPath = normalizeLocalFolderPath(this.branch.sandbox.folderPath);
        const shouldStartSync = !LOCAL_MODE_ENABLED || !!localFolderPath;

        if (LOCAL_MODE_ENABLED && localFolderPath) {
            await this.seedCodeFileSystemFromProvider(provider);
            await this.syncInstrumentedFilesToProvider(provider);
        }

        if (shouldStartSync) {
            this.sync = CodeProviderSync.getInstance(provider, this.fs, this.branch.sandbox.id, {
                exclude: EXCLUDED_SYNC_PATHS,
            });

            await this.sync.start();
        }

        await this.ensurePreloadScriptExists();
        await this.fs.rebuildIndex();
        void this.editorEngine.pages.scanPages();
        void this.editorEngine.theme.scanConfig();
        void this.editorEngine.font.scanFonts();
    }

    private shouldMirrorProviderPath(path: string): boolean {
        return !EXCLUDED_SYNC_PATHS.some((excludedPath) => {
            return (
                path === excludedPath ||
                path.startsWith(`${excludedPath}/`) ||
                path.split('/').includes(excludedPath)
            );
        });
    }

    private async listProviderFiles(
        provider: Provider,
        directory = './',
    ): Promise<Array<{ path: string; type: 'file' | 'directory' }>> {
        const { files } = await provider.listFiles({ args: { path: directory } });
        const entries: Array<{ path: string; type: 'file' | 'directory' }> = [];

        for (const file of files) {
            const nextPath = directory === './' ? file.name : `${directory}/${file.name}`;
            const normalizedPath = nextPath.replace(/\\/g, '/').replace(/^\.\//, '');

            if (!this.shouldMirrorProviderPath(normalizedPath)) {
                continue;
            }

            entries.push({ path: normalizedPath, type: file.type });

            if (file.type === 'directory') {
                const nestedEntries = await this.listProviderFiles(provider, normalizedPath);
                entries.push(...nestedEntries);
            }
        }

        return entries;
    }

    private async seedCodeFileSystemFromProvider(provider: Provider): Promise<void> {
        const existingEntries = await this.fs.listAll();
        const existingPaths = new Set(existingEntries.map((entry) => entry.path.replace(/^\//, '')));

        const providerEntries = await this.listProviderFiles(provider);
        let seededCount = 0;

        for (const entry of providerEntries) {
            if (existingPaths.has(entry.path)) {
                continue;
            }

            if (entry.type === 'directory') {
                await this.fs.createDirectory(entry.path);
                existingPaths.add(entry.path);
                seededCount++;
                continue;
            }

            const file = await provider.readFile({ args: { path: entry.path } });
            await this.fs.writeFile(entry.path, file.file.content);
            existingPaths.add(entry.path);
            seededCount++;
        }

        if (seededCount > 0) {
            console.log(
                `[SandboxManager] Seeded ${seededCount} missing provider entries into the local code editor`,
            );
        }
    }

    private async syncInstrumentedFilesToProvider(provider: Provider): Promise<void> {
        const entries = await this.fs.listAll();
        const codeFiles = entries.filter(
            (entry) =>
                entry.type === 'file' &&
                ALLOWED_EXTENSIONS.some((extension) => entry.path.endsWith(extension)),
        );

        let syncedCount = 0;

        for (const entry of codeFiles) {
            const processedContent = await this.fs.readFile(entry.path);
            if (typeof processedContent !== 'string') {
                continue;
            }

            const providerPath = entry.path.startsWith('/') ? entry.path.slice(1) : entry.path;
            const contentToWrite = await stripInjectedPreloadScript(processedContent);

            if (!contentToWrite.includes('data-oid')) {
                continue;
            }

            let existingContent: string | Uint8Array | null = null;

            try {
                const existing = await provider.readFile({ args: { path: providerPath } });
                existingContent = existing.file.content;
            } catch {
                existingContent = null;
            }

            if (typeof existingContent === 'string' && existingContent === contentToWrite) {
                continue;
            }

            await provider.writeFile({
                args: {
                    path: providerPath,
                    content: contentToWrite,
                    overwrite: true,
                },
            });
            syncedCount++;
        }

        if (syncedCount > 0) {
            console.log(
                `[SandboxManager] Synced ${syncedCount} instrumented files to local project source`,
            );
        }
    }

    private async detectRouterConfigFromFs(): Promise<RouterConfig | null> {
        for (const appPath of APP_ROUTER_PATHS) {
            try {
                const entries = await this.fs.readDirectory(appPath);
                const hasLayout = entries.some(
                    (entry) =>
                        !entry.isDirectory &&
                        entry.name.startsWith('layout.') &&
                        ALLOWED_EXTENSIONS.some((extension) => entry.name.endsWith(extension)),
                );

                if (hasLayout) {
                    return { type: RouterType.APP, basePath: appPath };
                }
            } catch {
                // ignore missing paths
            }
        }

        for (const pagesPath of PAGES_ROUTER_PATHS) {
            try {
                const entries = await this.fs.readDirectory(pagesPath);
                const hasIndex = entries.some(
                    (entry) =>
                        !entry.isDirectory &&
                        entry.name.startsWith('index.') &&
                        ALLOWED_EXTENSIONS.some((extension) => entry.name.endsWith(extension)),
                );

                if (hasIndex) {
                    return { type: RouterType.PAGES, basePath: pagesPath };
                }
            } catch {
                // ignore missing paths
            }
        }

        return null;
    }

    private async ensurePreloadScriptExists(): Promise<void> {
        if (this.preloadScriptState !== PreloadScriptState.NOT_INJECTED) {
            return;
        }

        this.preloadScriptState = PreloadScriptState.LOADING;

        if (LOCAL_MODE_ENABLED) {
            // Proxy server injects the script into HTML responses; nothing to copy
            this.preloadScriptState = PreloadScriptState.INJECTED;
            return;
        }

        try {
            if (!this.session.provider) {
                throw new Error('No provider available for preload script injection');
            }

            const routerConfig = await this.getRouterConfig();
            if (!routerConfig) {
                throw new Error('No router config found for preload script injection');
            }

            await copyPreloadScriptToPublic(this.session.provider, routerConfig);
            this.preloadScriptState = PreloadScriptState.INJECTED;
        } catch (error) {
            console.error('[SandboxManager] Failed to ensure preload script exists:', error);
            this.preloadScriptState = PreloadScriptState.INJECTED;
        }
    }

    async getLayoutPath(): Promise<string | null> {
        const routerConfig = await this.getRouterConfig();
        if (!routerConfig) {
            return null;
        }
        return detectLayoutPath(routerConfig, (path) => this.fileExists(path));
    }

    get errors() {
        return this.errorManager.errors;
    }

    get syncEngine() {
        return this.sync;
    }

    async readFile(path: string): Promise<string | Uint8Array> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.readFile(path);
    }

    async writeFile(path: string, content: string | Uint8Array): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.writeFile(path, content);
    }

    listAllFiles() {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.listAll();
    }

    async readDir(dir: string): Promise<FileEntry[]> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.readDirectory(dir);
    }

    async listFilesRecursively(dir: string): Promise<string[]> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.listFiles(dir);
    }

    async fileExists(path: string): Promise<boolean> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs?.exists(path);
    }

    async copyFile(path: string, targetPath: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.copyFile(path, targetPath);
    }

    async copyDirectory(path: string, targetPath: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.copyDirectory(path, targetPath);
    }

    async deleteFile(path: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.deleteFile(path);
    }

    async deleteDirectory(path: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.deleteDirectory(path);
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        if (!this.fs) throw new Error('File system not initialized');
        return this.fs.moveFile(oldPath, newPath);
    }

    // Download the code as a zip
    async downloadFiles(
        projectName?: string,
    ): Promise<{ downloadUrl: string; fileName: string } | null> {
        if (!this.session.provider) {
            console.error('No sandbox provider found for download');
            return null;
        }
        try {
            const { url } = await this.session.provider.downloadFiles({
                args: {
                    path: './',
                },
            });
            return {
                // in case there is no URL provided then the code must be updated
                // to handle this case
                downloadUrl: url ?? '',
                fileName: `${projectName ?? 'onlook-project'}-${Date.now()}.zip`,
            };
        } catch (error) {
            console.error('Error generating download URL:', error);
            return null;
        }
    }

    clear() {
        this.providerReactionDisposer?.();
        this.providerReactionDisposer = undefined;
        this.sync?.release();
        this.sync = null;
        this.preloadScriptState = PreloadScriptState.NOT_INJECTED
        this.session.clear();
    }
}
