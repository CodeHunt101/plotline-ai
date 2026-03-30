import { getSupabaseWorkerHeaders, SUPABASE_WORKER_URL } from "@/config/supabase";
import { MovieRecord } from "@/types/api";

/** POSTs to the worker `/api/match-movies` (`match_movies_4` RPC). Returns an empty list when there are no matches or the worker reports an error. */
export async function matchMoviesByEmbedding(embedding: number[]): Promise<MovieRecord[]> {
  const response = await fetch(`${SUPABASE_WORKER_URL}/api/match-movies`, {
    method: "POST",
    headers: getSupabaseWorkerHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ embedding }),
  });

  const { matches, error } = (await response.json()) as {
    matches?: MovieRecord[] | null;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(error || `Worker request failed with status ${response.status}`);
  }

  if (error || !matches || matches.length === 0) {
    console.log("No matches found");
    return [];
  }

  console.log(
    "Match scores:",
    matches.map((d: { similarity: number }) => d.similarity)
  );

  return matches;
}
