import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const serverRoot = fileURLToPath(new URL('../', import.meta.url));
const clientRoot = fileURLToPath(new URL('../../client/', import.meta.url));
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: clientRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, NODE_ENV: 'production', VITE_API_URL: '' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
await fs.cp(new URL('../../client/dist/', import.meta.url), new URL('../site-dist/', import.meta.url), { recursive: true });
// Vercel's static output is deliberately empty: Express owns backend routing.
await fs.mkdir(`${serverRoot}/public`, { recursive: true });
console.log('Prepared backend HTML/assets; no migrations or runtime credentials used.');
