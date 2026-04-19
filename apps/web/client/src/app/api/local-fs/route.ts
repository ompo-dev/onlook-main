import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import fs from 'fs';
import { type NextRequest, NextResponse } from 'next/server';
import path from 'path';

function validateBase(base: string): void {
    if (!base || !path.isAbsolute(base)) {
        throw new Error('Invalid base path');
    }
}

function safePath(base: string, sub: string): string {
    const resolved = path.resolve(base, sub);
    if (!resolved.startsWith(path.resolve(base))) {
        throw new Error('Path traversal detected');
    }
    return resolved;
}

export async function GET(req: NextRequest) {
    if (!LOCAL_MODE_ENABLED) {
        return NextResponse.json({ error: 'Not in local mode' }, { status: 403 });
    }
    const { searchParams } = req.nextUrl;
    const op = searchParams.get('op');
    const base = searchParams.get('base') ?? '';
    const subPath = searchParams.get('path') ?? '';

    try {
        validateBase(base);

        if (op === 'list') {
            const dir = safePath(base, subPath);
            if (!fs.existsSync(dir)) {
                return NextResponse.json({ files: [] });
            }
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            const files = entries.map((e) => ({
                name: e.name,
                path: path.join(subPath, e.name).replace(/\\/g, '/'),
                type: e.isDirectory() ? 'directory' : 'file',
                isDirectory: e.isDirectory(),
            }));
            return NextResponse.json({ files });
        }

        if (op === 'read') {
            const filePath = safePath(base, subPath);
            if (!fs.existsSync(filePath)) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            return NextResponse.json({ content });
        }

        if (op === 'stat') {
            const targetPath = safePath(base, subPath);
            if (!fs.existsSync(targetPath)) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }
            const stats = fs.statSync(targetPath);
            return NextResponse.json({
                type: stats.isDirectory() ? 'directory' : 'file',
                size: stats.size,
            });
        }

        return NextResponse.json({ error: 'Unknown op' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!LOCAL_MODE_ENABLED) {
        return NextResponse.json({ error: 'Not in local mode' }, { status: 403 });
    }
    try {
        const body = (await req.json()) as {
            op: string;
            base: string;
            path: string;
            nextPath?: string;
            content?: string;
        };
        const { op, base, path: subPath, nextPath, content } = body;
        validateBase(base);

        if (op === 'write') {
            const filePath = safePath(base, subPath);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, content ?? '', 'utf-8');
            return NextResponse.json({ success: true });
        }

        if (op === 'mkdir') {
            const dirPath = safePath(base, subPath);
            fs.mkdirSync(dirPath, { recursive: true });
            return NextResponse.json({ success: true });
        }

        if (op === 'delete') {
            const targetPath = safePath(base, subPath);
            if (fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { recursive: true, force: true });
            }
            return NextResponse.json({ success: true });
        }

        if (op === 'rename') {
            if (!nextPath) {
                return NextResponse.json({ error: 'Missing nextPath' }, { status: 400 });
            }

            const targetPath = safePath(base, subPath);
            const renamedPath = safePath(base, nextPath);

            fs.mkdirSync(path.dirname(renamedPath), { recursive: true });
            fs.renameSync(targetPath, renamedPath);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Unknown op' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
