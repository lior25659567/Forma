// Talks to the server-side /api/ai routes. The API token never reaches the browser.

export interface AiStatus {
  available: boolean;
  model: string | null;
}

let cached: Promise<AiStatus> | null = null;

export function aiStatus(): Promise<AiStatus> {
  cached ??= (async () => {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 4000);
      const res = await fetch('/api/ai/status', { signal: ac.signal });
      clearTimeout(t);
      if (!res.ok) return { available: false, model: null };
      const body = (await res.json()) as AiStatus;
      return { available: !!body.available, model: body.model ?? null };
    } catch {
      // No server (static hosting, shared page): image generation is unavailable.
      return { available: false, model: null };
    }
  })();
  return cached;
}

export interface GenerateRequest {
  prompt: string;
  width: number;
  height: number;
  /** Data URLs. The first is the scene to edit; the rest are references. */
  images: string[];
  seed?: number;
}

export class AiError extends Error {}

export async function aiGenerate(req: GenerateRequest, signal?: AbortSignal): Promise<{ image: string; model: string }> {
  let res: Response;
  try {
    res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new AiError('Couldn’t reach the Forma server. Check your connection and try again.');
  }
  const body = (await res.json().catch(() => ({}))) as { image?: string; model?: string; error?: string };
  if (!res.ok || !body.image) throw new AiError(body.error ?? `Image generation failed (${res.status}).`);
  return { image: body.image, model: body.model ?? '' };
}
