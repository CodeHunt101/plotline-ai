/** @jest-environment node */

import { POST } from "./route";
import {
  createRecommendationStreamResponse,
  recommendationFixtures,
} from "../../../tests/support/movie-test-fixtures";

jest.mock("@/lib/services/movie-recommendations", () => ({
  streamMovieRecommendations: jest.fn(),
}));

import { streamMovieRecommendations } from "@/lib/services/movie-recommendations";

describe("POST /api/recommendations integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the streamed text response body on success", async () => {
    const payload = {
      participantsData: [
        {
          favouriteMovie: "Inception",
          movieType: "new",
          moodType: "fun",
          favouriteFilmPerson: "Keanu Reeves",
        },
      ],
      timeAvailable: "2 hours",
    };

    (streamMovieRecommendations as jest.Mock).mockResolvedValue({
      toTextStreamResponse: () =>
        createRecommendationStreamResponse(recommendationFixtures.groupJourney),
    });

    const response = await POST(
      new Request("http://localhost:3000/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(JSON.stringify(recommendationFixtures.groupJourney));
    expect(streamMovieRecommendations).toHaveBeenCalledWith(payload);
  });

  it("returns an empty recommendation payload when the pipeline finds no matches", async () => {
    (streamMovieRecommendations as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantsData: [],
          timeAvailable: "90 minutes",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ recommendedMovies: [] });
  });

  it("returns a 500 JSON payload when the pipeline throws", async () => {
    (streamMovieRecommendations as jest.Mock).mockRejectedValue(new Error("Pipeline failed"));

    const response = await POST(
      new Request("http://localhost:3000/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantsData: [],
          timeAvailable: "90 minutes",
        }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Pipeline failed" });
  });
});
