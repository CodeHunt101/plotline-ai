import { fallbackMovieRecommendations, parseMovieRecommendationsResponse } from "./recommendations";

describe("recommendations utils", () => {
  it("throws when the parsed JSON is not a recommendation object", () => {
    expect(() => parseMovieRecommendationsResponse("1")).toThrow(
      "Movie recommendations response was not valid JSON"
    );
  });

  it("builds fallback recommendations from colon-formatted movie content", () => {
    const result = fallbackMovieRecommendations([
      {
        content:
          "Interstellar: 2014 | PG-13 | 2h 49m | 8.4 rating\nThe adventures of explorers crossing a wormhole.",
      },
    ]);

    expect(result).toEqual({
      recommendedMovies: [
        {
          name: "Interstellar",
          releaseYear: "2014",
          synopsis: "The adventures of explorers crossing a wormhole.",
        },
      ],
    });
  });

  it("skips blank fallback matches", () => {
    const result = fallbackMovieRecommendations([{ content: "   " }]);

    expect(result).toEqual({ recommendedMovies: [] });
  });

  it("falls back to a generic recommendation shape when content format is unknown", () => {
    const result = fallbackMovieRecommendations([{ content: "Memento" }]);

    expect(result).toEqual({
      recommendedMovies: [
        {
          name: "Memento",
          releaseYear: "",
          synopsis: "Memento",
        },
      ],
    });
  });
});
