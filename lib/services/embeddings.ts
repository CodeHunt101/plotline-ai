/** L2 unit vector, or the input unchanged if magnitude is zero (avoids division by zero). */
export function normaliseEmbeddingVector(embedding: number[]) {
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) {
    return embedding;
  }
  return embedding.map((val) => val / magnitude);
}
