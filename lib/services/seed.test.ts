import { promises as fs } from "fs";
import path from "path";
import { SUPABASE_WORKER_URL } from "@/config/supabase";
import { getEmbeddingProviderOptions } from "@/config/ai";
import { seedMovieEmbeddings, splitMovieContentIntoChunks } from "./seed";

jest.mock("fs", () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockFs = jest.mocked(require("fs").promises);

jest.mock("path", () => ({
  join: jest.fn(),
}));

jest.mock("@/services/embeddings", () => ({
  normaliseEmbeddingVector: jest.fn((arr) => arr),
}));

jest.mock("ai", () => ({
  embed: jest.fn(),
}));

jest.mock("@/config/ai", () => ({
  getEmbeddingModel: jest.fn(() => "mock-model"),
  getEmbeddingProviderOptions: jest.fn(() => ({
    google: { outputDimensionality: 768 },
  })),
}));

global.fetch = jest.fn();

import { embed } from "ai";

describe("splitMovieContentIntoChunks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join("/"));
  });

  it("should split content on double newlines into one chunk per movie", async () => {
    const mockContent =
      "Movie A: 2024 | PG-13 | 2h | 7.0\nSynopsis A\n\nMovie B: 2023 | R | 1h 30m | 8.0\nSynopsis B";

    mockFs.access.mockResolvedValueOnce(undefined);
    mockFs.readFile.mockResolvedValueOnce(mockContent);

    const result = await splitMovieContentIntoChunks("test/path");

    expect(path.join).toHaveBeenCalledWith(expect.any(String), "public", "test/path");
    expect(fs.readFile).toHaveBeenCalledWith(expect.any(String), "utf-8");
    expect(result).toEqual([
      { pageContent: "Movie A: 2024 | PG-13 | 2h | 7.0\nSynopsis A" },
      { pageContent: "Movie B: 2023 | R | 1h 30m | 8.0\nSynopsis B" },
    ]);
  });

  it("should filter out empty chunks from extra blank lines", async () => {
    const mockContent = "Movie A\n\n\n\nMovie B\n\n";

    mockFs.access.mockResolvedValueOnce(undefined);
    mockFs.readFile.mockResolvedValueOnce(mockContent);

    const result = await splitMovieContentIntoChunks("test/path");

    expect(result).toEqual([{ pageContent: "Movie A" }, { pageContent: "Movie B" }]);
  });

  it("should throw error if file not found", async () => {
    mockFs.access.mockRejectedValueOnce(new Error("File not found"));

    await expect(splitMovieContentIntoChunks("invalid/path")).rejects.toThrow(
      "File not found at path:"
    );
  });
});

describe("seedMovieEmbeddings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue("chunk1\n\nchunk2");
    (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join("/"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should skip seeding if table is not empty", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ isEmpty: false }),
    });

    const result = await seedMovieEmbeddings();

    expect(result).toEqual({
      success: true,
      message: "Table already populated",
    });
  });

  it("should successfully seed embeddings", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ isEmpty: true }),
    });

    const mockEmbedding = [1, 2, 3];
    (embed as jest.Mock)
      .mockResolvedValueOnce({ embedding: mockEmbedding })
      .mockResolvedValueOnce({ embedding: mockEmbedding });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const result = await seedMovieEmbeddings();

    expect(result).toEqual({
      success: true,
      message: "Embeddings created and stored successfully",
      count: 2,
    });

    expect(embed).toHaveBeenCalledTimes(2);

    expect(fetch).toHaveBeenCalledWith(
      `${SUPABASE_WORKER_URL}/api/insert-movies`,
      expect.any(Object)
    );
  });

  it("should truncate and reseed when force is true", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const mockEmbedding = [1, 2, 3];
    (embed as jest.Mock)
      .mockResolvedValueOnce({ embedding: mockEmbedding })
      .mockResolvedValueOnce({ embedding: mockEmbedding });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const result = await seedMovieEmbeddings(true);

    expect(result).toEqual({
      success: true,
      message: "Embeddings created and stored successfully",
      count: 2,
    });

    expect(fetch).toHaveBeenCalledWith(`${SUPABASE_WORKER_URL}/api/truncate-movies`, {
      headers: {},
      method: "DELETE",
    });
  });

  it("should not check emptiness when force is true", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    (embed as jest.Mock)
      .mockResolvedValueOnce({ embedding: [1, 2, 3] })
      .mockResolvedValueOnce({ embedding: [1, 2, 3] });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await seedMovieEmbeddings(true);

    expect(fetch).not.toHaveBeenCalledWith(
      `${SUPABASE_WORKER_URL}/api/check-empty`,
      expect.anything()
    );
  });

  it("should handle errors when truncation fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(seedMovieEmbeddings(true)).rejects.toThrow("Failed to truncate table: 500");
  });

  it("should handle errors in table check", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(seedMovieEmbeddings()).rejects.toThrow("Failed to check if table is empty: 500");
  });

  it("should handle errors in embedding creation", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ isEmpty: true }),
    });

    (embed as jest.Mock).mockRejectedValueOnce(new Error("Embedding API error"));

    await expect(seedMovieEmbeddings()).rejects.toThrow(
      "Failed to get embeddings for chunk 0: Embedding API error"
    );
  });

  it("should handle errors in batch storage", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ isEmpty: true }),
    });

    (embed as jest.Mock)
      .mockResolvedValueOnce({ embedding: [1, 2, 3] })
      .mockResolvedValueOnce({ embedding: [1, 2, 3] });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(seedMovieEmbeddings()).rejects.toThrow("Failed to insert batch: 500");
  });

  it("should handle batch storage API errors", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ isEmpty: true }),
    });

    (embed as jest.Mock)
      .mockResolvedValueOnce({ embedding: [1, 2, 3] })
      .mockResolvedValueOnce({ embedding: [1, 2, 3] });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: "Database error" }),
    });

    await expect(seedMovieEmbeddings()).rejects.toThrow("Error inserting batch: Database error");
  });

  it("calls embed without providerOptions when getEmbeddingProviderOptions returns null", async () => {
    // Override the mock to return null for this test only
    (getEmbeddingProviderOptions as jest.Mock).mockReturnValueOnce(null);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ isEmpty: true }),
    });

    (embed as jest.Mock)
      .mockResolvedValueOnce({ embedding: [1, 2, 3] })
      .mockResolvedValueOnce({ embedding: [1, 2, 3] });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await seedMovieEmbeddings();

    // embed should have been called without providerOptions
    expect(embed).toHaveBeenCalledWith(
      expect.not.objectContaining({ providerOptions: expect.anything() })
    );
  });
});
