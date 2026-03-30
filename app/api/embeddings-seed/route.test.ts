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

function makeRequest(url = "http://localhost:3000/api/embeddings-seed", secret?: string): Request {
  const headers = new Headers();
  if (secret) {
    headers.set("x-worker-secret", secret);
  }

  return {
    url,
    headers,
  } as unknown as Request;
}

describe("GET /api/embeddings-seed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.SUPABASE_WORKER_SECRET;
  });

  it("returns 500 when the server secret is not configured", async () => {
    await GET(makeRequest());

    expect(seedMovieEmbeddings).not.toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Server secret is not configured" },
      { status: 500 }
    );
  });

  it("returns the seed result on success", async () => {
    process.env.SUPABASE_WORKER_SECRET = "super-secret";
    const mockResult = { success: true, count: 9 };
    (seedMovieEmbeddings as jest.Mock).mockResolvedValue(mockResult);

    await GET(makeRequest("http://localhost:3000/api/embeddings-seed", "super-secret"));

    expect(seedMovieEmbeddings).toHaveBeenCalledWith(false);
    expect(NextResponse.json).toHaveBeenCalledWith(mockResult);
  });

  it("passes force=true when query param is set", async () => {
    process.env.SUPABASE_WORKER_SECRET = "super-secret";
    const mockResult = { success: true, count: 102 };
    (seedMovieEmbeddings as jest.Mock).mockResolvedValue(mockResult);

    await GET(makeRequest("http://localhost:3000/api/embeddings-seed?force=true", "super-secret"));

    expect(seedMovieEmbeddings).toHaveBeenCalledWith(true);
    expect(NextResponse.json).toHaveBeenCalledWith(mockResult);
  });

  it("passes force=false when query param is not 'true'", async () => {
    process.env.SUPABASE_WORKER_SECRET = "super-secret";
    const mockResult = { success: true, message: "Table already populated" };
    (seedMovieEmbeddings as jest.Mock).mockResolvedValue(mockResult);

    await GET(makeRequest("http://localhost:3000/api/embeddings-seed?force=false", "super-secret"));

    expect(seedMovieEmbeddings).toHaveBeenCalledWith(false);
  });

  it("returns a 500 error response when seedMovieEmbeddings throws an Error", async () => {
    process.env.SUPABASE_WORKER_SECRET = "super-secret";
    (seedMovieEmbeddings as jest.Mock).mockRejectedValue(new Error("Seed failed"));

    await GET(makeRequest("http://localhost:3000/api/embeddings-seed", "super-secret"));

    expect(NextResponse.json).toHaveBeenCalledWith(
      { success: false, error: "Seed failed" },
      { status: 500 }
    );
  });

  it("returns 'Unknown error occurred' when a non-Error value is thrown", async () => {
    process.env.SUPABASE_WORKER_SECRET = "super-secret";
    (seedMovieEmbeddings as jest.Mock).mockRejectedValue("string error");

    await GET(makeRequest("http://localhost:3000/api/embeddings-seed", "super-secret"));

    expect(NextResponse.json).toHaveBeenCalledWith(
      { success: false, error: "Unknown error occurred" },
      { status: 500 }
    );
  });

  it("returns 401 when the shared secret is configured but the header is missing", async () => {
    process.env.SUPABASE_WORKER_SECRET = "super-secret";

    await GET(makeRequest());

    expect(seedMovieEmbeddings).not.toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith({ error: "Unauthorised" }, { status: 401 });
  });
});
