import { promises as fs } from "fs";
import path from "path";
import { SUPABASE_WORKER_URL } from "@/config/supabase";
import { seedMovieEmbeddings, splitMovieContentIntoChunks } from "./seed";

// Mock external dependencies
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

jest.mock("langchain/text_splitter", () => ({
  RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => ({
    createDocuments: jest
      .fn()
      .mockResolvedValue([{ pageContent: "chunk1" }, { pageContent: "chunk2" }]),
  })),
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

// Mock fetch globally for Supabase worker calls
global.fetch = jest.fn();

import { embed } from "ai";

describe("splitMovieContentIntoChunks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join("/"));
  });

  it("should successfully split content into chunks", async () => {
    const mockContent = "Test movie content";
    const mockChunks = [{ pageContent: "chunk1" }, { pageContent: "chunk2" }];

    mockFs.access.mockResolvedValueOnce(undefined);
    mockFs.readFile.mockResolvedValueOnce(mockContent);

    const result = await splitMovieContentIntoChunks("test/path");

    expect(path.join).toHaveBeenCalledWith(expect.any(String), "public", "test/path");
    expect(fs.readFile).toHaveBeenCalledWith(expect.any(String), "utf-8");
    expect(result).toEqual(mockChunks);
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
    // Mock table empty check
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ isEmpty: true }),
    });

    // Mock embed() for both chunks
    const mockEmbedding = [1, 2, 3];
    (embed as jest.Mock)
      .mockResolvedValueOnce({ embedding: mockEmbedding })
      .mockResolvedValueOnce({ embedding: mockEmbedding });

    // Mock batch storage
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

    // Verify embed was called for each chunk
    expect(embed).toHaveBeenCalledTimes(2);

    // Verify batch storage call
    expect(fetch).toHaveBeenCalledWith(
      `${SUPABASE_WORKER_URL}/api/insert-movies`,
      expect.any(Object)
    );
  });

  it("should handle errors in table check", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(seedMovieEmbeddings()).rejects.toThrow("Failed to check if table is empty: 500");
  });

  it("should handle errors in embedding creation", async () => {
    // Mock table empty check
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ isEmpty: true }),
    });

    // Mock embed() throwing for one chunk
    (embed as jest.Mock).mockRejectedValueOnce(new Error("Embedding API error"));

    await expect(seedMovieEmbeddings()).rejects.toThrow(
      "Failed to get embeddings for chunk 0: Embedding API error"
    );
  });

  it("should handle errors in batch storage", async () => {
    // Mock table empty check
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ isEmpty: true }),
    });

    // Mock successful embedding creation for both chunks
    (embed as jest.Mock)
      .mockResolvedValueOnce({ embedding: [1, 2, 3] })
      .mockResolvedValueOnce({ embedding: [1, 2, 3] });

    // Mock batch storage error
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(seedMovieEmbeddings()).rejects.toThrow("Failed to insert batch: 500");
  });

  it("should handle batch storage API errors", async () => {
    // Mock table empty check
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ isEmpty: true }),
    });

    // Mock successful embedding creation for both chunks
    (embed as jest.Mock)
      .mockResolvedValueOnce({ embedding: [1, 2, 3] })
      .mockResolvedValueOnce({ embedding: [1, 2, 3] });

    // Mock batch storage API error response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: "Database error" }),
    });

    await expect(seedMovieEmbeddings()).rejects.toThrow("Error inserting batch: Database error");
  });
});
