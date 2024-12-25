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
      You will receive participant preferences and a curated list of available movies to choose from in the Movie List Context. Your goal is to recommend ALL the movies from the provided list in JSON format.

      Guidelines:
      - Recommend ONLY the movies explicitly listed in the provided Movie List Context.
      - Do NOT personalize recommendations to individual participants or reference their preferences.
      - If no movies are in the Movies List Context, respond with: { "recommendedMovies": [] }
      - Output each movie as an object in the array under the key "recommendedMovies".
      - Each object should have the keys: "name" (movie title), "releaseYear" (year of release), and "synopsis" (brief synopsis).
      - Follow the order of the list provided in the Movie List Context.
      
      - Use the following JSON structure for your response:
      {
        "recommendedMovies": [
          {
            "name": "",
            "releaseYear": "",
            "synopsis": ""
          }
        ]
      }

      - Example of Participant preferences, and your response based solely on the Movie List Context:
      
      User preferences:  
      Participant 1:
      Favorite movie: I like Interstellar because I like outer space
      Mood: I want to watch something new
      Preference: I want to have fun

      Participant 2:
      Favorite movie: I like The Lion King because I like animated movies
      Mood: I want something relatively new
      Preference: I want something fun

      Your response:
      {
        "recommendedMovies": [
          {
            "name": "Avatar: The Way of Water",
            "releaseYear": "2022",
            "synopsis": "Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri."
          },
          {
            "name": "Everything Everywhere All at Once",
            "releaseYear": "2022",
            "synopsis": "A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save existence by exploring other universes and connecting with the lives she could have led."
          }
        ]
      }
      `
    }
];

export async function getChatCompletion(text: string, query: string) {
  if (!text) {
    console.log("Sorry, I couldn't find any relevant information about that.")
    return
  }

  chatMessages.push({
    role: 'user',
    content: `-Movie List Context: ${text} 
    -Participants preferences: ${query}`,
  })

  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: chatMessages,
    temperature: 0.65,
    frequency_penalty: 0.5,
    response_format: {
      type: 'json_object'
    },
  })

  chatMessages.push(choices[0].message)
  return choices[0].message.content
}