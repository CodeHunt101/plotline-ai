import { POST } from "./route";
import { embed } from "ai";
import { NextResponse } from "next/server";

jest.mock("ai", () => ({
  embed: jest.fn(),
}));

jest.mock("@/config/ai", () => ({
  getEmbeddingModel: jest.fn(() => "mock-embedding-model"),
  getEmbeddingProviderOptions: jest.fn(() => ({
    google: { outputDimensionality: 768 },
  })),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

describe("POST /api/embeddings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns embedding on success", async () => {
    const mockEmbedding = [0.1, 0.2, 0.3];
    const request = {
      json: jest.fn().mockResolvedValue({ input: "Action movies" }),
    } as unknown as Request;

    (embed as jest.Mock).mockResolvedValue({ embedding: mockEmbedding });

    await POST(request);

    expect(embed).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-embedding-model",
        value: "Action movies",
        providerOptions: { google: { outputDimensionality: 768 } },
      })
    );
    expect(NextResponse.json).toHaveBeenCalledWith({ embedding: mockEmbedding });
  });

  it("omits providerOptions when the embedding provider does not require them", async () => {
    const { getEmbeddingProviderOptions } = jest.requireMock("@/config/ai");
    getEmbeddingProviderOptions.mockReturnValueOnce(undefined);

    const request = {
      json: jest.fn().mockResolvedValue({ input: "Action movies" }),
    } as unknown as Request;

    (embed as jest.Mock).mockResolvedValue({ embedding: [0.1, 0.2, 0.3] });

    await POST(request);

    expect(embed).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-embedding-model",
        value: "Action movies",
      })
    );
    expect(embed).not.toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: expect.anything(),
      })
    );
  });

  it("returns 500 error response when embed throws an Error", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ input: "test" }),
    } as unknown as Request;

    (embed as jest.Mock).mockRejectedValue(new Error("Embedding API failure"));

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Embedding API failure" },
      { status: 500 }
    );
  });

  it("returns 'Unknown error occurred' when a non-Error value is thrown", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ input: "test" }),
    } as unknown as Request;

    (embed as jest.Mock).mockRejectedValue("string error");

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Unknown error occurred" },
      { status: 500 }
    );
  });
});
