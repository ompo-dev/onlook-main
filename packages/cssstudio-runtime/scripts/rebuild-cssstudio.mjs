import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, '..');
const sourceDir = path.join(packageDir, 'source');
const segmentsDir = path.join(sourceDir, 'segments');
const manifestPath = path.join(sourceDir, 'manifest.json');
const vendorBundlePath = path.join(packageDir, 'vendor', 'cssstudio.mjs');

if (!existsSync(manifestPath)) {
  throw new Error(`Manifest not found at ${manifestPath}. Run sync-upstream-cssstudio.mjs first.`);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const rebuiltBundle = manifest
  .map((entry) => readFileSync(path.join(segmentsDir, entry.file), 'utf8'))
  .join('');

writeFileSync(vendorBundlePath, rebuiltBundle, 'utf8');
console.log(`[cssstudio-rebuild] Rebuilt ${path.relative(packageDir, vendorBundlePath)} from extracted segments`);
