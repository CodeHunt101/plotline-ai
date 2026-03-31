import {
  emptyMovieRecommendations,
  fallbackMovieRecommendations,
  parseMovieRecommendationsResponse,
  stringifyMovieRecommendationsResponse,
} from "./recommendations";

describe("emptyMovieRecommendations", () => {
  it("returns an object with an empty recommendedMovies array", () => {
    expect(emptyMovieRecommendations()).toEqual({ recommendedMovies: [] });
  });

  it("returns a fresh object on each call", () => {
    const a = emptyMovieRecommendations();
    const b = emptyMovieRecommendations();
    expect(a).not.toBe(b);
  });
});

describe("parseMovieRecommendationsResponse", () => {
  it("returns empty result for null input", () => {
    expect(parseMovieRecommendationsResponse(null)).toEqual({ recommendedMovies: [] });
  });

  it("returns empty result for undefined input", () => {
    expect(parseMovieRecommendationsResponse(undefined)).toEqual({ recommendedMovies: [] });
  });

  it("returns empty result for whitespace-only input", () => {
    expect(parseMovieRecommendationsResponse("   ")).toEqual({ recommendedMovies: [] });
  });

  it("parses a valid JSON string with recommendedMovies", () => {
    const raw = JSON.stringify({
      recommendedMovies: [{ name: "Inception", releaseYear: "2010", synopsis: "Dreams" }],
    });
    expect(parseMovieRecommendationsResponse(raw)).toEqual({
      recommendedMovies: [{ name: "Inception", releaseYear: "2010", synopsis: "Dreams" }],
    });
  });

  it("parses JSON inside a markdown code fence (```json ... ```)", () => {
    const inner = JSON.stringify({
      recommendedMovies: [{ name: "Matrix", releaseYear: "1999", synopsis: "Bullets" }],
    });
    const fenced = "```json\n" + inner + "\n```";
    expect(parseMovieRecommendationsResponse(fenced)).toEqual({
      recommendedMovies: [{ name: "Matrix", releaseYear: "1999", synopsis: "Bullets" }],
    });
  });

  it("parses JSON inside a plain code fence (``` ... ```)", () => {
    const inner = JSON.stringify({ recommendedMovies: [] });
    const fenced = "```\n" + inner + "\n```";
    expect(parseMovieRecommendationsResponse(fenced)).toEqual({ recommendedMovies: [] });
  });

  it("parses JSON when there is leading/trailing noise with braces present", () => {
    const inner = JSON.stringify({
      recommendedMovies: [{ name: "Dune", releaseYear: "2021", synopsis: "Sand" }],
    });
    const noisy = `Some preamble text\n${inner}\nSome trailing text`;
    expect(parseMovieRecommendationsResponse(noisy)).toEqual({
      recommendedMovies: [{ name: "Dune", releaseYear: "2021", synopsis: "Sand" }],
    });
  });

  it("throws when the top-level JSON is valid but not a recommendation object (number)", () => {
    expect(() => parseMovieRecommendationsResponse("1")).toThrow(
      "Movie recommendations response was not valid JSON"
    );
  });

  it("throws when JSON is valid but lacks recommendedMovies key", () => {
    expect(() => parseMovieRecommendationsResponse(JSON.stringify({ movies: [] }))).toThrow(
      "Movie recommendations response was not valid JSON"
    );
  });

  it("throws when all candidates are invalid JSON", () => {
    expect(() => parseMovieRecommendationsResponse("{not json at all}")).toThrow(
      "Movie recommendations response was not valid JSON"
    );
  });
});

describe("stringifyMovieRecommendationsResponse", () => {
  it("returns a canonical JSON string for valid input", () => {
    const raw = JSON.stringify({
      recommendedMovies: [{ name: "Test", releaseYear: "2000", synopsis: "X" }],
    });
    const result = stringifyMovieRecommendationsResponse(raw);
    expect(JSON.parse(result)).toEqual({
      recommendedMovies: [{ name: "Test", releaseYear: "2000", synopsis: "X" }],
    });
  });

  it("returns a canonical JSON string for empty input", () => {
    expect(stringifyMovieRecommendationsResponse(null)).toBe(
      JSON.stringify({ recommendedMovies: [] })
    );
  });

  it("throws for invalid JSON input (delegates to parseMovieRecommendationsResponse)", () => {
    expect(() => stringifyMovieRecommendationsResponse("not valid")).toThrow(
      "Movie recommendations response was not valid JSON"
    );
  });
});

describe("fallbackMovieRecommendations", () => {
  it("skips blank fallback matches", () => {
    expect(fallbackMovieRecommendations([{ content: "   " }])).toEqual({
      recommendedMovies: [],
    });
  });

  it("parses colon-formatted content (Title: Year | ...)", () => {
    const result = fallbackMovieRecommendations([
      {
        content:
          "Interstellar: 2014 | PG-13 | 2h 49m | 8.4 rating\nThe adventures through a wormhole.",
      },
    ]);
    expect(result).toEqual({
      recommendedMovies: [
        {
          name: "Interstellar",
          releaseYear: "2014",
          synopsis: "The adventures through a wormhole.",
        },
      ],
    });
  });

  it("strips leading 'Movie N:' prefix from colon-formatted titles", () => {
    const result = fallbackMovieRecommendations([
      { content: "Movie 1: Inception: 2010 | PG-13 | 2h 28m | 8.8\nA heist inside dreams." },
    ]);
    expect(result.recommendedMovies[0].name).toBe("Inception");
  });

  it("parses dash-formatted content (Title (Year) - Synopsis)", () => {
    const result = fallbackMovieRecommendations([
      { content: "The Dark Knight (2008) - A hero faces a villain without rules." },
    ]);
    expect(result).toEqual({
      recommendedMovies: [
        {
          name: "The Dark Knight",
          releaseYear: "2008",
          synopsis: "A hero faces a villain without rules.",
        },
      ],
    });
  });

  it("parses dash-formatted content with 'Movie N:' prefix", () => {
    const result = fallbackMovieRecommendations([
      {
        content: "Movie 2: Memento (2000) - A man with short-term memory loss seeks revenge.",
      },
    ]);
    expect(result.recommendedMovies[0].name).toBe("Memento");
    expect(result.recommendedMovies[0].releaseYear).toBe("2000");
  });

  it("falls back to generic shape when content format is unrecognised", () => {
    const result = fallbackMovieRecommendations([{ content: "Memento" }]);
    expect(result).toEqual({
      recommendedMovies: [{ name: "Memento", releaseYear: "", synopsis: "Memento" }],
    });
  });

  it("deduplicates movies with the same name and release year", () => {
    const result = fallbackMovieRecommendations([
      { content: "Inception (2010) - A heist in dreams." },
      { content: "Inception (2010) - Duplicate." },
    ]);
    expect(result.recommendedMovies).toHaveLength(1);
  });

  it("does not deduplicate movies with the same name but different years", () => {
    const result = fallbackMovieRecommendations([
      { content: "Sabrina (1954) - Old classic." },
      { content: "Sabrina (1995) - Remake." },
    ]);
    expect(result.recommendedMovies).toHaveLength(2);
  });

  it("caps results at 4 items", () => {
    const movies = Array.from({ length: 6 }, (_, i) => ({
      content: `Movie ${i + 1} (200${i}) - Synopsis ${i + 1}.`,
    }));
    const result = fallbackMovieRecommendations(movies);
    expect(result.recommendedMovies).toHaveLength(4);
  });

  it("uses fallback synopsis from later lines when available for colon-format", () => {
    const result = fallbackMovieRecommendations([
      {
        content: "Gravity: 2013 | PG-13 | 1h 31m | 7.7\nAstronauts fight to survive in space.",
      },
    ]);
    expect(result.recommendedMovies[0].synopsis).toBe("Astronauts fight to survive in space.");
  });

  it("uses entire trimmed content as synopsis when there are no subsequent lines (generic format)", () => {
    // "Movie 1: Arrival" doesn't match colon-year or dash patterns,
    // so it falls to the generic branch: name strips "Movie N:" prefix,
    // but synopsis gets the raw trimmed content (the full string).
    const result = fallbackMovieRecommendations([{ content: "Movie 1: Arrival" }]);
    expect(result.recommendedMovies[0].name).toBe("Arrival");
    expect(result.recommendedMovies[0].synopsis).toBe("Movie 1: Arrival");
  });
});
