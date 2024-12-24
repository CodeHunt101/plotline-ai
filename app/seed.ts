// import fs from 'fs/promises'
// import path from 'path'
import { openai, supabase } from './config'
// import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { MOVIES } from './content'

// async function splitDocument(documentPath: string) {
//   const fullPath = path.resolve(process.cwd(), documentPath)
//   const text = await fs.readFile(fullPath, 'utf-8')
//   const splitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 250,
//     chunkOverlap: 35,
//   })
//   const output = await splitter.createDocuments([text])
//   return output
// }

// export async function createAndStoreEmbeddings() {
//   const { data: existingData, error } = await supabase
//     .from('movies_3')
//     .select('id')
//     .limit(1)

//   if (error) {
//     console.error('Error checking table:', error.message)
//     return
//   }

//   if (existingData.length > 0) {
//     console.log('Table is not empty, skipping insert.')
//     return
//   }

//   console.log('Table is empty, proceeding with insert.')

//   const chunkData = await splitDocument('app/movies.txt')
//   console.log({chunkData})
//   const data = await Promise.all(
//     chunkData.map(async (chunk) => {
//       const embeddingResponse = await openai.embeddings.create({
//         model: 'text-embedding-3-small',
//         input: chunk.pageContent,
//         dimensions: 1536,
//       })

//       const normalizedEmbedding = normalizeEmbedding(
//         embeddingResponse.data[0].embedding
//       )

//       return {
//         content: chunk.pageContent,
//         embedding: normalizedEmbedding,
//       }
//     })
//   )

//   const batchSize = 100
//   for (let i = 0; i < data.length; i += batchSize) {
//     const batch = data.slice(i, i + batchSize)
//     const { error } = await supabase.from('movies_3').insert(batch)
//     if (error) {
//       console.error('Error inserting batch:', error)
//     }
//   }

//   console.log('SUCCESS!')
// }

export async function createAndStoreEmbeddings() {
  const { data: existingData, error } = await supabase
    .from('movies_3')
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

  // Loop through MOVIES directly
  const data = await Promise.all(
    MOVIES.map(async (movie) => {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: movie.content,
        dimensions: 1536,
      })

      const normalizedEmbedding = normalizeEmbedding(
        embeddingResponse.data[0].embedding
      )

      return {
        title: movie.title,
        release_year: movie.releaseYear,
        content: movie.content,
        embedding: normalizedEmbedding,
      }
    })
  )

  const batchSize = 100
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const { error } = await supabase.from('movies_3').insert(batch)
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
