import { ChatCompletionMessageParam } from 'openai/resources/index.mjs'
import { OPENAI_WORKER_URL } from '@/config/openai'

export const systemMessage: ChatCompletionMessageParam = {
  role: 'system',
  content: `You are a movie expert. IMPORTANT: Recommend 4-10 movies from the provided Movie List Context that match User Preferences.

Rules:
1. MUST recommend at least 4 movies
2. Only use movies from the Movie List Context but feel free to add information only if it's not provided in the Movie List Context.
3. New movies = 2015-present, Classic movies = before 2015
4. If time limit given, only pick movies that fit
5. Keep movies in original list order

Priority Order:
1. Time limit (if any)
2. New/Classic preference
3. Mood/Theme match
4. Genre interests

Movie List Format:
Title: Year | Rating | Duration | IMDB Score
Synopsis

Return in JSON:
{
  "recommendedMovies": [
    {
      "name": "Movie Title",
      "releaseYear": "YYYY",
      "synopsis": "Synopsis with IMDB score"
    }
  ]
}

If no matches: { "recommendedMovies": [] }
`,
}

export async function getChatCompletion(
  text: string,
  query: string,
  previousMessages: ChatCompletionMessageParam[] = []
) {
  if (!text) {
    console.log("Sorry, I couldn't find any relevant information about that.")
    return
  }

  const messages: ChatCompletionMessageParam[] = [
    systemMessage,
    ...previousMessages,
    {
      role: 'user',
      content: `-Movie List Context: ${text} 
-User Preferences: ${query}`,
    },
  ]

  const response = await fetch(`${OPENAI_WORKER_URL}/api/movies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  const data = await response.json()
  return data.content
}
