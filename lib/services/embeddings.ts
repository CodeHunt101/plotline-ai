import { OPENAI_WORKER_URL } from '@/config/openai'

export async function createEmbedding(input: string) {
  const response = await fetch(`${OPENAI_WORKER_URL}/api/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  })

  const data = await response.json()

  return normaliseEmbeddingVector(data.embedding)
}

export function normaliseEmbeddingVector(embedding: number[]) {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  )
  if (magnitude === 0) {
    return embedding
  }
  return embedding.map((val) => val / magnitude)
}

export async function initialiseEmbeddingsStorage(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/api/embeddings-seed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // cache: 'force-cache',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    console.error('Failed to create embeddings:', error)
    throw error
  }
}