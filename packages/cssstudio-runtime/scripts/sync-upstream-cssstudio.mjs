import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageDir, '..', '..');
const upstreamDistDir = path.join(repoRoot, 'node_modules', 'cssstudio', 'dist');
const vendorDir = path.join(packageDir, 'vendor');
const sourceDir = path.join(packageDir, 'source');
const segmentsDir = path.join(sourceDir, 'segments');
const manifestPath = path.join(sourceDir, 'manifest.json');
const markerRegex = /^\/\/ (?:src\/|\.\.\/\.\.\/node_modules\/)/;

function sanitizeLabel(label) {
  return label
    .replace(/^\.\.\/\.\.\//, 'vendor__')
    .replace(/^src\//, 'src__')
    .replace(/[\\/]/g, '__')
    .replace(/[^a-zA-Z0-9._-]/g, '-');
}

function splitBundle(bundleText) {
  const normalized = bundleText.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const segments = [];
  let currentLabel = 'preamble';
  let currentLines = [];
  let sawFirstMarker = false;

  for (const line of lines) {
    if (markerRegex.test(line)) {
      if (!sawFirstMarker) {
        sawFirstMarker = true;
        if (currentLines.length > 0) {
          segments.push({
            label: currentLabel,
            content: `${currentLines.join('\n')}\n`,
          });
        }
      } else {
        segments.push({
          label: currentLabel,
          content: `${currentLines.join('\n')}\n`,
        });
      }

      currentLabel = line.slice(3).trim();
      currentLines = [line];
      continue;
    }

    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    segments.push({
      label: currentLabel,
      content: `${currentLines.join('\n')}\n`,
    });
  }

  return segments.filter((segment) => segment.content.trim().length > 0);
}

if (!existsSync(upstreamDistDir)) {
  throw new Error(`Upstream cssstudio dist not found at ${upstreamDistDir}`);
}

mkdirSync(vendorDir, { recursive: true });
mkdirSync(sourceDir, { recursive: true });

for (const fileName of ['cssstudio.mjs', 'cli.mjs', 'cssstudio.css']) {
  const fromPath = path.join(upstreamDistDir, fileName);
  if (!existsSync(fromPath)) {
    throw new Error(`Missing upstream file ${fromPath}`);
  }

  cpSync(fromPath, path.join(vendorDir, fileName));
}

rmSync(segmentsDir, { recursive: true, force: true });
mkdirSync(segmentsDir, { recursive: true });

const bundle = readFileSync(path.join(vendorDir, 'cssstudio.mjs'), 'utf8');
const segments = splitBundle(bundle);
const manifest = [];

segments.forEach((segment, index) => {
  const fileName = `${String(index).padStart(4, '0')}__${sanitizeLabel(segment.label)}.mjs`;
  writeFileSync(path.join(segmentsDir, fileName), segment.content, 'utf8');
  manifest.push({
    index,
    label: segment.label,
    file: fileName,
  });
});

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const segmentCount = readdirSync(segmentsDir).length;
console.log(`[cssstudio-sync] Vendored upstream bundle into ${path.relative(repoRoot, vendorDir)}`);
console.log(`[cssstudio-sync] Extracted ${segmentCount} editable segments into ${path.relative(repoRoot, segmentsDir)}`);
