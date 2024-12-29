import { normaliseEmbedding } from "./embeddings"

describe('normaliseEmbedding', () => {
  it('should correctly normalize a vector', () => {
    const input = [3, 4] // Simple 3-4-5 triangle for easy verification
    const expected = [0.6, 0.8] // 3/5 and 4/5
    const result = normaliseEmbedding(input)

    result.forEach((val, idx) => {
      expect(val).toBeCloseTo(expected[idx], 5)
    })
  })

  it('should handle zero vectors', () => {
    const input = [0, 0, 0]
    const result = normaliseEmbedding(input)
    expect(result).toEqual([0, 0, 0])
  })

  it('should maintain vector direction after normalization', () => {
    const input = [2, 4, 4]
    const result = normaliseEmbedding(input)

    // Check if ratios between components are maintained
    expect(result[1] / result[0]).toBeCloseTo(2, 5)
    expect(result[2] / result[0]).toBeCloseTo(2, 5)
  })
})