import { normaliseEmbeddingVector } from "./embeddings";

describe("normaliseEmbeddingVector", () => {
  it("should normalise a non-zero vector", () => {
    const input = [3, 4]; // 3-4-5 triangle for easy magnitude calculation
    const result = normaliseEmbeddingVector(input);

    // Expected values: [3/5, 4/5]
    expect(result[0]).toBeCloseTo(0.6);
    expect(result[1]).toBeCloseTo(0.8);
  });

  it("should handle zero magnitude vectors", () => {
    const input = [0, 0, 0];
    const result = normaliseEmbeddingVector(input);

    expect(result).toEqual([0, 0, 0]);
  });

  it("should preserve vector direction", () => {
    const input = [-2, 2];
    const result = normaliseEmbeddingVector(input);

    // Check if signs are preserved and magnitude is 1
    expect(Math.sign(result[0])).toBe(-1);
    expect(Math.sign(result[1])).toBe(1);
    expect(Math.sqrt(result[0] ** 2 + result[1] ** 2)).toBeCloseTo(1);
  });
});
