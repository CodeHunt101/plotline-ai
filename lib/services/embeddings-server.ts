import "server-only";

import { embed } from "ai";
import { getEmbeddingModel, getEmbeddingProviderOptions } from "@/config/ai";
import { normaliseEmbeddingVector } from "@/lib/services/embeddings";

/** Server-side embedding generation used by recommendation APIs. */
export async function createServerEmbedding(input: string): Promise<number[]> {
  const providerOptions = getEmbeddingProviderOptions();
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: input,
    ...(providerOptions ? { providerOptions } : {}),
  });

  return normaliseEmbeddingVector(embedding);
}
