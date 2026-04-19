import 'server-only';

import { DefaultSettings } from '@onlook/constants';
import type { ProjectSettings } from '@onlook/models';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { normalizeLocalFolderPath } from './path';
import { normalizeLocalPreviewUrl, resolveLocalPreviewFrameUrl } from './preview-url';

const STORE_DIR = path.join(os.homedir(), '.onlook');
const STORE_PATH = path.join(STORE_DIR, 'local-store.json');

interface StoredProject {
    id: string;
    name: string;
    description: string | null;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    sandboxId: string;
    sandboxUrl: string;
    folderPath: string | null;
    previewImgUrl: string | null;
    previewImgPath: string | null;
    previewImgBucket: string | null;
    updatedPreviewImgAt: string | null;
}

interface LocalProjectCreationResult extends StoredProject {
    defaultBranchId: string;
}

interface StoredBranch {
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    sandboxId: string | null;
    isDefault: boolean;
    gitBranch: string | null;
    gitCommitSha: string | null;
    gitRepoUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

interface StoredCanvas {
    id: string;
    projectId: string;
    createdAt: string;
    updatedAt: string;
}

interface StoredFrame {
    id: string;
    canvasId: string;
    branchId: string;
    url: string;
    x: string;
    y: string;
    width: string;
    height: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}

interface StoredUserProject {
    userId: string;
    projectId: string;
    role: string;
    createdAt: string;
}

interface StoredProjectSettings {
    projectId: string;
    runCommand: string;
    buildCommand: string;
    installCommand: string;
}

interface LocalStore {
    projects: StoredProject[];
    branches: StoredBranch[];
    canvases: StoredCanvas[];
    frames: StoredFrame[];
    userProjects: StoredUserProject[];
    projectSettings: StoredProjectSettings[];
}

function getProjectSandboxUrlForCanvas(store: LocalStore, canvasId: string): string | null {
    const projectId = store.canvases.find((canvas) => canvas.id === canvasId)?.projectId;
    if (!projectId) {
        return null;
    }

    return store.projects.find((project) => project.id === projectId)?.sandboxUrl ?? null;
}

function normalizeStoredFrameUrl(store: LocalStore, frame: StoredFrame): string {
    return (
        resolveLocalPreviewFrameUrl(frame.url, getProjectSandboxUrlForCanvas(store, frame.canvasId)) ??
        frame.url
    );
}

function readStore(): LocalStore {
    try {
        if (fs.existsSync(STORE_PATH)) {
            const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as LocalStore;
            let didMutate = false;

            const normalizedProjects = store.projects.map((project) => {
                const normalizedProject = {
                    ...project,
                    sandboxUrl: normalizeLocalPreviewUrl(project.sandboxUrl) ?? project.sandboxUrl,
                    folderPath: normalizeLocalFolderPath(project.folderPath),
                };

                if (
                    normalizedProject.sandboxUrl !== project.sandboxUrl ||
                    normalizedProject.folderPath !== project.folderPath
                ) {
                    didMutate = true;
                }

                return normalizedProject;
            });

            const normalizedStore: LocalStore = {
                ...store,
                projects: normalizedProjects,
                projectSettings: store.projectSettings ?? [],
            };

            const normalizedFrames = store.frames.map((frame) => {
                const normalizedFrame = {
                    ...frame,
                    url: normalizeStoredFrameUrl(normalizedStore, frame),
                };

                if (normalizedFrame.url !== frame.url) {
                    didMutate = true;
                }

                return normalizedFrame;
            });

            normalizedStore.frames = normalizedFrames;

            if (didMutate) {
                writeStore(normalizedStore);
            }

            return normalizedStore;
        }
    } catch {
        // ignore read errors
    }
    return {
        projects: [],
        branches: [],
        canvases: [],
        frames: [],
        userProjects: [],
        projectSettings: [],
    };
}

function writeStore(store: LocalStore): void {
    if (!fs.existsSync(STORE_DIR)) {
        fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

// ── Projects ──────────────────────────────────────────────────────────────────

export function localListProjects(userId: string): StoredProject[] {
    const store = readStore();
    const projectIds = new Set(
        store.userProjects.filter((up) => up.userId === userId).map((up) => up.projectId),
    );
    return store.projects
        .filter((p) => projectIds.has(p.id))
        .map((project) => ({
            ...project,
            folderPath: normalizeLocalFolderPath(project.folderPath),
        }));
}

export function localGetProject(projectId: string): StoredProject | null {
    const project = readStore().projects.find((p) => p.id === projectId) ?? null;
    if (!project) {
        return null;
    }
    return {
        ...project,
        folderPath: normalizeLocalFolderPath(project.folderPath),
    };
}

export interface CreateProjectInput {
    id?: string;
    name: string;
    description?: string | null;
    tags?: string[];
    sandboxId: string;
    sandboxUrl: string;
    folderPath?: string | null;
    userId: string;
}

export function localCreateProject(input: CreateProjectInput): LocalProjectCreationResult {
    const store = readStore();
    const now = new Date().toISOString();
    const projectId = input.id ?? uuidv4();
    const folderPath = normalizeLocalFolderPath(input.folderPath);
    const sandboxUrl = normalizeLocalPreviewUrl(input.sandboxUrl) ?? input.sandboxUrl;

    const project: StoredProject = {
        id: projectId,
        name: input.name,
        description: input.description ?? null,
        tags: input.tags ?? [],
        createdAt: now,
        updatedAt: now,
        sandboxId: input.sandboxId,
        sandboxUrl,
        folderPath,
        previewImgUrl: null,
        previewImgPath: null,
        previewImgBucket: null,
        updatedPreviewImgAt: null,
    };

    // Default branch
    const branchId = uuidv4();
    const branch: StoredBranch = {
        id: branchId,
        projectId,
        name: 'main',
        description: null,
        sandboxId: input.sandboxId,
        isDefault: true,
        gitBranch: null,
        gitCommitSha: null,
        gitRepoUrl: null,
        createdAt: now,
        updatedAt: now,
    };

    // Default canvas + frame
    const canvasId = uuidv4();
    const canvas: StoredCanvas = {
        id: canvasId,
        projectId,
        createdAt: now,
        updatedAt: now,
    };

    const frame: StoredFrame = {
        id: uuidv4(),
        canvasId,
        branchId,
        url: sandboxUrl,
        x: '120',
        y: '120',
        width: '1200',
        height: '800',
        type: 'desktop',
        createdAt: now,
        updatedAt: now,
    };

    const userProject: StoredUserProject = {
        userId: input.userId,
        projectId,
        role: 'owner',
        createdAt: now,
    };

    store.projects.push(project);
    store.branches.push(branch);
    store.canvases.push(canvas);
    store.frames.push(frame);
    store.userProjects.push(userProject);
    writeStore(store);

    return {
        ...project,
        defaultBranchId: branchId,
    };
}

export function localUpdateProject(
    projectId: string,
    updates: Partial<Pick<StoredProject, 'name' | 'description' | 'tags'>>,
): StoredProject | null {
    const store = readStore();
    const idx = store.projects.findIndex((p) => p.id === projectId);
    if (idx === -1) return null;
    store.projects[idx] = { ...store.projects[idx]!, ...updates, updatedAt: new Date().toISOString() };
    writeStore(store);
    return store.projects[idx]!;
}

export function localDeleteProject(projectId: string): void {
    const store = readStore();
    store.projects = store.projects.filter((p) => p.id !== projectId);
    store.userProjects = store.userProjects.filter((up) => up.projectId !== projectId);
    store.branches = store.branches.filter((b) => b.projectId !== projectId);
    store.projectSettings = store.projectSettings.filter((settings) => settings.projectId !== projectId);
    const canvasIds = store.canvases.filter((c) => c.projectId !== projectId).map((c) => c.id);
    store.frames = store.frames.filter((f) => !canvasIds.includes(f.canvasId));
    store.canvases = store.canvases.filter((c) => c.projectId !== projectId);
    writeStore(store);
}

// ── Branches ──────────────────────────────────────────────────────────────────

export function localGetBranches(projectId: string, onlyDefault?: boolean): StoredBranch[] {
    const branches = readStore().branches.filter((b) => b.projectId === projectId);
    return onlyDefault ? branches.filter((b) => b.isDefault) : branches;
}

// ── Canvas + Frames ───────────────────────────────────────────────────────────

export function localGetProjectWithCanvas(projectId: string, userId: string) {
    const store = readStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return null;

    const canvas = store.canvases.find((c) => c.projectId === projectId);
    const canvasId = canvas?.id ?? uuidv4();
    const frames = canvas
        ? store.frames
            .filter((f) => f.canvasId === canvas.id)
            .map((frame) => ({
                ...frame,
                url: resolveLocalPreviewFrameUrl(frame.url, project.sandboxUrl) ?? frame.url,
            }))
        : [];

    return {
        project,
        canvas: {
            id: canvasId,
            projectId,
            x: '120',
            y: '120',
            scale: '0.56',
            userId,
        },
        frames,
    };
}

// ── Frame CRUD ────────────────────────────────────────────────────────────────

export function localGetFrame(frameId: string): StoredFrame | null {
    const store = readStore();
    const frame = store.frames.find((f) => f.id === frameId);
    if (!frame) {
        return null;
    }

    return {
        ...frame,
        url: normalizeStoredFrameUrl(store, frame),
    };
}

export function localGetFramesByCanvasId(canvasId: string): StoredFrame[] {
    const store = readStore();
    return store.frames
        .filter((f) => f.canvasId === canvasId)
        .map((frame) => ({
            ...frame,
            url: normalizeStoredFrameUrl(store, frame),
        }));
}

export function localCreateFrame(frame: Omit<StoredFrame, 'createdAt' | 'updatedAt'>): StoredFrame {
    const store = readStore();
    const now = new Date().toISOString();
    const sandboxUrl = getProjectSandboxUrlForCanvas(store, frame.canvasId);
    const newFrame: StoredFrame = {
        ...frame,
        url: resolveLocalPreviewFrameUrl(frame.url, sandboxUrl) ?? frame.url,
        createdAt: now,
        updatedAt: now,
    };
    store.frames.push(newFrame);
    writeStore(store);
    return newFrame;
}

export function localUpdateFrame(frameId: string, updates: Partial<StoredFrame>): StoredFrame | null {
    const store = readStore();
    const idx = store.frames.findIndex((f) => f.id === frameId);
    if (idx === -1) return null;
    const existingFrame = store.frames[idx]!;
    const sandboxUrl = getProjectSandboxUrlForCanvas(store, existingFrame.canvasId);
    store.frames[idx] = {
        ...existingFrame,
        ...updates,
        url:
            resolveLocalPreviewFrameUrl(updates.url ?? existingFrame.url, sandboxUrl) ??
            (updates.url ?? existingFrame.url),
        updatedAt: new Date().toISOString(),
    };
    writeStore(store);
    return store.frames[idx]!;
}

export function localDeleteFrame(frameId: string): void {
    const store = readStore();
    store.frames = store.frames.filter((f) => f.id !== frameId);
    writeStore(store);
}

// ── Converters to model types ─────────────────────────────────────────────────

function toModelProjectSettings(
    settings: StoredProjectSettings | null | undefined,
): ProjectSettings | null {
    if (!settings) {
        return null;
    }

    return {
        commands: {
            run: settings.runCommand || DefaultSettings.COMMANDS.run,
            build: settings.buildCommand || DefaultSettings.COMMANDS.build,
            install: settings.installCommand || DefaultSettings.COMMANDS.install,
        },
    };
}

export function localGetProjectSettings(projectId: string): ProjectSettings | null {
    const store = readStore();
    return toModelProjectSettings(
        store.projectSettings.find((settings) => settings.projectId === projectId),
    );
}

export function localUpsertProjectSettings(
    projectId: string,
    settings: ProjectSettings,
): ProjectSettings {
    const store = readStore();
    const nextSettings: StoredProjectSettings = {
        projectId,
        runCommand: settings.commands.run ?? '',
        buildCommand: settings.commands.build ?? '',
        installCommand: settings.commands.install ?? '',
    };
    const existingIndex = store.projectSettings.findIndex(
        (storedSettings) => storedSettings.projectId === projectId,
    );

    if (existingIndex >= 0) {
        store.projectSettings[existingIndex] = nextSettings;
    } else {
        store.projectSettings.push(nextSettings);
    }

    writeStore(store);
    return (
        toModelProjectSettings(nextSettings) ?? {
            commands: {
                run: DefaultSettings.COMMANDS.run,
                build: DefaultSettings.COMMANDS.build,
                install: DefaultSettings.COMMANDS.install,
            },
        }
    );
}

export function localDeleteProjectSettings(projectId: string): boolean {
    const store = readStore();
    store.projectSettings = store.projectSettings.filter(
        (storedSettings) => storedSettings.projectId !== projectId,
    );
    writeStore(store);
    return true;
}

export function toModelProject(p: StoredProject) {
    return {
        id: p.id,
        name: p.name,
        metadata: {
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
            description: p.description,
            tags: p.tags,
            previewImg: null,
        },
    };
}

export function toModelBranch(b: StoredBranch, folderPath?: string | null) {
    return {
        id: b.id,
        projectId: b.projectId,
        name: b.name,
        description: b.description,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
        isDefault: b.isDefault,
        git: null,
        sandbox: { id: b.sandboxId ?? '', folderPath: normalizeLocalFolderPath(folderPath) },
    };
}
