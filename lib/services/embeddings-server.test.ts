jest.mock("ai", () => ({
  embed: jest.fn(),
}));

jest.mock("@/config/ai", () => ({
  getEmbeddingModel: jest.fn(() => "mock-model"),
  getEmbeddingProviderOptions: jest.fn(() => ({
    google: { outputDimensionality: 768 },
  })),
}));

jest.mock("@/lib/services/embeddings", () => ({
  normaliseEmbeddingVector: jest.fn((embedding) => embedding),
}));

import { embed } from "ai";
import { getEmbeddingProviderOptions } from "@/config/ai";
import { normaliseEmbeddingVector } from "@/lib/services/embeddings";
import { createServerEmbedding } from "./embeddings-server";

describe("createServerEmbedding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes provider options through to the embedding model", async () => {
    (embed as jest.Mock).mockResolvedValue({ embedding: [1, 2, 3] });

    await expect(createServerEmbedding("test input")).resolves.toEqual([1, 2, 3]);
    expect(embed).toHaveBeenCalledWith({
      model: "mock-model",
      value: "test input",
      providerOptions: { google: { outputDimensionality: 768 } },
    });
    expect(normaliseEmbeddingVector).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("omits provider options when the embedding provider does not require them", async () => {
    (getEmbeddingProviderOptions as jest.Mock).mockReturnValueOnce(undefined);
    (embed as jest.Mock).mockResolvedValue({ embedding: [0.1, 0.2, 0.3] });

    await createServerEmbedding("another input");

    expect(embed).toHaveBeenCalledWith({
      model: "mock-model",
      value: "another input",
    });
  });
});
