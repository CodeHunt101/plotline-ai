import { GET } from "./route";
import { seedMovieEmbeddings } from "@/lib/services/seed";
import { NextResponse } from "next/server";

jest.mock("@/lib/services/seed", () => ({
  seedMovieEmbeddings: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

function makeRequest(url = "http://localhost:3000/api/embeddings-seed"): Request {
  return { url } as unknown as Request;
}

describe("GET /api/embeddings-seed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the seed result on success", async () => {
    const mockResult = { success: true, count: 9 };
    (seedMovieEmbeddings as jest.Mock).mockResolvedValue(mockResult);

    await GET(makeRequest());

    expect(seedMovieEmbeddings).toHaveBeenCalledWith(false);
    expect(NextResponse.json).toHaveBeenCalledWith(mockResult);
  });

  it("passes force=true when query param is set", async () => {
    const mockResult = { success: true, count: 102 };
    (seedMovieEmbeddings as jest.Mock).mockResolvedValue(mockResult);

    await GET(makeRequest("http://localhost:3000/api/embeddings-seed?force=true"));

    expect(seedMovieEmbeddings).toHaveBeenCalledWith(true);
    expect(NextResponse.json).toHaveBeenCalledWith(mockResult);
  });

  it("passes force=false when query param is not 'true'", async () => {
    const mockResult = { success: true, message: "Table already populated" };
    (seedMovieEmbeddings as jest.Mock).mockResolvedValue(mockResult);

    await GET(makeRequest("http://localhost:3000/api/embeddings-seed?force=false"));

    expect(seedMovieEmbeddings).toHaveBeenCalledWith(false);
  });

  it("returns a 500 error response when seedMovieEmbeddings throws an Error", async () => {
    (seedMovieEmbeddings as jest.Mock).mockRejectedValue(new Error("Seed failed"));

    await GET(makeRequest());

    expect(NextResponse.json).toHaveBeenCalledWith(
      { success: false, error: "Seed failed" },
      { status: 500 }
    );
  });

  it("returns 'Unknown error occurred' when a non-Error value is thrown", async () => {
    (seedMovieEmbeddings as jest.Mock).mockRejectedValue("string error");

    await GET(makeRequest());

    expect(NextResponse.json).toHaveBeenCalledWith(
      { success: false, error: "Unknown error occurred" },
      { status: 500 }
    );
  });
});
