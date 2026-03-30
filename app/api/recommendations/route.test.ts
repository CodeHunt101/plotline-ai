import { POST } from "./route";
import { NextResponse } from "next/server";

jest.mock("@/lib/services/movie-recommendations", () => ({
  buildMovieRecommendations: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

import { buildMovieRecommendations } from "@/lib/services/movie-recommendations";

describe("POST /api/recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the recommendation payload on success", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ participantsData: [], timeAvailable: "2 hours" }),
    } as unknown as Request;

    const mockRecommendation = {
      match: [],
      result: { recommendedMovies: [] },
    };
    (buildMovieRecommendations as jest.Mock).mockResolvedValue(mockRecommendation);

    await POST(request);

    expect(buildMovieRecommendations).toHaveBeenCalledWith({
      participantsData: [],
      timeAvailable: "2 hours",
    });
    expect(NextResponse.json).toHaveBeenCalledWith(mockRecommendation);
  });

  it("returns a 500 error when the service throws", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ participantsData: [], timeAvailable: "2 hours" }),
    } as unknown as Request;

    (buildMovieRecommendations as jest.Mock).mockRejectedValue(new Error("Pipeline failed"));

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith({ error: "Pipeline failed" }, { status: 500 });
  });

  it("returns a generic 500 error for non-Error failures", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ participantsData: [], timeAvailable: "2 hours" }),
    } as unknown as Request;

    (buildMovieRecommendations as jest.Mock).mockRejectedValue("bad failure");

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Unknown error occurred" },
      { status: 500 }
    );
  });
});
