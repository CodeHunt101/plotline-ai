import { promises as fs } from 'fs'
import path from 'path'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { SUPABASE_WORKER_URL } from '../config/supabase'
import { OPENAI_WORKER_URL } from '../config/openai'
import { normaliseEmbedding } from './embeddings'

export async function splitDocument(filePath: string) {
  try {
    const absolutePath = path.join(process.cwd(), 'public', filePath)

    try {
      await fs.access(absolutePath)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error(`File not found at path: ${absolutePath}`)
    }

    const fileContent = await fs.readFile(absolutePath, 'utf-8')

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 550,
      chunkOverlap: 75,
    })

    const chunks = await splitter.createDocuments([fileContent])
    return chunks
  } catch (error) {
    console.error('Error in splitDocument:', error)
    throw error
  }
}

export async function createAndStoreEmbeddings() {
  try {
    const checkResponse = await fetch(`${SUPABASE_WORKER_URL}/api/check-empty`)
    if (!checkResponse.ok) {
      throw new Error(
        `Failed to check if table is empty: ${checkResponse.status}`
      )
    }

    const { isEmpty } = await checkResponse.json()

    if (!isEmpty) {
      console.log('Table is not empty, skipping insert.')
      return { success: true, message: 'Table already populated' }
    }

    console.log('Table is empty, proceeding with insert.')

    const chunkData = await splitDocument('constants/movies.txt')

    const data = await Promise.all(
      chunkData.map(async (chunk, index) => {
        try {
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
            throw new Error(`Failed to get embeddings: ${response.status}`)
          }

          const { embedding } = await response.json()
          const normalisedEmbedding = normaliseEmbedding(embedding)

          return {
            content: chunk.pageContent,
            embedding: normalisedEmbedding,
          }
        } catch (error) {
          console.error(`Error processing chunk ${index}:`, error)
          throw error
        }
      })
    )

    // Insert in smaller batches
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
        throw new Error(`Failed to insert batch: ${response.status}`)
      }

      const result = await response.json()
      if (result.error) {
        throw new Error(`Error inserting batch: ${result.error}`)
      }
    }

    console.log('Embeddings created and stored successfully!')
    return {
      success: true,
      message: 'Embeddings created and stored successfully',
    }
  } catch (error) {
    console.error('Error in createAndStoreEmbeddings:', error)
    throw error
  }
}
