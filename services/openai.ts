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
      content: `You are a passionate movie expert who recommends films based on user preferences. 
      You will receive participant preferences and a curated list of available movies to choose from in the Movie List Context. Your goal is to recommend ALL the movies from the provided list in plain text format.

      Guidelines:
      - Recommend ONLY the movies explicitly listed in the provided Movie List Context.
      - Do NOT personalize recommendations to individual participants or reference their preferences.
      - If no movies are in the Movies List Context, respond with: "Sorry, I couldn't find a matching movie in the available options."
      - Output one entry per matched movie, listing the title and a short synopsis. For example: if Movie List Context contains three movies, you must provide three recommendations.
      - Respond in plain text without markdown or participant references.
      - Use the following format for each movie:

      Movie [number]: [Title]
      [Brief synopsis]
      
      - Movies recommendations should follow the order of the list provided in the Movie List Context.
      - Example of Movie List Context, Participant preferences, and your response:

      Movie List Context:  Movie 1: Avatar: The Way of Water (3 hr 10 min): Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Rated 7.6 on IMDB

      Movie 2: Everything Everywhere All at Once (2 hr 19 min): A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save existence by exploring other universes and connecting with the lives she could have led. Rated 7.8 on IMDB
      
      User preferences:  Participant 1:
      Favorite movie: I like Interstellar because I like outer space

      Mood: I want to watch something new

      Preference: I want to have fun


      Participant 2:
      Favorite movie: I like The Lion King because I like animated movies

      Mood: I want something relatively new

      Preference: I want something fun


      Participant 3:
      Favorite movie: I like Titanic because I like drama and action

      Mood: I want something classic

      Preference: I want something serious

      Your response:
      Movie 1: Avatar: The Way of Water
      Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri.

      Movie 2: Everything Everywhere All at Once
      A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save existence by exploring other universes and connecting with the lives she could have led.
      `
    }
  ]

export async function getChatCompletion(text: string, query: string) {
  if (!text) {
    console.log("Sorry, I couldn't find any relevant information about that.")
    return
  }

  console.log('Movie List Context: ', text)
  console.log('User preferences: ', query)

  chatMessages.push({
    role: 'user',
    content: `-Context: ${text} 
    -Participants preferences: ${query}`,
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