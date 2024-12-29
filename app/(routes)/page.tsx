import { headers } from 'next/headers'
import ParticipantsSetup from '@/components/features/ParticipantsSetup'

export default async function MovieNightForm() {
  try {
    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    
    const response = await fetch(`${protocol}://${host}/api/embeddings-seed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Embeddings created successfully:', data)
  } catch (error) {
    console.error('Failed to create embeddings:', error)
  }
  
  return <ParticipantsSetup />
}