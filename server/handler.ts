// Server-side image generation proxy. Keeps the Cloudflare API token off the client.
// Runs as Vite dev/preview middleware (see vite.config.ts) and as a Cloudflare Worker (worker/index.ts).

export interface Env {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  RESTYLE_MODEL?: string;
  /** Override for testing against a local stand-in. */
  CLOUDFLARE_API_BASE?: string;
}

export const DEFAULT_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function configured(env: Env) {
  return !!(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  if (bytes.byteLength > MAX_IMAGE_BYTES) return null;
  return new Blob([bytes], { type: m[1] });
}

/** Explain provider errors in terms a person can act on. */
function providerError(status: number, detail: string): string {
  if (status === 401 || status === 403) return 'Cloudflare rejected the API token. Check CLOUDFLARE_API_TOKEN and that it has Workers AI access.';
  if (status === 429 || /neuron|quota|limit/i.test(detail)) return 'The daily free image allowance on this Cloudflare account is used up. Try again tomorrow or switch to a paid plan.';
  if (status === 404) return 'The image model wasn’t found on this Cloudflare account. Check RESTYLE_MODEL.';
  return `The image service returned an error (${status}). ${detail.slice(0, 200)}`;
}

async function readImage(res: Response): Promise<string> {
  const type = res.headers.get('content-type') ?? '';
  if (type.startsWith('image/')) {
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return `data:${type.split(';')[0]};base64,${btoa(bin)}`;
  }
  const body = (await res.json()) as { result?: { image?: string }; image?: string };
  const b64 = body.result?.image ?? body.image;
  if (!b64) throw new Error('The image service responded without an image.');
  return b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
}

interface GenerateBody {
  prompt: string;
  width: number;
  height: number;
  images: string[]; // data URLs; first is the scene, the rest are references
  seed?: number;
}

async function generate(req: Request, env: Env): Promise<Response> {
  if (!configured(env)) return json({ error: 'Image generation isn’t set up on this server.' }, 503);
  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return json({ error: 'Request body must be JSON.' }, 400);
  }
  if (typeof body.prompt !== 'string' || body.prompt.length < 10 || body.prompt.length > 2500) return json({ error: 'Prompt is missing or too long.' }, 400);
  const w = Math.round(body.width / 16) * 16;
  const h = Math.round(body.height / 16) * 16;
  if (!(w >= 256 && w <= 1536 && h >= 256 && h <= 1536)) return json({ error: 'Width and height must be between 256 and 1536 px.' }, 400);
  if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > MAX_IMAGES) return json({ error: 'Send between 1 and 4 images.' }, 400);
  const blobs = body.images.map(dataUrlToBlob);
  if (blobs.some((b) => !b)) return json({ error: 'Images must be PNG, JPEG or WebP data URLs under 4 MB.' }, 400);

  const form = new FormData();
  form.append('prompt', body.prompt);
  form.append('width', String(w));
  form.append('height', String(h));
  if (Number.isInteger(body.seed)) form.append('seed', String(body.seed));
  blobs.forEach((b, i) => form.append(`input_image_${i}`, b!, `image${i}.${b!.type.split('/')[1]}`));

  const model = env.RESTYLE_MODEL || DEFAULT_MODEL;
  const base = env.CLOUDFLARE_API_BASE || 'https://api.cloudflare.com/client/v4';
  const url = `${base}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` }, body: form, signal: req.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return json({ error: 'Cancelled.' }, 499);
    return json({ error: 'Couldn’t reach the image service. Check the server’s network access.' }, 502);
  }
  if (!res.ok) return json({ error: providerError(res.status, await res.text().catch(() => '')) }, 502);
  try {
    return json({ image: await readImage(res), model });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}

export async function handleApi(req: Request, env: Env): Promise<Response | null> {
  const { pathname } = new URL(req.url);
  if (pathname === '/api/ai/status' && req.method === 'GET') {
    return json({ available: configured(env), model: configured(env) ? env.RESTYLE_MODEL || DEFAULT_MODEL : null });
  }
  if (pathname === '/api/ai/generate' && req.method === 'POST') return generate(req, env);
  if (pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
  return null;
}
