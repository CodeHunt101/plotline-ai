import { ParticipantsMovieData, MovieRecord } from "@/types/api";
import { buildMovieRecommendations } from "./movie-recommendations";

jest.mock("@/lib/services/embeddings-server", () => ({
  createServerEmbedding: jest.fn(),
}));

jest.mock("@/lib/services/openai", () => ({
  buildRecommendationMessages: jest.fn(() => [{ role: "user", content: "prompt" }]),
  generateMovieRecommendationsFromMessages: jest.fn(),
}));

jest.mock("@/lib/services/supabase", () => ({
  matchMoviesByEmbedding: jest.fn(),
}));

import { createServerEmbedding } from "@/lib/services/embeddings-server";
import {
  buildRecommendationMessages,
  generateMovieRecommendationsFromMessages,
} from "@/lib/services/openai";
import { matchMoviesByEmbedding } from "@/lib/services/supabase";

describe("buildMovieRecommendations", () => {
  const mockMovieData: ParticipantsMovieData = {
    participantsData: [
      {
        favouriteMovie: "Inception",
        movieType: "new",
        moodType: "inspiring",
        favouriteFilmPerson: "Christopher Nolan",
      },
      {
        favouriteMovie: "The Lion King",
        movieType: "classic",
        moodType: "fun",
        favouriteFilmPerson: "Morgan Freeman",
      },
    ],
    timeAvailable: "3 hours",
  };

  const mockEmbedding = [0.1, 0.2, 0.3];
  const mockMatches: MovieRecord[] = [
    {
      id: 1,
      content: "Movie 1: Inception (2010) - A mind-bending thriller. IMDB: 8.8",
      similarity: 0.9,
    },
    {
      id: 2,
      content: "Movie 2: The Dark Knight (2008) - A superhero epic. IMDB: 9.0",
      similarity: 0.8,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns ranked recommendations on success", async () => {
    (createServerEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
    (matchMoviesByEmbedding as jest.Mock).mockResolvedValue(mockMatches);
    (generateMovieRecommendationsFromMessages as jest.Mock).mockResolvedValue(
      JSON.stringify({
        recommendedMovies: [
          {
            name: "Inception",
            releaseYear: "2010",
            synopsis: "A mind-bending thriller. IMDB: 8.8",
          },
        ],
      })
    );

    await expect(buildMovieRecommendations(mockMovieData)).resolves.toEqual({
      match: mockMatches,
      result: {
        recommendedMovies: [
          {
            name: "Inception",
            releaseYear: "2010",
            synopsis: "A mind-bending thriller. IMDB: 8.8",
          },
        ],
      },
    });

    expect(createServerEmbedding).toHaveBeenCalledWith(expect.stringContaining("Participant 1"));
    expect(matchMoviesByEmbedding).toHaveBeenCalledWith(mockEmbedding);
    expect(buildRecommendationMessages).toHaveBeenCalled();
  });

  it("returns an empty result when retrieval finds no matches", async () => {
    (createServerEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
    (matchMoviesByEmbedding as jest.Mock).mockResolvedValue([]);

    await expect(buildMovieRecommendations(mockMovieData)).resolves.toEqual({
      match: [],
      result: { recommendedMovies: [] },
    });
    expect(generateMovieRecommendationsFromMessages).not.toHaveBeenCalled();
  });

  it("falls back to retrieval content when the model output is invalid", async () => {
    (createServerEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
    (matchMoviesByEmbedding as jest.Mock).mockResolvedValue(mockMatches);
    (generateMovieRecommendationsFromMessages as jest.Mock).mockResolvedValue("not valid json");

    await expect(buildMovieRecommendations(mockMovieData)).resolves.toEqual({
      match: mockMatches,
      result: {
        recommendedMovies: [
          {
            name: "Inception",
            releaseYear: "2010",
            synopsis: "A mind-bending thriller. IMDB: 8.8",
          },
          {
            name: "The Dark Knight",
            releaseYear: "2008",
            synopsis: "A superhero epic. IMDB: 9.0",
          },
        ],
      },
    });
  });

  it("re-throws invalid model output when the fallback is unusable", async () => {
    (createServerEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
    (matchMoviesByEmbedding as jest.Mock).mockResolvedValue([
      {
        id: 1,
        content: "   ",
        similarity: 0.9,
      },
    ]);
    (generateMovieRecommendationsFromMessages as jest.Mock).mockResolvedValue("not valid json");

    await expect(buildMovieRecommendations(mockMovieData)).rejects.toThrow(
      "Movie recommendations response was not valid JSON"
    );
  });

  it("falls back to retrieval content when the model returns an empty list", async () => {
    (createServerEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
    (matchMoviesByEmbedding as jest.Mock).mockResolvedValue(mockMatches);
    (generateMovieRecommendationsFromMessages as jest.Mock).mockResolvedValue(
      '{"recommendedMovies":[]}'
    );

    await expect(buildMovieRecommendations(mockMovieData)).resolves.toEqual({
      match: mockMatches,
      result: {
        recommendedMovies: [
          {
            name: "Inception",
            releaseYear: "2010",
            synopsis: "A mind-bending thriller. IMDB: 8.8",
          },
          {
            name: "The Dark Knight",
            releaseYear: "2008",
            synopsis: "A superhero epic. IMDB: 9.0",
          },
        ],
      },
    });
  });

  it("re-throws regular Error instances without wrapping them", async () => {
    (createServerEmbedding as jest.Mock).mockRejectedValue(new Error("Embedding failed"));

    await expect(buildMovieRecommendations(mockMovieData)).rejects.toThrow("Embedding failed");
  });

  it("re-throws unknown errors as a generic Error", async () => {
    (createServerEmbedding as jest.Mock).mockRejectedValue("unexpected");

    await expect(buildMovieRecommendations(mockMovieData)).rejects.toThrow(
      "An unknown error occurred"
    );
  });
});
