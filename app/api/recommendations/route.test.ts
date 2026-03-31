import { POST } from "./route";
import { NextResponse } from "next/server";

jest.mock("@/lib/services/movie-recommendations", () => ({
  streamMovieRecommendations: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

import { streamMovieRecommendations } from "@/lib/services/movie-recommendations";

describe("POST /api/recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the stream response on success", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ participantsData: [], timeAvailable: "2 hours" }),
    } as unknown as Request;

    const mockStreamResponse = {} as Response;
    const mockRecommendation = {
      toTextStreamResponse: jest.fn().mockReturnValue(mockStreamResponse),
    };
    (streamMovieRecommendations as jest.Mock).mockResolvedValue(mockRecommendation);

    const result = await POST(request);

    expect(streamMovieRecommendations).toHaveBeenCalledWith({
      participantsData: [],
      timeAvailable: "2 hours",
    });
    expect(result).toBe(mockStreamResponse);
  });

  it("returns an empty recommendation payload when retrieval finds no matches", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ participantsData: [], timeAvailable: "2 hours" }),
    } as unknown as Request;

    (streamMovieRecommendations as jest.Mock).mockResolvedValue(null);

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith({ recommendedMovies: [] });
  });

  it("returns a 500 error when the service throws", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ participantsData: [], timeAvailable: "2 hours" }),
    } as unknown as Request;

    (streamMovieRecommendations as jest.Mock).mockRejectedValue(new Error("Pipeline failed"));

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith({ error: "Pipeline failed" }, { status: 500 });
  });

  it("returns a generic 500 error for non-Error failures", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ participantsData: [], timeAvailable: "2 hours" }),
    } as unknown as Request;

    (streamMovieRecommendations as jest.Mock).mockRejectedValue("bad failure");

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Unknown error occurred" },
      { status: 500 }
    );
  });
});
