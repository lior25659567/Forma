// Cloudflare Worker entry: serves the built app (dist/) and the /api/ai/* routes.
// Deploy: npm run build && npx wrangler deploy
// Secrets: npx wrangler secret put CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN
import { handleApi, type Env } from '../server/handler';

interface WorkerEnv extends Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

export default {
  async fetch(req: Request, env: WorkerEnv): Promise<Response> {
    return (await handleApi(req, env)) ?? env.ASSETS.fetch(req);
  },
};
