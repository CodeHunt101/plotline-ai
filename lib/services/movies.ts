import { matchMoviesByEmbedding } from "@/services/supabase";
import { getChatCompletion } from "@/services/openai";
import { MovieRecommendation, ParticipantsMovieData } from "@/types/api";
import { createEmbedding } from "@/services/embeddings";
import {
  emptyMovieRecommendations,
  fallbackMovieRecommendations,
  parseMovieRecommendationsResponse,
} from "@/lib/utils/recommendations";

export const getMovieRecommendations = async (
  movieData: ParticipantsMovieData
): Promise<MovieRecommendation> => {
  try {
    const embeddingInput =
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
        .join("\n") + `\nTime available for all participants: ${movieData.timeAvailable}`;

    const embedding = await createEmbedding(embeddingInput);
    const match = await matchMoviesByEmbedding(embedding);

    if (match.length === 0) {
      return {
        match: [],
        result: emptyMovieRecommendations(),
      };
    }

    // Split multi-movie content into separate movies
    const separatedMovies = match.flatMap((movie) => {
      // Split content by double newline to separate multiple movies
      const movies = movie.content.split("\n\n").filter(Boolean);
      return movies.map((movieContent) => ({
        ...movie,
        content: movieContent.trim(),
      }));
    });

    // Now map through the separated movies
    const movieList = separatedMovies
      .map((movie, index) => `Movie ${index + 1}: ${movie.content}`)
      .join("\n\n");

    const result = await getChatCompletion(movieList, embeddingInput);
    const fallbackResult = fallbackMovieRecommendations(separatedMovies);
    let parsedResult = emptyMovieRecommendations();

    try {
      parsedResult = parseMovieRecommendationsResponse(result);
    } catch (error) {
      if (fallbackResult.recommendedMovies.length > 0) {
        return {
          match: separatedMovies,
          result: fallbackResult,
        };
      }

      throw error;
    }

    return {
      match: separatedMovies, // Return the separated movies instead of the original match
      result: parsedResult.recommendedMovies.length > 0 ? parsedResult : fallbackResult,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred");
  }
};
