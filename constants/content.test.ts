import { MOVIES } from "./content";

describe("MOVIES content constant", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(MOVIES)).toBe(true);
    expect(MOVIES.length).toBeGreaterThan(0);
  });

  it("each movie has title, releaseYear, and content fields", () => {
    MOVIES.forEach((movie) => {
      expect(typeof movie.title).toBe("string");
      expect(typeof movie.releaseYear).toBe("string");
      expect(typeof movie.content).toBe("string");
    });
  });
});
