import ParticipantsSetup from "@/components/features/ParticipantsSetup"
import { initialiseEmbeddingsStorage } from "@/lib/services/embeddings"
import { headers } from "next/headers"

export default async function MovieNightForm() {
  try {
    await initialiseEmbeddingsStorage(headers)
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
