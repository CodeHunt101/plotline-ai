import { searchMoviePoster } from "./tmdb";

describe("searchMoviePoster", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the poster image URL on a successful fetch", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        results: [{ poster_path: "/abc123.jpg" }],
      }),
    });

    const result = await searchMoviePoster("Inception");

    expect(result).toBe("https://image.tmdb.org/t/p/w342/abc123.jpg");
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
