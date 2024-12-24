import { openai, supabase } from "./config";
import { normalizeEmbedding } from "./seed";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";


  
  // const query = 'My favourite movie is The Shawshank Redemption Because it taught me to never give up hope no matter how hard life gets. I want to watch movies that were released after 1990. I want to watch something that is a drama movie.'
  
  // createAndStoreEmbeddings()
  // async function main(input: string) {
  //   try {
  //     const embedding = await createEmbedding(input)
  //     const match = await findNearestMatch(embedding)
  //     const result = await getChatCompletion(match, input)
  //     return result
  //   } catch (error) {
  //     console.error('Error in main function:', error)
  //   }
  // }
  
  export async function createEmbedding(input: string) {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input,
    })
  
    // Normalize the query embedding
    return normalizeEmbedding(embeddingResponse.data[0].embedding)
  }
  
  export async function findNearestMatch(embedding: number[]) {
    const { data } = await supabase.rpc('match_movies_3', {
      query_embedding: embedding,
      match_threshold: 0.1, // Lowered threshold for text-embedding-3-small
      match_count: 1,
    })
  
    if (!data || data.length === 0) {
      console.log('No matches found')
      return ''
    }
  
    console.log(
      'Match scores:',
      data.map((d: {id: number, content: string, similarity: number}) => d.similarity)
    )
    const match = data.map((obj: { content: {id: number, content: string, similarity: number}; }) => obj.content).join('\n')
    return match
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

