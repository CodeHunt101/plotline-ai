import { supabase } from '../config/supabase'
import { openai } from '../config/openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

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
  const { data: existingData, error } = await supabase
    .from('movies_4')
    .select('id')
    .limit(1)

  if (error) {
    console.error('Error checking table:', error.message)
    return
  }

  if (existingData.length > 0) {
    console.log('Table is not empty, skipping insert.')
    return
  }

  console.log('Table is empty, proceeding with insert.')

  const chunkData = await splitDocument('/constants/movies.txt')

  const data = await Promise.all(
    chunkData.map(async (chunk) => {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk.pageContent,
        dimensions: 1536,
      })

      const normalizedEmbedding = normalizeEmbedding(
        embeddingResponse.data[0].embedding
      )

      return {
        content: chunk.pageContent,
        embedding: normalizedEmbedding,
      }
    })
  )

  // Insert in smaller batches to avoid potential size limits
  const batchSize = 100
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const { error } = await supabase.from('movies_4').insert(batch)
    if (error) {
      console.error('Error inserting batch:', error)
    }
  }

  console.log('SUCCESS!')
}

export function normalizeEmbedding(embedding: number[]) {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  )
  return embedding.map((val) => val / magnitude)
}
