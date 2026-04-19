import {
    Provider,
    ProviderBackgroundCommand,
    ProviderFileWatcher,
    ProviderTask,
    ProviderTerminal,
    type CopyFileOutput,
    type CopyFilesInput,
    type CreateDirectoryInput,
    type CreateDirectoryOutput,
    type CreateProjectInput,
    type CreateProjectOutput,
    type CreateSessionInput,
    type CreateSessionOutput,
    type CreateTerminalInput,
    type CreateTerminalOutput,
    type DeleteFilesInput,
    type DeleteFilesOutput,
    type DownloadFilesInput,
    type DownloadFilesOutput,
    type GetTaskInput,
    type GetTaskOutput,
    type GitStatusInput,
    type GitStatusOutput,
    type InitializeInput,
    type InitializeOutput,
    type ListFilesInput,
    type ListFilesOutput,
    type ListProjectsInput,
    type ListProjectsOutput,
    type PauseProjectInput,
    type PauseProjectOutput,
    type ProviderTerminalShellSize,
    type ReadFileInput,
    type ReadFileOutput,
    type RenameFileInput,
    type RenameFileOutput,
    type SetupInput,
    type SetupOutput,
    type StatFileInput,
    type StatFileOutput,
    type StopProjectInput,
    type StopProjectOutput,
    type TerminalBackgroundCommandInput,
    type TerminalBackgroundCommandOutput,
    type TerminalCommandInput,
    type TerminalCommandOutput,
    type WatchEvent,
    type WatchFilesInput,
    type WatchFilesOutput,
    type WriteFileInput,
    type WriteFileOutput,
} from '../../types';

type LocalProcessStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'error';

interface LocalProcessRecord {
    key: string;
    projectId: string | null;
    folderPath: string | null;
    command: string;
    port: number;
    status: LocalProcessStatus;
    output: string;
    pid: number | null;
    exitCode: number | null;
    updatedAt: string;
}

interface LocalProcessPayload {
    op: 'ensure-dev' | 'status' | 'restart-dev' | 'stop-dev' | 'run-command';
    projectId?: string | null;
    folderPath?: string | null;
    command?: string | null;
}

interface LocalCommandResult {
    success: boolean;
    output: string;
    error: string | null;
}

export interface NodeFsProviderOptions {
    folderPath?: string | null;
    projectId?: string | null;
}

export class NodeFsProvider extends Provider {
    private readonly folderPath: string | null;
    private readonly projectId: string | null;

    constructor(options: NodeFsProviderOptions) {
        super();
        this.folderPath = options.folderPath ?? null;
        this.projectId = options.projectId ?? null;
    }

    private async callFsApi(op: string, params: Record<string, string>): Promise<Response> {
        const search = new URLSearchParams({ op, base: this.folderPath ?? '', ...params });
        return fetch(`/api/local-fs?${search.toString()}`);
    }

    private async callProcessApi(payload: LocalProcessPayload): Promise<Response> {
        return fetch('/api/local-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: this.projectId,
                folderPath: this.folderPath,
                ...payload,
            }),
        });
    }

    async getProcessStatus(): Promise<LocalProcessRecord> {
        const response = await this.callProcessApi({ op: 'status' });
        if (!response.ok) {
            throw new Error(`Failed to read local process status (${response.status})`);
        }
        return (await response.json()) as LocalProcessRecord;
    }

    async ensureDevProcess(): Promise<LocalProcessRecord> {
        const response = await this.callProcessApi({ op: 'ensure-dev' });
        if (!response.ok) {
            throw new Error(`Failed to start local preview (${response.status})`);
        }
        return (await response.json()) as LocalProcessRecord;
    }

    async restartDevProcess(): Promise<LocalProcessRecord> {
        const response = await this.callProcessApi({ op: 'restart-dev' });
        if (!response.ok) {
            throw new Error(`Failed to restart local preview (${response.status})`);
        }
        return (await response.json()) as LocalProcessRecord;
    }

    async stopDevProcess(): Promise<LocalProcessRecord> {
        const response = await this.callProcessApi({ op: 'stop-dev' });
        if (!response.ok) {
            throw new Error(`Failed to stop local preview (${response.status})`);
        }
        return (await response.json()) as LocalProcessRecord;
    }

    async runLocalCommand(command: string): Promise<LocalCommandResult> {
        const response = await this.callProcessApi({
            op: 'run-command',
            command,
        });
        const result = (await response.json()) as LocalCommandResult;

        if (!response.ok) {
            throw new Error(result.error ?? result.output ?? `Command failed (${response.status})`);
        }

        return result;
    }

    async initialize(input: InitializeInput): Promise<InitializeOutput> {
        await this.ensureDevProcess();
        return {};
    }

    async writeFile(input: WriteFileInput): Promise<WriteFileOutput> {
        if (!this.folderPath) return { success: true };
        await fetch('/api/local-fs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                op: 'write',
                base: this.folderPath,
                path: input.args.path,
                content: typeof input.args.content === 'string' ? input.args.content : '',
            }),
        });
        return { success: true };
    }

    async renameFile(input: RenameFileInput): Promise<RenameFileOutput> {
        if (!this.folderPath) return {};
        await fetch('/api/local-fs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                op: 'rename',
                base: this.folderPath,
                path: input.args.oldPath,
                nextPath: input.args.newPath,
            }),
        });
        return {};
    }

    async statFile(input: StatFileInput): Promise<StatFileOutput> {
        if (!this.folderPath) {
            return {
                type: 'file',
            };
        }

        const response = await this.callFsApi('stat', { path: input.args.path });
        if (!response.ok) {
            return {
                type: 'file',
            };
        }

        const data = (await response.json()) as { type?: 'file' | 'directory' };
        return {
            type: data.type ?? 'file',
        };
    }

    async deleteFiles(input: DeleteFilesInput): Promise<DeleteFilesOutput> {
        if (!this.folderPath) return {};
        await fetch('/api/local-fs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                op: 'delete',
                base: this.folderPath,
                path: input.args.path,
            }),
        });
        return {};
    }

    async listFiles(input: ListFilesInput): Promise<ListFilesOutput> {
        if (!this.folderPath) return { files: [] };
        try {
            const res = await this.callFsApi('list', { path: input.args.path });
            if (!res.ok) return { files: [] };
            const data = (await res.json()) as { files: { name: string; type: string }[] };
            return {
                files: (data.files ?? []).map((file) => ({
                    name: file.name,
                    type: file.type as 'file' | 'directory',
                    isSymlink: false,
                })),
            };
        } catch {
            return { files: [] };
        }
    }

    async readFile(input: ReadFileInput): Promise<ReadFileOutput> {
        const empty = {
            file: {
                path: input.args.path,
                content: '',
                type: 'text' as const,
                toString: () => '',
            },
        };
        if (!this.folderPath) return empty;
        try {
            const res = await this.callFsApi('read', { path: input.args.path });
            if (!res.ok) return empty;
            const data = (await res.json()) as { content: string };
            const content = data.content ?? '';
            return {
                file: {
                    path: input.args.path,
                    content,
                    type: 'text' as const,
                    toString: () => content,
                },
            };
        } catch {
            return empty;
        }
    }

    async downloadFiles(input: DownloadFilesInput): Promise<DownloadFilesOutput> {
        return {
            url: '',
        };
    }

    async copyFiles(input: CopyFilesInput): Promise<CopyFileOutput> {
        return {};
    }

    async createDirectory(input: CreateDirectoryInput): Promise<CreateDirectoryOutput> {
        if (!this.folderPath) return {};
        await fetch('/api/local-fs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ op: 'mkdir', base: this.folderPath, path: input.args.path }),
        });
        return {};
    }

    async watchFiles(input: WatchFilesInput): Promise<WatchFilesOutput> {
        return {
            watcher: new NodeFsFileWatcher(),
        };
    }

    async createTerminal(input: CreateTerminalInput): Promise<CreateTerminalOutput> {
        return {
            terminal: new NodeFsTerminal(this),
        };
    }

    async getTask(input: GetTaskInput): Promise<GetTaskOutput> {
        return {
            task: new NodeFsTask(this, input.args.id),
        };
    }

    async runCommand(input: TerminalCommandInput): Promise<TerminalCommandOutput> {
        const result = await this.runLocalCommand(input.args.command);
        return {
            output: result.output,
        };
    }

    async runBackgroundCommand(
        input: TerminalBackgroundCommandInput,
    ): Promise<TerminalBackgroundCommandOutput> {
        return {
            command: new NodeFsCommand(this, input.args.command),
        };
    }

    async gitStatus(input: GitStatusInput): Promise<GitStatusOutput> {
        return {
            changedFiles: [],
        };
    }

    async setup(input: SetupInput): Promise<SetupOutput> {
        return {};
    }

    async createSession(input: CreateSessionInput): Promise<CreateSessionOutput> {
        return {};
    }

    async reload(): Promise<boolean> {
        const record = await this.restartDevProcess();
        return record.status === 'starting' || record.status === 'running';
    }

    async reconnect(): Promise<void> {
        const status = await this.getProcessStatus();
        if (status.status === 'running' || status.status === 'starting') {
            return;
        }
        await this.ensureDevProcess();
    }

    async ping(): Promise<boolean> {
        try {
            const status = await this.getProcessStatus();
            return status.status === 'running' || status.status === 'starting';
        } catch {
            return false;
        }
    }

    static async createProject(input: CreateProjectInput): Promise<CreateProjectOutput> {
        return {
            id: input.id,
        };
    }

    static async createProjectFromGit(input: {
        repoUrl: string;
        branch: string;
    }): Promise<CreateProjectOutput> {
        throw new Error('createProjectFromGit not implemented for NodeFs provider');
    }

    async pauseProject(input: PauseProjectInput): Promise<PauseProjectOutput> {
        await this.stopDevProcess();
        return {};
    }

    async stopProject(input: StopProjectInput): Promise<StopProjectOutput> {
        await this.stopDevProcess();
        return {};
    }

    async listProjects(input: ListProjectsInput): Promise<ListProjectsOutput> {
        return {};
    }

    async destroy(): Promise<void> {
        // Keep the local dev process alive across page transitions.
    }
}

export class NodeFsFileWatcher extends ProviderFileWatcher {
    start(input: WatchFilesInput): Promise<void> {
        return Promise.resolve();
    }

    stop(): Promise<void> {
        return Promise.resolve();
    }

    registerEventCallback(callback: (event: WatchEvent) => Promise<void>): void {
        // Local mode currently relies on manual refresh.
    }
}

export class NodeFsTerminal extends ProviderTerminal {
    constructor(private readonly provider: NodeFsProvider) {
        super();
    }

    get id(): string {
        return 'local-terminal';
    }

    get name(): string {
        return 'Local Terminal';
    }

    async open(dimensions?: ProviderTerminalShellSize): Promise<string> {
        const status = await this.provider.getProcessStatus();
        return status.output;
    }

    async write(input: string, dimensions?: ProviderTerminalShellSize): Promise<void> {
        await this.provider.runLocalCommand(input);
    }

    async run(input: string, dimensions?: ProviderTerminalShellSize): Promise<void> {
        await this.provider.runLocalCommand(input);
    }

    kill(): Promise<void> {
        return Promise.resolve();
    }

    onOutput(callback: (data: string) => void): () => void {
        return () => {};
    }
}

export class NodeFsTask extends ProviderTask {
    private lastOutput = '';
    private currentCommand = '';
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private listeners = new Set<(data: string) => void>();

    constructor(
        private readonly provider: NodeFsProvider,
        private readonly taskId: string,
    ) {
        super();
    }

    get id(): string {
        return this.taskId;
    }

    get name(): string {
        return 'Local Preview';
    }

    get command(): string {
        return this.currentCommand || 'Starting local preview...';
    }

    private emit(delta: string): void {
        if (!delta) {
            return;
        }

        this.listeners.forEach((listener) => listener(delta));
    }

    private syncStatus(record: LocalProcessRecord): void {
        this.currentCommand = record.command;

        if (!record.output) {
            return;
        }

        if (record.output.startsWith(this.lastOutput)) {
            const delta = record.output.slice(this.lastOutput.length);
            this.lastOutput = record.output;
            this.emit(delta);
            return;
        }

        this.lastOutput = record.output;
        this.emit(record.output);
    }

    private startPolling(): void {
        if (this.intervalId) {
            return;
        }

        this.intervalId = setInterval(async () => {
            try {
                const record = await this.provider.getProcessStatus();
                this.syncStatus(record);
            } catch (error) {
                this.emit(
                    `[onlook] Failed to read local preview status: ${
                        error instanceof Error ? error.message : String(error)
                    }\n`,
                );
            }
        }, 1000);
    }

    private stopPollingIfIdle(): void {
        if (this.listeners.size > 0 || !this.intervalId) {
            return;
        }

        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    async open(dimensions?: ProviderTerminalShellSize): Promise<string> {
        let record = await this.provider.getProcessStatus();
        if (record.status === 'idle') {
            record = await this.provider.ensureDevProcess();
        }
        this.currentCommand = record.command;
        this.lastOutput = record.output;
        this.startPolling();
        return record.output;
    }

    async run(): Promise<void> {
        const record = await this.provider.ensureDevProcess();
        this.syncStatus(record);
        this.startPolling();
    }

    async restart(): Promise<void> {
        const record = await this.provider.restartDevProcess();
        this.syncStatus(record);
        this.startPolling();
    }

    async stop(): Promise<void> {
        const record = await this.provider.stopDevProcess();
        this.syncStatus(record);
    }

    onOutput(callback: (data: string) => void): () => void {
        this.listeners.add(callback);
        this.startPolling();

        return () => {
            this.listeners.delete(callback);
            this.stopPollingIfIdle();
        };
    }
}

export class NodeFsCommand extends ProviderBackgroundCommand {
    private output = '';

    constructor(
        private readonly provider: NodeFsProvider,
        private readonly backgroundCommand: string,
    ) {
        super();
    }

    get name(): string {
        return 'Local Command';
    }

    get command(): string {
        return this.backgroundCommand;
    }

    async open(): Promise<string> {
        return this.output;
    }

    async restart(): Promise<void> {
        const result = await this.provider.runLocalCommand(this.backgroundCommand);
        this.output = result.output;
    }

    kill(): Promise<void> {
        return Promise.resolve();
    }

    onOutput(callback: (data: string) => void): () => void {
        return () => {};
    }
}
