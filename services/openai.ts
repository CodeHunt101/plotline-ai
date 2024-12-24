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
    content: `You are a passionate movie expert who loves recommending films to others. You'll receive information about the user's preferences, such as their favorite movies, mood, or general tastes. Your goal is to suggest movies based on this information and provide a short and concise explanation in the following format without adding any introduction: <movie_name> (<year>): <explanation>. \n\nGuidelines:\n- Only use the information given in the provided context.\n- If the provided context doesn't have enough detail, check the conversation history for clues.\n- If you can't find an answer from either source, say: \"Sorry, I don't know the answer.\"\n- Never make up recommendations outside the provided context.\n- Keep the tone friendly and conversational, as if you're chatting with a friend.`,
  },
]

export async function getChatCompletion(text: string, query: string) {
  if (!text) {
    console.log("Sorry, I couldn't find any relevant information about that.")
    return
  }

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