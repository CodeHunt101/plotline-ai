import type { ModelMessage } from "ai";

jest.mock("ai", () => ({
  generateText: jest.fn(),
}));

jest.mock("@/config/ai", () => ({
  getLanguageModel: jest.fn(() => "mock-model"),
}));

import { generateText } from "ai";
import {
  buildRecommendationMessages,
  generateMovieRecommendationsFromMessages,
  getChatCompletion,
  systemMessage,
} from "./openai";

// Mock the fetch function
global.fetch = jest.fn();

describe("OpenAI Service", () => {
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

  describe("getChatCompletion", () => {
    const mockText = "Movie List Context";
    const mockQuery = "User Preferences";
    const mockResponse = { content: "Movie recommendations" };

    it("should return undefined when text is empty", async () => {
      const result = await getChatCompletion("", mockQuery);
      expect(result).toBeUndefined();
    });

    it("should successfully get chat completion", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getChatCompletion(mockText, mockQuery);

      expect(global.fetch).toHaveBeenCalledWith("/api/movies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            systemMessage,
            {
              role: "user",
              content: `-Movie List Context: ${mockText} \n-User Preferences: ${mockQuery}`,
            },
          ],
        }),
      });

      expect(result).toBe(mockResponse.content);
    });

    it("should include previous messages in the request", async () => {
      const previousMessages: ModelMessage[] = [{ role: "user", content: "previous message" }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await getChatCompletion(mockText, mockQuery, previousMessages);

      expect(global.fetch).toHaveBeenCalledWith("/api/movies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            systemMessage,
            ...previousMessages,
            {
              role: "user",
              content: `-Movie List Context: ${mockText} \n-User Preferences: ${mockQuery}`,
            },
          ],
        }),
      });
    });

    it("should throw an error when the API call fails", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

      await expect(getChatCompletion(mockText, mockQuery)).rejects.toThrow("API Error");
    });

    it("should throw the API error message when /api/movies returns a failure response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Movie recommendations response was not valid JSON" }),
      });

      await expect(getChatCompletion(mockText, mockQuery)).rejects.toThrow(
        "Movie recommendations response was not valid JSON"
      );
    });

    it("should throw a generic message when /api/movies fails without a string error body", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { code: "upstream" } }),
      });

      await expect(getChatCompletion(mockText, mockQuery)).rejects.toThrow(
        "Failed to get movie recommendations"
      );
    });

    it("should throw when /api/movies succeeds without content", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(getChatCompletion(mockText, mockQuery)).rejects.toThrow(
        "Movie recommendations response was empty"
      );
    });
  });

  describe("generateMovieRecommendationsFromMessages", () => {
    it("normalises the model response via the shared parser", async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: '```json\n{"recommendedMovies":[]}\n```',
      });

      await expect(
        generateMovieRecommendationsFromMessages([{ role: "user", content: "Suggest a film" }])
      ).resolves.toBe('{"recommendedMovies":[]}');
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
  });
});
