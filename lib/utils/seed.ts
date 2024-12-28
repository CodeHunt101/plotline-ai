import { OPENAI_WORKER_URL } from '../config/openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { SUPABASE_WORKER_URL } from '../config/supabase'

async function splitDocument(document: string) {
  const response = await fetch(document)
  const text = await response.text()
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 550,
    chunkOverlap: 75,
  })
  const output = await splitter.createDocuments([text])
  return output
}

export async function createAndStoreEmbeddings() {
  const checkResponse = await fetch(`${SUPABASE_WORKER_URL}/api/check-empty`)
  if (!checkResponse.ok) {
    const error = await checkResponse.json()
    throw new Error(error.message || 'Failed to check if table is empty')
  }
  const { isEmpty } = await checkResponse.json()

  if (!isEmpty) {
    console.log('Table is not empty, skipping insert.')
    return
  }

  console.log('Table is empty, proceeding with insert.')

  const chunkData = await splitDocument('/constants/movies.txt')

  const data = await Promise.all(
    chunkData.map(async (chunk) => {
      const response = await fetch(`${OPENAI_WORKER_URL}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: chunk.pageContent,
          dimensions: 1536,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get embeddings')
      }

      const { embedding } = await response.json()
      const normalisedEmbedding = normaliseEmbedding(embedding)

      return {
        content: chunk.pageContent,
        embedding: normalisedEmbedding,
      }
    })
  )

  // Insert in smaller batches to avoid potential size limits
  const batchSize = 100
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const response = await fetch(`${SUPABASE_WORKER_URL}/api/insert-movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batch }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to insert batch')
    }

    const result = await response.json()
    if (result.error) {
      console.error('Error inserting batch:', result.error)
      return
    }
  }

  console.log('SUCCESS!')
}

export function normaliseEmbedding(embedding: number[]) {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  )
  if (magnitude === 0) {
    return embedding
  }
  return embedding.map((val) => val / magnitude)
}
