import { ParticipantsMovieData } from "@/types/api";
import { getMovieRecommendations } from "./movies";

global.fetch = jest.fn();

describe("getMovieRecommendations", () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("posts movie data to the server recommendation route", async () => {
    const mockRecommendation = {
      match: [{ id: 1, content: "Movie 1", similarity: 0.9 }],
      result: {
        recommendedMovies: [
          {
            name: "Inception",
            releaseYear: "2010",
            synopsis: "A mind-bending thriller.",
          },
        ],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRecommendation),
    });

    await expect(getMovieRecommendations(mockMovieData)).resolves.toEqual(mockRecommendation);
    expect(global.fetch).toHaveBeenCalledWith("/api/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mockMovieData),
    });
  });

  it("throws the route error message when the request fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Chat completion failed" }),
    });

    await expect(getMovieRecommendations(mockMovieData)).rejects.toThrow("Chat completion failed");
  });

  it("throws a generic message when the route fails without a string error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { code: "upstream" } }),
    });

    await expect(getMovieRecommendations(mockMovieData)).rejects.toThrow(
      "Failed to get movie recommendations"
    );
  });

  it("rejects invalid successful responses", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ match: "bad-data", result: null }),
    });

    await expect(getMovieRecommendations(mockMovieData)).rejects.toThrow(
      "Movie recommendations response was invalid"
    );
  });
});
