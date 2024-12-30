import ParticipantsSetup from "@/components/features/ParticipantsSetup"
import { initialiseEmbeddingsStorage } from "@/lib/services/embeddings"
import { getBaseUrl } from "@/lib/utils/urls"
import { headers } from "next/headers"

export const dynamic = 'force-dynamic'

export default async function MovieNightForm() {
  try {
    const headersList = await headers()
    const baseUrl = getBaseUrl(headersList)
    
    await initialiseEmbeddingsStorage(baseUrl)
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