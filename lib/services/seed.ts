import { promises as fs } from "fs";
import path from "path";
import { embed } from "ai";
import { normaliseEmbeddingVector } from "@/services/embeddings";
import { getEmbeddingModel, getEmbeddingProviderOptions } from "@/config/ai";
import { getSupabaseWorkerHeaders, SUPABASE_WORKER_URL } from "@/config/supabase";

const BATCH_SIZE = 10;

async function isMovieEmbeddingsTableEmpty() {
  const response = await fetch(`${SUPABASE_WORKER_URL}/api/check-empty`, {
    headers: getSupabaseWorkerHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to check if table is empty: ${response.status}`);
  }
  return response.json();
}

async function truncateMovieEmbeddings() {
  const response = await fetch(`${SUPABASE_WORKER_URL}/api/truncate-movies`, {
    method: "DELETE",
    headers: getSupabaseWorkerHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to truncate table: ${response.status}`);
  }
  return response.json();
}

async function createChunkEmbedding(chunk: { pageContent: string }, index: number) {
  try {
    const providerOptions = getEmbeddingProviderOptions();
    const { embedding } = await embed({
      model: getEmbeddingModel(),
      value: chunk.pageContent,
      ...(providerOptions ? { providerOptions } : {}),
    });
    return {
      content: chunk.pageContent,
      embedding: normaliseEmbeddingVector(embedding),
    };
  } catch (error) {
    throw new Error(
      `Failed to get embeddings for chunk ${index}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function storeMovieEmbeddingsBatch(batch: unknown[]) {
  const response = await fetch(`${SUPABASE_WORKER_URL}/api/insert-movies`, {
    method: "POST",
    headers: getSupabaseWorkerHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ batch }),
  });

  if (!response.ok) {
    throw new Error(`Failed to insert batch: ${response.status}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(`Error inserting batch: ${result.error}`);
  }
  return result;
}

/**
 * Seeds the movie embeddings table. Skips if already populated unless `force` is true,
 * in which case the table is truncated first. Splits `public/constants/movies.txt` on
 * movie boundaries (double newlines), embeds each entry, and POSTs batches to the worker.
 */
export async function seedMovieEmbeddings(force = false) {
  try {
    if (force) {
      await truncateMovieEmbeddings();
    } else {
      const { isEmpty } = await isMovieEmbeddingsTableEmpty();
      if (!isEmpty) {
        return { success: true, message: "Table already populated" };
      }
    }

    // Split document
    const chunks = await splitMovieContentIntoChunks("constants/movies.txt");

    // Process chunks sequentially to avoid exceeding provider rate limits
    const data: Awaited<ReturnType<typeof createChunkEmbedding>>[] = [];
    for (let i = 0; i < chunks.length; i++) {
      data.push(await createChunkEmbedding(chunks[i], i));
    }

    // Insert in batches
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      await storeMovieEmbeddingsBatch(batch);
    }

    return {
      success: true,
      message: "Embeddings created and stored successfully",
      count: data.length,
    };
  } catch (error) {
    console.error("Error in seedMovieEmbeddings:", error);
    throw error;
  }
}

/** Reads `public/{filePath}` and splits on double newlines so each movie entry is its own chunk. Throws if the file is missing. */
export async function splitMovieContentIntoChunks(filePath: string) {
  const absolutePath = path.join(process.cwd(), "public", filePath);

  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`File not found at path: ${absolutePath}`);
  }

  const fileContent = await fs.readFile(absolutePath, "utf-8");

  return fileContent
    .split("\n\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((content) => ({ pageContent: content }));
}
