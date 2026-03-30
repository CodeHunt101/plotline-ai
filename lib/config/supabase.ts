const DEFAULT_SUPABASE_WORKER_URL = "http://localhost:7878";

export const SUPABASE_WORKER_URL = process.env.SUPABASE_WORKER_URL || DEFAULT_SUPABASE_WORKER_URL;

export const SUPABASE_WORKER_SECRET = process.env.SUPABASE_WORKER_SECRET || "";

export function getSupabaseWorkerHeaders(
  headers: Record<string, string> = {}
): Record<string, string> {
  return {
    ...headers,
    ...(SUPABASE_WORKER_SECRET ? { "x-worker-secret": SUPABASE_WORKER_SECRET } : {}),
  };
}

/** Wrangler entry: `workers/supabase-worker.ts` (see `wrangler.supabase.toml`). */
