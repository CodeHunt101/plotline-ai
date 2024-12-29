import { createAndStoreEmbeddings } from '@/lib/utils/seed'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await createAndStoreEmbeddings()
    return NextResponse.json({ 
      success: true, 
      message: 'Embeddings created and stored successfully' 
    })
  } catch (error) {
    console.error('Error in embeddings-seed API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message 
      }, 
      { status: 500 }
    )
  }
}