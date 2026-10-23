import { readFileSync, realpathSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { resolve, sep, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

export function verifyAssets(root, build) {
  const base = realpathSync(root);
  const entries = Object.entries(build.assets || {});
  if (!entries.length || entries.length > 2000) throw new Error('Release asset manifest missing or too large');
  for (const [path, digest] of entries) {
    if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').some(p => p === '..' || p === '.') || path === 'wellync-build.json' || !/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid release asset path or digest');
    const file = realpathSync(resolve(base, path));
    if (!file.startsWith(base + sep) || createHash('sha256').update(readFileSync(file)).digest('hex') !== digest) throw new Error(`Release asset checksum mismatch: ${path}`);
  }
  return entries.map(([path]) => path);
}
export function stageAssets(root, build) {
  const paths = verifyAssets(root, build);
  const directory = mkdtempSync(join(tmpdir(), 'wellync-assets-'));
  try {
    for (const path of paths) { const target = resolve(directory, path); mkdirSync(dirname(target), { recursive: true }); copyFileSync(resolve(root, path), target); }
    copyFileSync(resolve(root, 'wellync-build.json'), resolve(directory, 'wellync-build.json'));
    return { directory, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
  } catch (error) { rmSync(directory, { recursive: true, force: true }); throw error; }
}
