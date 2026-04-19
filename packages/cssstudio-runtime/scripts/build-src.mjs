/**
 * Build script: compila src/ → dist/cssstudio-src.mjs
 *
 * - Processa CSS Modules: gera nomes de classe escopados e coleta o CSS
 * - Injeta todo o CSS dos componentes no Shadow DOM via marcador __COMPONENT_STYLES_INJECTION__
 * - Externaliza react e react-dom (já presentes no host page)
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(__dirname, '..');
const outfile = resolve(packageDir, 'dist', 'cssstudio-src.mjs');

// Garante que dist/ existe
if (!existsSync(resolve(packageDir, 'dist'))) {
    mkdirSync(resolve(packageDir, 'dist'), { recursive: true });
}

/**
 * Gera um hash curto baseado no caminho do arquivo.
 */
function fileHash(filePath) {
    return createHash('md5').update(filePath).digest('hex').slice(0, 7);
}

/**
 * Escopar nomes de classe de um CSS module.
 * Retorna { scopedCss, classNames }.
 */
function processCssModule(filePath, css) {
    const hash = fileHash(filePath);
    const prefix = basename(filePath, '.module.css').replace(/[^a-zA-Z0-9]/g, '_');

    const classNames = {};

    // Escopa seletores .className → .prefix_className_hash
    // Respeita :host, media queries, pseudo-seletores
    const scopedCss = css.replace(
        /\.(-?[a-zA-Z_][a-zA-Z0-9_-]*)/g,
        (_, name) => {
            if (!classNames[name]) {
                classNames[name] = `${prefix}_${name}_${hash}`;
            }
            return `.${classNames[name]}`;
        },
    );

    return { scopedCss, classNames };
}

// Mapa de CSS coletado durante o build: path → scopedCss
const collectedCss = new Map();

/** Plugin esbuild para CSS Modules */
const cssModulesPlugin = {
    name: 'css-modules',
    setup(buildCtx) {
        buildCtx.onLoad({ filter: /\.module\.css$/ }, (args) => {
            const css = readFileSync(args.path, 'utf8');
            const { scopedCss, classNames } = processCssModule(args.path, css);

            collectedCss.set(args.path, scopedCss);

            const exports = Object.entries(classNames)
                .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
                .join(',\n');

            return {
                contents: `const styles = {\n${exports}\n};\nexport default styles;`,
                loader: 'js',
            };
        });
    },
};

console.log('[build-src] Iniciando build de src/ ...');

await build({
    entryPoints: [resolve(packageDir, 'src', 'index.ts')],
    bundle: true,
    format: 'esm',
    outfile,
    platform: 'browser',
    // React e React DOM já estão no ambiente host
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    plugins: [cssModulesPlugin],
    jsx: 'automatic',
    define: {
        'process.env.NODE_ENV': '"production"',
    },
    minify: false,
    sourcemap: false,
    target: ['es2020'],
    treeShaking: true,
});

// ── Pós-processamento: injetar CSS coletado ──────────────────────────────────
const allCss = [...collectedCss.values()].join('\n');

let output = readFileSync(outfile, 'utf8');

const injection = `
  // Component styles (CSS Modules inlined at build time)
  const __componentStyle = document.createElement("style");
  __componentStyle.textContent = ${JSON.stringify(allCss)};
  shadow.appendChild(__componentStyle);
`;

const MARKER = `shadow.appendChild(document.createElement("__cs_placeholder__"));`;
if (!output.includes(MARKER)) {
    console.warn('[build-src] AVISO: marcador placeholder não encontrado no output. CSS dos componentes não foi injetado.');
} else {
    output = output.replace(MARKER, injection);
    writeFileSync(outfile, output, 'utf8');
    console.log(`[build-src] CSS de ${collectedCss.size} módulos injetado.`);
}

console.log(`[build-src] Build completo → ${outfile}`);
