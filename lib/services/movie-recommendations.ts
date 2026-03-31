import "server-only";

import { ParticipantsMovieData } from "@/types/api";
import { createServerEmbedding } from "@/lib/services/embeddings-server";
import {
  buildRecommendationMessages,
  streamMovieRecommendationsFromMessages,
} from "@/lib/services/ai-service";
import { matchMoviesByEmbedding } from "@/lib/services/supabase";

function buildEmbeddingInput(movieData: ParticipantsMovieData): string {
  return (
    movieData.participantsData
      .map(
        (data, index) =>
          `Participant ${index + 1}:\nFavourite movie: ${
            data.favouriteMovie
          }\nI want to see: ${data.movieType} movies\nMood for: ${
            data.moodType
          } movies \nFavourite film person to be stranded on an island with: ${
            data.favouriteFilmPerson
          }\n`
      )
      .join("\n") + `\nTime available for all participants: ${movieData.timeAvailable}`
  );
}

/** Full server-side recommendation pipeline: embed -> retrieve -> rank -> stream. */
export async function streamMovieRecommendations(movieData: ParticipantsMovieData) {
  try {
    const embeddingInput = buildEmbeddingInput(movieData);
    const embedding = await createServerEmbedding(embeddingInput);
    const match = await matchMoviesByEmbedding(embedding);

    if (match.length === 0) {
      return null;
    }

    const separatedMovies = match.flatMap((movie) => {
      const movies = movie.content.split("\n\n").filter(Boolean);
      return movies.map((movieContent) => ({
        ...movie,
        content: movieContent.trim(),
      }));
    });

    const movieList = separatedMovies
      .map((movie, index) => `Movie ${index + 1}: ${movie.content}`)
      .join("\n\n");

    const messages = buildRecommendationMessages(movieList, embeddingInput);
    return await streamMovieRecommendationsFromMessages(messages);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred");
  }
}
