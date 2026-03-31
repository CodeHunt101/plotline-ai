jest.mock("ai", () => ({
  streamText: jest.fn(),
  Output: {
    object: jest.fn((opts) => opts),
  },
}));

jest.mock("@/config/ai", () => ({
  getLanguageModel: jest.fn(() => "mock-model"),
}));

import { streamText, Output } from "ai";
import {
  buildRecommendationMessages,
  streamMovieRecommendationsFromMessages,
  systemMessage,
} from "./ai-service";

describe("AI Service", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("systemMessage", () => {
    it("allows returning fewer than four recommendations when retrieval is sparse", () => {
      expect(systemMessage.content).toContain("Recommend 1-10 movies");
      expect(systemMessage.content).toContain(
        "If fewer than 4 strong matches are available, return the available matches instead of an empty list."
      );
    });
  });

  describe("streamMovieRecommendationsFromMessages", () => {
    it("calls streamText with the correct schema and parameters", async () => {
      (streamText as jest.Mock).mockResolvedValue({
        stream: {},
      });

      const result = await streamMovieRecommendationsFromMessages([
        { role: "user", content: "Suggest a film" },
      ]);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "mock-model",
          messages: [{ role: "user", content: "Suggest a film" }],
          output: Output.object({ schema: expect.anything() }),
          temperature: 0.65,
        })
      );

      expect(result).toHaveProperty("stream");
    });
  });

  describe("buildRecommendationMessages", () => {
    it("prepends the system prompt and appends the user prompt", () => {
      expect(buildRecommendationMessages("context", "query")).toEqual([
        systemMessage,
        {
          role: "user",
          content: "-Movie List Context: context \n-User Preferences: query",
        },
      ]);
    });

    it("inserts previousMessages between the system prompt and the user prompt", () => {
      const previous = [{ role: "assistant" as const, content: "Sure, let me help." }];
      const result = buildRecommendationMessages("context", "query", previous);
      expect(result).toEqual([
        systemMessage,
        { role: "assistant", content: "Sure, let me help." },
        { role: "user", content: "-Movie List Context: context \n-User Preferences: query" },
      ]);
    });
  });
});
