import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const cssStudioRoot = path.join(repoRoot, 'node_modules', 'cssstudio');
const bundlePath = path.join(cssStudioRoot, 'dist', 'cssstudio.mjs');
const cssPath = path.join(cssStudioRoot, 'dist', 'cssstudio.css');
const packagePath = path.join(cssStudioRoot, 'package.json');
const localStudioRoot = path.join(
    repoRoot,
    'apps',
    'web',
    'client',
    'src',
    'components',
    'studio',
);
const extractRoot = path.join(repoRoot, '.tmp', 'cssstudio-upstream-extracted');
const reportJsonPath = path.join(repoRoot, 'CSSSTUDIO_UPSTREAM_INVENTORY.json');
const reportMdPath = path.join(repoRoot, 'CSSSTUDIO_UPSTREAM_GAP_REPORT.md');

function toPosix(value) {
    return value.replaceAll('\\', '/');
}

function classifyModule(modulePath) {
    if (modulePath.includes('.module.css')) return 'css-module';
    if (modulePath.startsWith('src/Editor/state/')) return 'state';
    if (modulePath.startsWith('src/Editor/utils/')) return 'utils';
    if (modulePath.startsWith('src/Editor/icons/')) return 'icons';
    if (modulePath.startsWith('src/auth/')) return 'auth';
    if (modulePath.startsWith('src/Editor/')) return 'component';
    return 'other';
}

function mapLocalFileToUpstreamModule(relativePath) {
    const normalized = toPosix(relativePath);

    if (normalized === 'index.ts') {
        return 'src/index.ts';
    }

    if (normalized.startsWith('mcp/')) {
        return `src/${normalized}`;
    }

    if (normalized.startsWith('auth/')) {
        return `src/${normalized}`;
    }

    if (normalized.startsWith('editor/')) {
        return `src/Editor/${normalized.slice('editor/'.length)}`;
    }

    return null;
}

async function collectFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectFiles(fullPath)));
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

function extractJsModules(bundle) {
    const lines = bundle.split(/\r?\n/);
    const modules = [];
    let current = null;

    for (const line of lines) {
        const markerMatch = line.match(/^\/\/ (src\/.+)$/);
        if (markerMatch) {
            if (current) {
                modules.push(current);
            }
            current = {
                path: markerMatch[1],
                lines: [line],
            };
            continue;
        }

        if (current) {
            current.lines.push(line);
        }
    }

    if (current) {
        modules.push(current);
    }

    return modules;
}

function extractCssModules(css) {
    const regex = /\/\* esbuild-css-modules-plugin-ns-css:(src\/.+?) \*\//g;
    const modules = [];
    let match;

    while ((match = regex.exec(css)) !== null) {
        modules.push(match[1]);
    }

    return [...new Set(modules)];
}

async function main() {
    const [bundle, css, packageRaw] = await Promise.all([
        fs.readFile(bundlePath, 'utf8'),
        fs.readFile(cssPath, 'utf8'),
        fs.readFile(packagePath, 'utf8'),
    ]);

    const packageJson = JSON.parse(packageRaw);
    const jsModules = extractJsModules(bundle);
    const cssModules = extractCssModules(css);

    const upstreamModules = [...new Set([...jsModules.map((module) => module.path), ...cssModules])].sort();

    const localFiles = (await collectFiles(localStudioRoot))
        .map((filePath) => path.relative(localStudioRoot, filePath))
        .map(toPosix)
        .sort();

    const localAsUpstream = localFiles
        .map(mapLocalFileToUpstreamModule)
        .filter((value) => value !== null);
    const localSet = new Set(localAsUpstream);

    const overlap = upstreamModules.filter((modulePath) => localSet.has(modulePath));
    const missing = upstreamModules.filter((modulePath) => !localSet.has(modulePath));
    const extraLocal = localAsUpstream.filter((modulePath) => !upstreamModules.includes(modulePath));

    await fs.rm(extractRoot, { recursive: true, force: true });
    await ensureDir(extractRoot);

    for (const module of jsModules) {
        const outputPath = path.join(extractRoot, toPosix(module.path));
        await ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, `${module.lines.join('\n')}\n`, 'utf8');
    }

    const inventory = {
        package: {
            name: packageJson.name,
            version: packageJson.version,
            repository: packageJson.repository?.url ?? null,
            gitHead: packageJson.gitHead ?? null,
        },
        generatedAt: new Date().toISOString(),
        stats: {
            upstreamModuleCount: upstreamModules.length,
            upstreamJsModuleCount: jsModules.length,
            upstreamCssModuleCount: cssModules.length,
            localMappedModuleCount: localAsUpstream.length,
            overlapCount: overlap.length,
            missingCount: missing.length,
            extraLocalCount: extraLocal.length,
        },
        upstreamModules: upstreamModules.map((modulePath) => ({
            path: modulePath,
            kind: classifyModule(modulePath),
            existsLocally: localSet.has(modulePath),
        })),
        overlap,
        missing,
        extraLocal,
    };

    const missingByKind = missing.reduce((acc, modulePath) => {
        const kind = classifyModule(modulePath);
        acc[kind] ??= [];
        acc[kind].push(modulePath);
        return acc;
    }, {});

    const gapReport = [
        '# CSS Studio Upstream Gap Report',
        '',
        `- Package: \`${packageJson.name}@${packageJson.version}\``,
        `- gitHead do pacote: \`${packageJson.gitHead ?? 'n/a'}\``,
        `- Módulos upstream encontrados no bundle: **${upstreamModules.length}**`,
        `- Módulos já cobertos pelo clone local: **${overlap.length}**`,
        `- Módulos ausentes no clone local: **${missing.length}**`,
        `- Arquivos locais sem equivalente direto no upstream: **${extraLocal.length}**`,
        '',
        '## Faltantes por categoria',
        '',
        ...Object.entries(missingByKind)
            .sort(([left], [right]) => left.localeCompare(right))
            .flatMap(([kind, modulePaths]) => [
                `### ${kind}`,
                '',
                ...modulePaths.map((modulePath) => `- \`${modulePath}\``),
                '',
            ]),
        '## Extra locais',
        '',
        ...extraLocal.map((modulePath) => `- \`${modulePath}\``),
        '',
        '## Artefatos extraídos',
        '',
        `- Fragments JS do bundle: \`${toPosix(path.relative(repoRoot, extractRoot))}\``,
        `- Inventário JSON: \`${path.basename(reportJsonPath)}\``,
    ].join('\n');

    await Promise.all([
        fs.writeFile(reportJsonPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8'),
        fs.writeFile(reportMdPath, `${gapReport}\n`, 'utf8'),
    ]);

    console.log(`Inventory written to ${reportJsonPath}`);
    console.log(`Gap report written to ${reportMdPath}`);
    console.log(`Extracted ${jsModules.length} JS fragments to ${extractRoot}`);
}

await main();
