/** Client-side embedding via `POST /api/embeddings`; response vector is L2-normalised. */
export async function createEmbedding(input: string) {
  const response = await fetch("/api/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  const data = await response.json();

  return normaliseEmbeddingVector(data.embedding);
}

/** L2 unit vector, or the input unchanged if magnitude is zero (avoids division by zero). */
export function normaliseEmbeddingVector(embedding: number[]) {
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) {
    return embedding;
  }
  return embedding.map((val) => val / magnitude);
}

/** Triggers seeding through `GET {baseUrl}/api/embeddings-seed`. Rethrows after logging on failure. */
export async function initialiseEmbeddingsStorage(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/api/embeddings-seed`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Failed to create embeddings:", error);
    throw error;
  }
}
