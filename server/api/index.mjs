import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { validateEnv } from '../src/config/env.js';

validateEnv();
// Reuse the existing app; no listener, interval scheduler or database writes.
export default createApp({
  renderSite: true,
  clientDistDir: fileURLToPath(new URL('../site-dist/', import.meta.url)),
});
