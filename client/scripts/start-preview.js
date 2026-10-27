import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

// npm runs scripts through cmd.exe on Windows; shell parameter expansion such
// as ${PORT:-8080} is not portable. Pass the port as an argument instead.
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'preview', '--host', '0.0.0.0', '--port', String(port)], { stdio: 'inherit' });
child.on('error', () => { console.error('Unable to start the Vite preview server. Install client dependencies first.'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
