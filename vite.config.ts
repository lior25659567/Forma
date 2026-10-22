import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Connect, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { handleApi, type Env } from './server/handler';

/** Runs the /api/ai/* handler inside `vite dev` and `vite preview`, reading secrets from .env. */
function aiApi(env: Env): Plugin {
  const middleware: Connect.NextHandleFunction = async (req: IncomingMessage, res: ServerResponse, next) => {
    if (!req.url?.startsWith('/api/')) return next();
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const ac = new AbortController();
    res.on('close', () => !res.writableEnded && ac.abort());
    const request = new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
      signal: ac.signal,
    });
    const out = await handleApi(request, env);
    if (!out) return next();
    res.statusCode = out.status;
    out.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await out.arrayBuffer()));
  };
  return {
    name: 'forma-ai-api',
    configureServer: (s) => void s.middlewares.use(middleware),
    configurePreviewServer: (s) => void s.middlewares.use(middleware),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['CLOUDFLARE_', 'RESTYLE_']) as Env;
  return {
    plugins: [react(), aiApi(env)],
    server: { host: true },
    test: { environment: 'node' },
  };
});
