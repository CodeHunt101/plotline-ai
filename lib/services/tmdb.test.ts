import { searchMoviePoster, getMovieWatchProviders } from "./tmdb";

describe("searchMoviePoster", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the poster image URL and ID on a successful fetch", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        results: [{ id: 12345, poster_path: "/abc123.jpg" }],
      }),
    });

    const result = await searchMoviePoster("Inception");

    expect(result).toStrictEqual({
      posterUrl: "https://image.tmdb.org/t/p/w342/abc123.jpg",
      id: 12345,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("Inception"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("returns undefined and logs error when fetch throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await searchMoviePoster("Inception");

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns undefined and logs error when json parsing fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error("JSON parse error")),
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await searchMoviePoster("Inception");

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns undefined when the first result has no poster path", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        results: [{}],
      }),
    });

    await expect(searchMoviePoster("Inception")).resolves.toBeUndefined();
  });

  it("returns undefined when the first result has an empty poster path", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        results: [{ id: 12345, poster_path: "" }],
      }),
    });

    await expect(searchMoviePoster("Inception")).resolves.toBeUndefined();
  });

  it("returns undefined and logs an error when TMDb responds with a non-ok status", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn(),
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(searchMoviePoster("Inception")).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("getMovieWatchProviders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns watch providers for a given country code", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 12345,
        results: {
          AU: {
            link: "https://example.com/au",
            flatrate: [
              {
                logo_path: "/au.jpg",
                provider_id: 8,
                provider_name: "Netflix",
                display_priority: 1,
              },
            ],
          },
        },
      }),
    });

    const result = await getMovieWatchProviders(12345, "AU");

    expect(result).toStrictEqual({
      link: "https://example.com/au",
      flatrate: [
        { logo_path: "/au.jpg", provider_id: 8, provider_name: "Netflix", display_priority: 1 },
      ],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/3/movie/12345/watch/providers"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("returns undefined if the country code is not found in results", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 12345,
        results: { US: { link: "..." } },
      }),
    });

    const result = await getMovieWatchProviders(12345, "AU");
    expect(result).toBeUndefined();
  });

  it("returns undefined and logs error when fetch fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network Error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await getMovieWatchProviders(12345, "AU");

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns undefined and logs error when TMDb responds with a non-ok status", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn(),
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await getMovieWatchProviders(12345, "AU");

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
