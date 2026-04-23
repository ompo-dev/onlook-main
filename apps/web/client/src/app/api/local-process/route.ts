import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import {
    localGetProject,
    localGetProjectSettings,
    localSetProjectPreviewUrl,
} from '@/utils/local-mode/local-store';
import { DefaultSettings } from '@onlook/constants';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'child_process';
import { type NextRequest, NextResponse } from 'next/server';
import net from 'net';
import path from 'path';

export const runtime = 'nodejs';

type LocalProcessStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'error';

interface LocalProcessRecord {
    key: string;
    projectId: string | null;
    folderPath: string | null;
    command: string;
    port: number;
    previewUrl: string;
    status: LocalProcessStatus;
    output: string;
    process: ChildProcessWithoutNullStreams | null;
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

declare global {
    var __onlookLocalProcesses: Map<string, LocalProcessRecord> | undefined;
    var __onlookLocalProcessLocks: Map<string, Promise<LocalProcessRecord>> | undefined;
}

function getRegistry(): Map<string, LocalProcessRecord> {
    if (!globalThis.__onlookLocalProcesses) {
        globalThis.__onlookLocalProcesses = new Map<string, LocalProcessRecord>();
    }

    return globalThis.__onlookLocalProcesses;
}

function getLockRegistry(): Map<string, Promise<LocalProcessRecord>> {
    if (!globalThis.__onlookLocalProcessLocks) {
        globalThis.__onlookLocalProcessLocks = new Map<string, Promise<LocalProcessRecord>>();
    }

    return globalThis.__onlookLocalProcessLocks;
}

function getProcessKey(projectId: string | null | undefined, folderPath: string | null): string {
    if (projectId) {
        return `project:${projectId}`;
    }

    return `folder:${folderPath ?? 'unknown'}`;
}

function getPortFromUrl(url: string | null | undefined): number {
    if (!url) {
        return 3001;
    }

    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.port) {
            return Number.parseInt(parsedUrl.port, 10);
        }

        return parsedUrl.protocol === 'https:' ? 443 : 80;
    } catch {
        return 3001;
    }
}

function getPreviewUrlForPort(port: number): string {
    return `http://localhost:${port}`;
}

function getConfiguredOnlookPort(): number | null {
    const port = Number.parseInt(process.env.PORT ?? '', 10);
    return Number.isInteger(port) && port > 0 ? port : null;
}

function getRequestPort(req: NextRequest): number | null {
    try {
        const parsedUrl = new URL(req.url);
        if (parsedUrl.port) {
            return Number.parseInt(parsedUrl.port, 10);
        }
        return parsedUrl.protocol === 'https:' ? 443 : 80;
    } catch {
        return null;
    }
}

function getExcludedPorts(req?: NextRequest): Set<number> {
    const ports = new Set([8083]);
    const configuredPort = getConfiguredOnlookPort();
    if (configuredPort) {
        ports.add(configuredPort);
    }

    const requestPort = req ? getRequestPort(req) : null;
    if (requestPort) {
        ports.add(requestPort);
    }
    return ports;
}

function getCandidatePorts(preferredPort: number, excludedPorts = getExcludedPorts()): number[] {
    const nearbyPorts = Array.from({ length: 21 }, (_, index) => preferredPort - 10 + index);
    const nextPorts = Array.from({ length: 21 }, (_, index) => 3000 + index);
    const vitePorts = Array.from({ length: 16 }, (_, index) => 5173 + index);
    const candidates = [
        preferredPort,
        ...nearbyPorts,
        ...nextPorts,
        ...vitePorts,
        4173,
        4174,
        4321,
        8080,
    ];

    return Array.from(
        new Set(
            candidates.filter(
                (port) =>
                    Number.isInteger(port) &&
                    port > 0 &&
                    port <= 65535 &&
                    !excludedPorts.has(port),
            ),
        ),
    );
}

async function isPreviewServing(port: number): Promise<boolean> {
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        return false;
    }

    const checkHost = (host: string) =>
        new Promise<boolean>((resolve) => {
            const socket = net.createConnection({ host, port });

            const finish = (result: boolean) => {
                socket.removeAllListeners();
                if (!socket.destroyed) {
                    socket.destroy();
                }
                resolve(result);
            };

            socket.setTimeout(500);
            socket.once('connect', () => finish(true));
            socket.once('error', () => finish(false));
            socket.once('timeout', () => finish(false));
        });

    return (await checkHost('127.0.0.1')) || (await checkHost('localhost'));
}

async function detectRunningPreviewPort(
    preferredPort: number,
    excludedPorts = getExcludedPorts(),
): Promise<number | null> {
    const candidates = getCandidatePorts(preferredPort, excludedPorts);
    const results = await Promise.all(
        candidates.map(async (port) => ({
            port,
            isServing: await isPreviewServing(port),
        })),
    );
    const match = results.find((result) => result.isServing);
    if (match) {
        return match.port;
    }

    return null;
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRunningPreview(
    record: LocalProcessRecord,
    excludedPorts = getExcludedPorts(),
    timeoutMs = 6_000,
): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (await isPreviewServing(record.port)) {
            return;
        }

        const runningPort = await detectRunningPreviewPort(record.port, excludedPorts);
        if (runningPort) {
            updatePreviewPort(record, runningPort, 'detected running preview');
            return;
        }

        await wait(300);
    }
}

function extractPreviewPortFromOutput(
    output: string,
    excludedPorts = getExcludedPorts(),
): number | null {
    const patterns = [
        /https?:\/\/(?:localhost|127\.0\.0\.1):(\d{2,5})/i,
        /(?:port|PORT)\s*[:=]\s*(\d{2,5})/i,
        /started server on .*:(\d{2,5})/i,
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(output);
        const port = match?.[1] ? Number.parseInt(match[1], 10) : NaN;
        if (
            Number.isInteger(port) &&
            port > 0 &&
            port <= 65535 &&
            !excludedPorts.has(port)
        ) {
            return port;
        }
    }

    return null;
}

function appendOutput(record: LocalProcessRecord, chunk: string): void {
    if (!chunk) {
        return;
    }

    record.output = `${record.output}${chunk}`;

    if (record.output.length > 200_000) {
        record.output = record.output.slice(-200_000);
    }

    record.updatedAt = new Date().toISOString();
}

function updatePreviewPort(record: LocalProcessRecord, port: number, reason: string): void {
    if (record.port === port) {
        return;
    }

    const previousPort = record.port;
    record.port = port;
    record.previewUrl = getPreviewUrlForPort(port);
    record.updatedAt = new Date().toISOString();

    if (record.projectId) {
        localSetProjectPreviewUrl(record.projectId, record.previewUrl);
    }

    appendOutput(
        record,
        `[onlook] Preview port changed from ${previousPort} to ${port} (${reason})\n`,
    );
}

async function reuseRunningPreview(
    record: LocalProcessRecord,
    excludedPorts = getExcludedPorts(),
): Promise<boolean> {
    let runningPort: number | null = null;

    if (await isPreviewServing(record.port)) {
        runningPort = record.port;
    } else {
        runningPort = await detectRunningPreviewPort(record.port, excludedPorts);
    }

    if (!runningPort) {
        return false;
    }

    updatePreviewPort(record, runningPort, 'detected running preview');

    const statusChanged = record.status !== 'running';
    record.process = null;
    record.pid = null;
    record.exitCode = null;
    record.status = 'running';
    record.updatedAt = new Date().toISOString();

    if (statusChanged) {
        appendOutput(
            record,
            `[onlook] Reusing an existing preview server already listening on port ${record.port}\n`,
        );
    }

    return true;
}

function getStatusSummary(record: LocalProcessRecord): string {
    const baseLines = [
        `[onlook] Local preview status: ${record.status}`,
        `[onlook] Folder: ${record.folderPath ?? '(missing)'}`,
        `[onlook] Command: ${record.command || '(missing)'}`,
        `[onlook] Port: ${record.port}`,
        `[onlook] URL: ${record.previewUrl}`,
    ];

    if (!record.folderPath) {
        baseLines.push(
            '[onlook] The project folder is not configured, so Onlook cannot start the preview process.',
        );
    } else if (!path.isAbsolute(record.folderPath)) {
        baseLines.push('[onlook] The project folder path is invalid because it is not absolute.');
    } else if (record.status === 'idle') {
        baseLines.push('[onlook] The preview process has not started yet.');
    } else if (record.status === 'starting') {
        baseLines.push('[onlook] Onlook is starting the preview process.');
    } else if (record.status === 'running') {
        baseLines.push('[onlook] The preview process is running.');
    } else if (record.status === 'stopped') {
        baseLines.push('[onlook] The preview process is stopped.');
    } else if (record.status === 'error') {
        baseLines.push('[onlook] The preview process failed. Check the logs below for details.');
    }

    return `${baseLines.join('\n')}\n`;
}

function serializeRecord(record: LocalProcessRecord) {
    return {
        key: record.key,
        projectId: record.projectId,
        folderPath: record.folderPath,
        command: record.command,
        port: record.port,
        previewUrl: record.previewUrl,
        status: record.status,
        output: record.output || getStatusSummary(record),
        pid: record.pid,
        exitCode: record.exitCode,
        updatedAt: record.updatedAt,
    };
}

function resolveProjectConfig(projectId?: string | null, folderPath?: string | null) {
    const project = projectId ? localGetProject(projectId) : null;
    const settings = projectId ? localGetProjectSettings(projectId) : null;
    const resolvedFolderPath = folderPath ?? project?.folderPath ?? null;

    return {
        projectId: projectId ?? null,
        folderPath: resolvedFolderPath,
        command:
            settings?.commands.run?.trim() ||
            DefaultSettings.COMMANDS.run,
        port: getPortFromUrl(project?.sandboxUrl),
    };
}

function createStatusRecord(projectId?: string | null, folderPath?: string | null): LocalProcessRecord {
    const config = resolveProjectConfig(projectId, folderPath);

    return {
        key: getProcessKey(config.projectId, config.folderPath),
        projectId: config.projectId,
        folderPath: config.folderPath,
        command: config.command,
        port: config.port,
        previewUrl: getPreviewUrlForPort(config.port),
        status: 'idle',
        output: '',
        process: null,
        pid: null,
        exitCode: null,
        updatedAt: new Date().toISOString(),
    };
}

function stopProcess(record: LocalProcessRecord, message = '[onlook] Preview process stopped by Onlook\n'): void {
    const pid = record.process?.pid;

    if (pid) {
        if (process.platform === 'win32') {
            spawnSync('taskkill', ['/pid', String(pid), '/f', '/t'], {
                stdio: 'ignore',
                windowsHide: true,
            });
        } else {
            record.process?.kill('SIGTERM');
        }
    }

    record.process = null;
    record.pid = null;
    record.status = 'stopped';
    appendOutput(record, message);
}

async function ensureDevProcess(
    projectId?: string | null,
    folderPath?: string | null,
    excludedPorts = getExcludedPorts(),
): Promise<LocalProcessRecord> {
    const registry = getRegistry();
    const config = resolveProjectConfig(projectId, folderPath);
    const key = getProcessKey(config.projectId, config.folderPath);
    const existingRecord = registry.get(key) ?? createStatusRecord(config.projectId, config.folderPath);

    existingRecord.projectId = config.projectId;
    existingRecord.folderPath = config.folderPath;
    existingRecord.command = config.command;
    existingRecord.port = config.port;
    existingRecord.previewUrl = getPreviewUrlForPort(config.port);
    existingRecord.updatedAt = new Date().toISOString();

    if (!config.folderPath) {
        existingRecord.status = 'error';
        appendOutput(
            existingRecord,
            '[onlook] Local preview cannot start because the project folder is missing.\n',
        );
        registry.set(key, existingRecord);
        return existingRecord;
    }

    const resolvedFolderPath = config.folderPath;

    if (!path.isAbsolute(resolvedFolderPath)) {
        existingRecord.status = 'error';
        appendOutput(
            existingRecord,
            `[onlook] Invalid project folder path: ${resolvedFolderPath}\n`,
        );
        registry.set(key, existingRecord);
        return existingRecord;
    }

    if (existingRecord.process && !existingRecord.process.killed) {
        if (!(await isPreviewServing(existingRecord.port))) {
            const runningPort = await detectRunningPreviewPort(existingRecord.port, excludedPorts);
            if (runningPort) {
                updatePreviewPort(existingRecord, runningPort, 'detected running preview');
            } else {
                await waitForRunningPreview(existingRecord, excludedPorts, 3_000);
            }
        }
        return existingRecord;
    }

    if (await reuseRunningPreview(existingRecord, excludedPorts)) {
        registry.set(key, existingRecord);
        return existingRecord;
    }

    existingRecord.exitCode = null;
    existingRecord.status = 'starting';
    appendOutput(
        existingRecord,
        `[onlook] Starting local preview\n[onlook] Folder: ${resolvedFolderPath}\n[onlook] Command: ${config.command}\n[onlook] Port: ${config.port}\n`,
    );

    const child = spawn(config.command, [], {
        cwd: resolvedFolderPath,
        env: {
            ...process.env,
            PORT: String(config.port),
            BROWSER: 'none',
        },
        shell: true,
        windowsHide: true,
    });

    existingRecord.process = child;
    existingRecord.pid = child.pid ?? null;

    const handleOutput = (chunk: Buffer | string) => {
        const text = chunk.toString();
        appendOutput(existingRecord, text);
        const detectedPort = extractPreviewPortFromOutput(text, excludedPorts);
        if (detectedPort) {
            updatePreviewPort(existingRecord, detectedPort, 'dev server output');
        }
    };

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);

    child.on('spawn', () => {
        existingRecord.status = 'running';
        appendOutput(
            existingRecord,
            `[onlook] Preview process started (PID ${child.pid ?? 'unknown'})\n`,
        );
    });

    child.on('error', (error) => {
        existingRecord.status = 'error';
        existingRecord.process = null;
        existingRecord.pid = null;
        appendOutput(existingRecord, `[onlook] Failed to start preview: ${error.message}\n`);
    });

    child.on('exit', async (code, signal) => {
        existingRecord.process = null;
        existingRecord.pid = null;
        existingRecord.exitCode = code;
        appendOutput(
            existingRecord,
            `[onlook] Preview process exited with code ${code ?? 'null'}${signal ? ` (signal ${signal})` : ''}\n`,
        );

        if (await reuseRunningPreview(existingRecord, excludedPorts)) {
            return;
        }

        existingRecord.status = code === 0 ? 'stopped' : 'error';
    });

    registry.set(key, existingRecord);
    await waitForRunningPreview(existingRecord, excludedPorts);
    return existingRecord;
}

async function ensureDevProcessLocked(
    projectId?: string | null,
    folderPath?: string | null,
    excludedPorts = getExcludedPorts(),
): Promise<LocalProcessRecord> {
    const config = resolveProjectConfig(projectId, folderPath);
    const key = getProcessKey(config.projectId, config.folderPath);
    const locks = getLockRegistry();
    const existingLock = locks.get(key);
    if (existingLock) {
        return existingLock;
    }

    const lock = ensureDevProcess(projectId, folderPath, excludedPorts).finally(() => {
        locks.delete(key);
    });
    locks.set(key, lock);
    return lock;
}

async function runCommandOnce(
    command: string,
    projectId?: string | null,
    folderPath?: string | null,
) {
    const config = resolveProjectConfig(projectId, folderPath);

    if (!config.folderPath) {
        return {
            success: false,
            output: '',
            error: 'Local project folder is not configured',
        };
    }

    const resolvedFolderPath = config.folderPath;

    if (!path.isAbsolute(resolvedFolderPath)) {
        return {
            success: false,
            output: '',
            error: `Invalid project folder path: ${resolvedFolderPath}`,
        };
    }

    return await new Promise<{ success: boolean; output: string; error: string | null }>(
        (resolve) => {
            const child = spawn(command, [], {
                cwd: resolvedFolderPath,
                env: {
                    ...process.env,
                    PORT: String(config.port),
                    BROWSER: 'none',
                },
                shell: true,
                windowsHide: true,
            });

            let output = '';
            let finished = false;

            const timeoutId = setTimeout(() => {
                if (finished) {
                    return;
                }

                finished = true;

                if (process.platform === 'win32' && child.pid) {
                    spawnSync('taskkill', ['/pid', String(child.pid), '/f', '/t'], {
                        stdio: 'ignore',
                        windowsHide: true,
                    });
                } else {
                    child.kill('SIGTERM');
                }

                resolve({
                    success: false,
                    output,
                    error: 'Command timed out after 30 seconds',
                });
            }, 30_000);

            const finish = (result: { success: boolean; output: string; error: string | null }) => {
                if (finished) {
                    return;
                }

                finished = true;
                clearTimeout(timeoutId);
                resolve(result);
            };

            child.stdout.on('data', (chunk: Buffer | string) => {
                output += chunk.toString();
            });

            child.stderr.on('data', (chunk: Buffer | string) => {
                output += chunk.toString();
            });

            child.on('error', (error) => {
                finish({
                    success: false,
                    output,
                    error: error.message,
                });
            });

            child.on('close', (code) => {
                finish({
                    success: code === 0,
                    output,
                    error: code === 0 ? null : `Command exited with code ${code ?? 'null'}`,
                });
            });
        },
    );
}

export async function POST(req: NextRequest) {
    if (!LOCAL_MODE_ENABLED) {
        return NextResponse.json({ error: 'Not in local mode' }, { status: 403 });
    }

    try {
        const body = (await req.json()) as LocalProcessPayload;
        const { op, projectId, folderPath, command } = body;
        const excludedPorts = getExcludedPorts(req);
        const record = createStatusRecord(projectId, folderPath);
        const registry = getRegistry();

        if (op === 'ensure-dev') {
            return NextResponse.json(
                serializeRecord(await ensureDevProcessLocked(projectId, folderPath, excludedPorts)),
            );
        }

        if (op === 'status') {
            const currentRecord = registry.get(record.key) ?? createStatusRecord(projectId, folderPath);
            if (!currentRecord.process) {
                await reuseRunningPreview(currentRecord, excludedPorts);
            }
            registry.set(record.key, currentRecord);
            return NextResponse.json(
                serializeRecord(currentRecord),
            );
        }

        if (op === 'restart-dev') {
            const currentRecord = registry.get(record.key);
            if (currentRecord) {
                stopProcess(currentRecord, '[onlook] Restarting local preview\n');
            }

            return NextResponse.json(
                serializeRecord(await ensureDevProcessLocked(projectId, folderPath, excludedPorts)),
            );
        }

        if (op === 'stop-dev') {
            const currentRecord = registry.get(record.key) ?? createStatusRecord(projectId, folderPath);
            stopProcess(currentRecord);
            registry.set(record.key, currentRecord);
            return NextResponse.json(serializeRecord(currentRecord));
        }

        if (op === 'run-command') {
            const result = await runCommandOnce(command ?? '', projectId, folderPath);
            return NextResponse.json(result, { status: result.success ? 200 : 500 });
        }

        return NextResponse.json({ error: 'Unknown op' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
