import { seedMovieEmbeddings } from '@/lib/services/seed'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const result = await seedMovieEmbeddings()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in embeddings-seed API:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
