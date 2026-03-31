import { ParticipantsMovieData, MovieRecord } from "@/types/api";
import { streamMovieRecommendations } from "./movie-recommendations";

jest.mock("@/lib/services/embeddings-server", () => ({
  createServerEmbedding: jest.fn(),
}));

jest.mock("@/lib/services/ai-service", () => ({
  buildRecommendationMessages: jest.fn(() => [{ role: "user", content: "prompt" }]),
  streamMovieRecommendationsFromMessages: jest.fn(),
}));

jest.mock("@/lib/services/supabase", () => ({
  matchMoviesByEmbedding: jest.fn(),
}));

import { createServerEmbedding } from "@/lib/services/embeddings-server";
import {
  buildRecommendationMessages,
  streamMovieRecommendationsFromMessages,
} from "@/lib/services/ai-service";
import { matchMoviesByEmbedding } from "@/lib/services/supabase";

describe("streamMovieRecommendations", () => {
  const mockMovieData: ParticipantsMovieData = {
    participantsData: [
      {
        favouriteMovie: "Inception",
        movieType: "new",
        moodType: "inspiring",
        favouriteFilmPerson: "Christopher Nolan",
      },
    ],
    timeAvailable: "3 hours",
  };

  const mockEmbedding = [0.1, 0.2, 0.3];
  const mockMatches: MovieRecord[] = [
    {
      id: 1,
      content: "Movie 1: Inception (2010)",
      similarity: 0.9,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a stream object on success", async () => {
    (createServerEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
    (matchMoviesByEmbedding as jest.Mock).mockResolvedValue(mockMatches);
    (streamMovieRecommendationsFromMessages as jest.Mock).mockResolvedValue({
      stream: "mocked_stream",
    });

    const result = await streamMovieRecommendations(mockMovieData);

    expect(result).toEqual({ stream: "mocked_stream" });
    expect(createServerEmbedding).toHaveBeenCalledWith(expect.stringContaining("Participant 1"));
    expect(matchMoviesByEmbedding).toHaveBeenCalledWith(mockEmbedding);
    expect(buildRecommendationMessages).toHaveBeenCalled();
  });

  it("returns null when retrieval finds no matches", async () => {
    (createServerEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
    (matchMoviesByEmbedding as jest.Mock).mockResolvedValue([]);

    await expect(streamMovieRecommendations(mockMovieData)).resolves.toBeNull();
    expect(streamMovieRecommendationsFromMessages).not.toHaveBeenCalled();
  });

  it("re-throws regular Error instances without wrapping them", async () => {
    (createServerEmbedding as jest.Mock).mockRejectedValue(new Error("Embedding failed"));

    await expect(streamMovieRecommendations(mockMovieData)).rejects.toThrow("Embedding failed");
  });

  it("re-throws unknown errors as a generic Error", async () => {
    (createServerEmbedding as jest.Mock).mockRejectedValue("unexpected");

    await expect(streamMovieRecommendations(mockMovieData)).rejects.toThrow(
      "An unknown error occurred"
    );
  });
});
