import type { ModelMessage } from "ai";

export const systemMessage: ModelMessage = {
  role: "system",
  content: `You are a movie expert. IMPORTANT: Recommend 1-10 movies from the provided Movie List Context that match User Preferences.

Rules:
1. Return between 1 and 10 movies when the context contains suitable matches
2. Only use movies from the Movie List Context but feel free to add information only if it's not provided in the Movie List Context.
3. New movies = 2015-present, Classic movies = before 2015
4. If time limit given, only pick movies that fit
5. Keep movies in original list order
6. Return raw JSON only. Do not wrap the response in Markdown or code fences.
7. If fewer than 4 strong matches are available, return the available matches instead of an empty list.

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
};

export async function getChatCompletion(
  text: string,
  query: string,
  previousMessages: ModelMessage[] = []
) {
  if (!text) {
    console.log("Sorry, I couldn't find any relevant information about that.");
    return;
  }

  const messages: ModelMessage[] = [
    systemMessage,
    ...previousMessages,
    {
      role: "user",
      content: `-Movie List Context: ${text} 
-User Preferences: ${query}`,
    },
  ];

  const response = await fetch("/api/movies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  const data = (await response.json()) as { content?: unknown; error?: unknown };

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Failed to get movie recommendations"
    );
  }

  if (typeof data.content !== "string") {
    throw new Error("Movie recommendations response was empty");
  }

  return data.content;
}
