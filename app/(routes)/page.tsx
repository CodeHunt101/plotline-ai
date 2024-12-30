import ParticipantsSetup from "@/components/features/ParticipantsSetup"
import { initialiseEmbeddingsStorage } from "@/lib/services/embeddings"
import { headers } from "next/headers"

export default async function MovieNightForm() {
  try {
    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    
    // Pass the constructed URL base instead of the headers function
    await initialiseEmbeddingsStorage(`${protocol}://${host}`)
    return <ParticipantsSetup />
  } catch (error) {
    console.error(error)
    return (
      <div className="p-4 text-red-600">
        Failed to initialise. Please try again later.
      </div>
    )
  }
}
