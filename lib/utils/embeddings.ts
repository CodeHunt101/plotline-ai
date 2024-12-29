export function normaliseEmbedding(embedding: number[]) {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  )
  if (magnitude === 0) {
    return embedding
  }
  return embedding.map((val) => val / magnitude)
}
