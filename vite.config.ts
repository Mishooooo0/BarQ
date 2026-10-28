import { defineConfig, type Connect, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const isApi = (url = '') => /^\/api(\/|\?|$)/.test(url);

// Serves the BarQ API from inside the Vite dev server, so `npm run dev` is one process on one origin.
// The API module is reloaded through Vite on every change in server/, so editing the backend never needs a restart,
// and a backend error becomes a JSON 500 for that request instead of taking the UI down.
function barqApi(): Plugin {
  type ApiModule = { handleApi: (req: unknown, res: unknown) => Promise<void> };
  // Typed loosely on purpose: the project has no @types/node, and only these response members are used.
  type Res = { headersSent: boolean; statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void };
  const middleware = (load: () => Promise<ApiModule>, log: (msg: string) => void): Connect.NextHandleFunction => async (incoming, response, next) => {
    const req = incoming as unknown as { url?: string }; const res = response as unknown as Res;
    if (!isApi(req.url)) return next();
    try { await (await load()).handleApi(req, res); }
    catch (error) {
      log(`[barq api] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      if (!res.headersSent) { res.statusCode = 500; res.setHeader('content-type', 'application/json; charset=utf-8'); }
      res.end(JSON.stringify({ error: 'The API could not run this request. Check the terminal for details.' }));
    }
  };
  return {
    name: 'barq-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(middleware(() => server.ssrLoadModule('/server/api.mjs') as Promise<ApiModule>, msg => server.config.logger.error(msg)));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(() => import('./server/api.mjs' as string) as Promise<ApiModule>, msg => console.error(msg)));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), barqApi()],
  base: '/',
  server: { watch: { ignored: ['**/data/db/**', '**/test-results/**'] } },
});
