import { MovieRecommendation, ParticipantsMovieData } from "@/types/api";

/** Client-side wrapper around the server recommendation pipeline. */
export const getMovieRecommendations = async (
  movieData: ParticipantsMovieData
): Promise<MovieRecommendation> => {
  const response = await fetch("/api/recommendations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(movieData),
  });

  const data = (await response.json()) as { error?: unknown } & Partial<MovieRecommendation>;

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Failed to get movie recommendations"
    );
  }

  if (!Array.isArray(data.match) || !data.result || !Array.isArray(data.result.recommendedMovies)) {
    throw new Error("Movie recommendations response was invalid");
  }

  return data as MovieRecommendation;
};
