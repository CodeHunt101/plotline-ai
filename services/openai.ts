import { openai } from "@/lib/config/openai"
import { normalizeEmbedding } from "@/lib/utils/seed"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"


 export async function createEmbedding(input: string) {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input,
    })
  
    // Normalize the query embedding
    return normalizeEmbedding(embeddingResponse.data[0].embedding)
  }

  const chatMessages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are a passionate movie expert who loves recommending films to others. 
      You'll receive information about the user's preferences and a specific list of available movies to recommend from.
      Your goal is to suggest ONLY movies from the provided movie list, even if you know other films that might be a better match.
      
      Guidelines:
      - You must ONLY recommend movies that are explicitly listed in the provided context
      - Even if you know other perfect matches, you cannot suggest them
      - If none of the movies in the context match the preferences, say: "Sorry, I couldn't find a matching movie in the available options"
      - Your response should explain how the recommended movie relates to the user's preferences
      - Keep the tone friendly and conversational
      - Your response must be in plain text`
    }
  ]

export async function getChatCompletion(text: string, query: string) {
  if (!text) {
    console.log("Sorry, I couldn't find any relevant information about that.")
    return
  }

  console.log('Context:', text)
  console.log('User preferences:', query)

  chatMessages.push({
    role: 'user',
    content: `Context: ${text} User preferences: ${query}`,
  })

  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: chatMessages,
    temperature: 0.65,
    frequency_penalty: 0.5,
  })

  chatMessages.push(choices[0].message)
  return choices[0].message.content
}