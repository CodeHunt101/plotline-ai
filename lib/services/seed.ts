import { promises as fs } from 'fs'
import path from 'path'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { normaliseEmbeddingVector } from '@/services/embeddings'
import { SUPABASE_WORKER_URL } from '@/config/supabase'
import { OPENAI_WORKER_URL } from '@/config/openai'

const BATCH_SIZE = 100
const CHUNK_SIZE = 550
const CHUNK_OVERLAP = 75

async function isMovieEmbeddingsTableEmpty() {
  const response = await fetch(`${SUPABASE_WORKER_URL}/api/check-empty`)
  if (!response.ok) {
    throw new Error(`Failed to check if table is empty: ${response.status}`)
  }
  return response.json()
}

async function createChunkEmbedding(chunk: { pageContent: string }, index: number) {
  const response = await fetch(`${OPENAI_WORKER_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: chunk.pageContent,
      dimensions: 1536,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get embeddings for chunk ${index}: ${response.status}`)
  }

  const { embedding } = await response.json()
  return {
    content: chunk.pageContent,
    embedding: normaliseEmbeddingVector(embedding),
  }
}

async function storeMovieEmbeddingsBatch(batch: unknown[]) {
  const response = await fetch(`${SUPABASE_WORKER_URL}/api/insert-movies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch }),
  })

  if (!response.ok) {
    throw new Error(`Failed to insert batch: ${response.status}`)
  }

  const result = await response.json()
  if (result.error) {
    throw new Error(`Error inserting batch: ${result.error}`)
  }
  return result
}

export async function seedMovieEmbeddings() {
  try {
    // Check if table is already populated
    const { isEmpty } = await isMovieEmbeddingsTableEmpty()
    if (!isEmpty) {
      return { success: true, message: 'Table already populated' }
    }

    // Split document
    const chunks = await splitMovieContentIntoChunks('constants/movies.txt')
    
    // Process chunks in parallel with rate limiting
    const data = await Promise.all(
      chunks.map((chunk, index) => 
            createChunkEmbedding(chunk, index)
      )
    )

    // Insert in batches
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      await storeMovieEmbeddingsBatch(batch)
    }

    return {
      success: true,
      message: 'Embeddings created and stored successfully',
      count: data.length,
    }
  } catch (error) {
    console.error('Error in seedMovieEmbeddings:', error)
    throw error
  }
}

export async function splitMovieContentIntoChunks(filePath: string) {
  const absolutePath = path.join(process.cwd(), 'public', filePath)

  try {
    await fs.access(absolutePath)
  } catch {
    throw new Error(`File not found at path: ${absolutePath}`)
  }

  const fileContent = await fs.readFile(absolutePath, 'utf-8')

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  })

  return splitter.createDocuments([fileContent])
}
