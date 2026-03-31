/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReadableStream } from "node:stream/web";

import {
  getLanguageModel,
  getEmbeddingModel,
  getEmbeddingProviderOptions,
  getEmbeddingDimensions,
  resetQuotaCache,
} from "./ai";

globalThis.ReadableStream = ReadableStream as typeof globalThis.ReadableStream;

function createStreamResult(chunk: string) {
  return {
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(chunk);
        controller.close();
      },
    }),
  };
}

function createFailingStreamResult(error: unknown, initialChunk = "partial-chunk") {
  let chunkSent = false;

  return {
    stream: new ReadableStream({
      pull(controller) {
        if (!chunkSent) {
          chunkSent = true;
          controller.enqueue(initialChunk);
          return;
        }

        controller.error(error);
      },
    }),
  };
}

// Primary
const mockGenerateResult = {
  content: [{ type: "text" as const, text: "hello" }],
  finishReason: "stop" as const,
  usage: { inputTokens: 10, outputTokens: 5 },
  warnings: [],
};
let mockStreamResult = createStreamResult("mock-stream");

// Minimax
const mockMinimaxGenerateResult = {
  content: [{ type: "text" as const, text: "minimax hello" }],
  finishReason: "stop" as const,
  usage: { inputTokens: 8, outputTokens: 4 },
  warnings: [],
};
let mockMinimaxStreamResult = createStreamResult("mock-minimax-stream");

// Llama
const mockLlamaGenerateResult = {
  content: [{ type: "text" as const, text: "llama hello" }],
  finishReason: "stop" as const,
  usage: { inputTokens: 8, outputTokens: 4 },
  warnings: [],
};
let mockLlamaStreamResult = createStreamResult("mock-llama-stream");

// Auto-Router (openrouter/free)
const mockAutoRouterGenerateResult = {
  content: [{ type: "text" as const, text: "auto router hello" }],
  finishReason: "stop" as const,
  usage: { inputTokens: 8, outputTokens: 4 },
  warnings: [],
};
let mockAutoRouterStreamResult = createStreamResult("mock-auto-router-stream");

const mockGoogleDoGenerate = jest.fn().mockResolvedValue(mockGenerateResult);
const mockGoogleDoStream = jest.fn(async () => mockStreamResult);

const mockGoogleModel = {
  specificationVersion: "v3" as const,
  provider: "google",
  modelId: "gemini-2.5-flash",
  supportedUrls: {},
  doGenerate: mockGoogleDoGenerate,
  doStream: mockGoogleDoStream,
};

const mockMinimaxDoGenerate = jest.fn().mockResolvedValue(mockMinimaxGenerateResult);
const mockMinimaxDoStream = jest.fn(async () => mockMinimaxStreamResult);
const mockLlamaDoGenerate = jest.fn().mockResolvedValue(mockLlamaGenerateResult);
const mockLlamaDoStream = jest.fn(async () => mockLlamaStreamResult);
const mockAutoRouterDoGenerate = jest.fn().mockResolvedValue(mockAutoRouterGenerateResult);
const mockAutoRouterDoStream = jest.fn(async () => mockAutoRouterStreamResult);

const mockAiGatewayFn = jest.fn((model: any) => model);
const mockCreateAiGateway = jest.fn(() => mockAiGatewayFn);

jest.mock("ai-gateway-provider", () => ({
  createAiGateway: (...args: unknown[]) =>
    mockCreateAiGateway(...(args as Parameters<typeof mockCreateAiGateway>)),
}));

const mockGoogleCall = jest.fn(() => mockGoogleModel);

const mockOpenaiCall = jest.fn((modelId: string) => {
  if (modelId === "openrouter/free") {
    return {
      specificationVersion: "v3" as const,
      provider: "openrouter",
      modelId,
      supportedUrls: {},
      doGenerate: mockAutoRouterDoGenerate,
      doStream: mockAutoRouterDoStream,
    };
  }
  if (modelId === "meta-llama/llama-3.3-70b-instruct:free") {
    return {
      specificationVersion: "v3" as const,
      provider: "openrouter",
      modelId,
      supportedUrls: {},
      doGenerate: mockLlamaDoGenerate,
      doStream: mockLlamaDoStream,
    };
  }
  return {
    specificationVersion: "v3" as const,
    provider: "openrouter",
    modelId,
    supportedUrls: {},
    doGenerate: mockMinimaxDoGenerate,
    doStream: mockMinimaxDoStream,
  };
});

const mockEmbeddingModel = { provider: "google", modelId: "gemini-embedding-001" };
const mockEmbeddingCall = jest.fn(() => mockEmbeddingModel);

jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: jest.fn(() => mockOpenaiCall),
}));

jest.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: jest.fn(() => {
    const fn = mockGoogleCall;
    (fn as unknown as { embedding: jest.Mock }).embedding = mockEmbeddingCall;
    return fn;
  }),
}));

class MockAPICallError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AI_APICallError";
    this.statusCode = statusCode;
  }
}

const realWrapLanguageModel = jest.fn(({ model, middleware }: { model: any; middleware: any }) => {
  return {
    specificationVersion: "v3",
    provider: model.provider,
    modelId: model.modelId,
    supportedUrls: model.supportedUrls,
    doGenerate: async (params: any) => {
      if (middleware.wrapGenerate) {
        return middleware.wrapGenerate({
          doGenerate: () => model.doGenerate(params),
          doStream: () => model.doStream(params),
          params,
          model,
        });
      }
      return model.doGenerate(params);
    },
    doStream: async (params: any) => {
      if (middleware.wrapStream) {
        return middleware.wrapStream({
          doGenerate: () => model.doGenerate(params),
          doStream: () => model.doStream(params),
          params,
          model,
        });
      }
      return model.doStream(params);
    },
  };
});

jest.mock("ai", () => ({
  wrapLanguageModel: (opts: any) => realWrapLanguageModel(opts),
  APICallError: {
    isInstance: (error: unknown) => error instanceof MockAPICallError,
  },
}));

describe("getLanguageModel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    resetQuotaCache();
    mockStreamResult = createStreamResult("mock-stream");
    mockMinimaxStreamResult = createStreamResult("mock-minimax-stream");
    mockLlamaStreamResult = createStreamResult("mock-llama-stream");
    mockAutoRouterStreamResult = createStreamResult("mock-auto-router-stream");
    mockGoogleDoGenerate.mockResolvedValue(mockGenerateResult);
    mockGoogleDoStream.mockImplementation(async () => mockStreamResult);
    mockMinimaxDoGenerate.mockResolvedValue(mockMinimaxGenerateResult);
    mockMinimaxDoStream.mockImplementation(async () => mockMinimaxStreamResult);
    mockLlamaDoGenerate.mockResolvedValue(mockLlamaGenerateResult);
    mockLlamaDoStream.mockImplementation(async () => mockLlamaStreamResult);
    mockAutoRouterDoGenerate.mockResolvedValue(mockAutoRouterGenerateResult);
    mockAutoRouterDoStream.mockImplementation(async () => mockAutoRouterStreamResult);

    process.env = {
      ...originalEnv,
      CLOUDFLARE_ACCOUNT_ID: "test-account-id",
      CLOUDFLARE_GATEWAY_NAME: "test-gateway",
      GOOGLE_GENERATIVE_AI_API_KEY: "test-key",
      OPENROUTER_API_KEY: "test-key",
      OPENROUTER_LANGUAGE_MODEL: "minimax/minimax-m2.5:free",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns a wrapped model using Google as primary", () => {
    const model = getLanguageModel();

    expect(mockCreateAiGateway).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: "test-account-id", gateway: "test-gateway" })
    );
    expect(mockGoogleCall).toHaveBeenCalledWith("gemini-2.5-flash");
    expect(realWrapLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: mockGoogleModel })
    );
    expect(model).toHaveProperty("doGenerate");
    expect(model).toHaveProperty("doStream");
  });

  it("delegates doGenerate to Google on success", async () => {
    const model = getLanguageModel();
    const result = await model.doGenerate({} as any);

    expect(mockGoogleDoGenerate).toHaveBeenCalled();
    expect(mockMinimaxDoGenerate).not.toHaveBeenCalled();
    expect(result).toBe(mockGenerateResult);
  });

  it("falls back to Minimax doGenerate when Google throws 429", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new MockAPICallError("Google unavailable", 429));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    const result = await model.doGenerate({} as any);

    expect(mockGoogleDoGenerate).toHaveBeenCalled();
    expect(mockMinimaxDoGenerate).toHaveBeenCalled();
    expect(mockLlamaDoGenerate).not.toHaveBeenCalled();
    expect(result).toBe(mockMinimaxGenerateResult);
  });

  it("falls back to AutoRouter doGenerate when Google, Minimax and Llama all throw 429", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new MockAPICallError("Google unavailable", 429));
    mockMinimaxDoGenerate.mockRejectedValueOnce(new MockAPICallError("Minimax unavailable", 429));
    mockLlamaDoGenerate.mockRejectedValueOnce(new MockAPICallError("Llama unavailable", 429));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    const result = await model.doGenerate({} as any);

    expect(mockGoogleDoGenerate).toHaveBeenCalled();
    expect(mockMinimaxDoGenerate).toHaveBeenCalled();
    expect(mockLlamaDoGenerate).toHaveBeenCalled();
    expect(mockAutoRouterDoGenerate).toHaveBeenCalled();
    expect(result).toBe(mockAutoRouterGenerateResult);
  });

  it("delegates doStream to Google on success", async () => {
    const model = getLanguageModel();
    const result = await model.doStream({} as any);

    expect(mockGoogleDoStream).toHaveBeenCalled();
    expect(mockMinimaxDoStream).not.toHaveBeenCalled();
    expect(result).toBe(mockStreamResult);
  });

  it("falls back to Minimax doStream when Google throws", async () => {
    mockGoogleDoStream.mockRejectedValueOnce(new Error("Google unavailable"));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    const result = await model.doStream({} as any);

    expect(mockGoogleDoStream).toHaveBeenCalled();
    expect(mockMinimaxDoStream).toHaveBeenCalled();
    expect(result).toBe(mockMinimaxStreamResult);
  });

  it("propagates fallback error when ALL models fail", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new Error("Google down"));
    mockMinimaxDoGenerate.mockRejectedValueOnce(new Error("Minimax down"));
    mockLlamaDoGenerate.mockRejectedValueOnce(new Error("Llama down"));
    mockAutoRouterDoGenerate.mockRejectedValueOnce(new Error("AutoRouter down"));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await expect(model.doGenerate({} as any)).rejects.toThrow("AutoRouter down");
  });

  it("caches quota on 429 and applies 5m delay for OpenRouter models", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new MockAPICallError("Rate limit exceeded", 429));
    mockMinimaxDoGenerate.mockRejectedValueOnce(
      new MockAPICallError("Rate limit exceeded mininmax", 429)
    );
    mockLlamaDoGenerate.mockRejectedValueOnce(
      new MockAPICallError("Rate limit exceeded llama", 429)
    );
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();

    await model.doGenerate({} as any);
    expect(mockGoogleDoGenerate).toHaveBeenCalledTimes(1);
    expect(mockMinimaxDoGenerate).toHaveBeenCalledTimes(1);
    expect(mockLlamaDoGenerate).toHaveBeenCalledTimes(1);
    expect(mockAutoRouterDoGenerate).toHaveBeenCalledTimes(1);

    mockGoogleDoGenerate.mockClear();
    mockMinimaxDoGenerate.mockClear();
    mockLlamaDoGenerate.mockClear();
    mockAutoRouterDoGenerate.mockClear();

    // Inside the 5m window
    const model2 = getLanguageModel();
    await model2.doGenerate({} as any);
    expect(mockGoogleDoGenerate).not.toHaveBeenCalled();
    expect(mockMinimaxDoGenerate).not.toHaveBeenCalled();
    expect(mockLlamaDoGenerate).not.toHaveBeenCalled();
    expect(mockAutoRouterDoGenerate).toHaveBeenCalledTimes(1);

    mockGoogleDoGenerate.mockClear();
    mockMinimaxDoGenerate.mockClear();
    mockLlamaDoGenerate.mockClear();
    mockAutoRouterDoGenerate.mockClear();

    // Fast forward 5m 1s. OpenRouter resets, but Google doesn't (since Google takes 24h).
    const realDateNow = Date.now;
    Date.now = () => realDateNow() + 5 * 60 * 1000 + 1000;

    const model3 = getLanguageModel();
    await model3.doGenerate({} as any);

    // Google still skipped. Minimax tried.
    expect(mockGoogleDoGenerate).not.toHaveBeenCalled();
    expect(mockMinimaxDoGenerate).toHaveBeenCalledTimes(1);

    Date.now = realDateNow;
  });

  it("reports a fresh 24h reset window for Google quota exhaustion", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new MockAPICallError("Google unavailable", 429));
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await model.doGenerate({} as any);

    consoleWarn.mockClear();

    const model2 = getLanguageModel();
    await model2.doGenerate({} as any);

    expect(
      consoleWarn.mock.calls.some(
        ([message]) =>
          typeof message === "string" &&
          message.includes("[quota] google-primary quota exhausted. Resets in 24h 00m 00s.")
      )
    ).toBe(true);
  });

  it("retries models after 24h quota reset", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new MockAPICallError("Rate limit exceeded", 429));
    mockMinimaxDoGenerate.mockRejectedValueOnce(new MockAPICallError("Rate limit min", 429));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await model.doGenerate({} as any);

    const realDateNow = Date.now;
    Date.now = () => realDateNow() + 24 * 60 * 60 * 1000 + 1000;

    mockGoogleDoGenerate.mockClear();
    mockMinimaxDoGenerate.mockClear();
    mockGoogleDoGenerate.mockResolvedValue(mockGenerateResult);

    const model2 = getLanguageModel();
    await model2.doGenerate({} as any);
    expect(mockGoogleDoGenerate).toHaveBeenCalledTimes(1);
    expect(mockMinimaxDoGenerate).not.toHaveBeenCalled();

    Date.now = realDateNow;
  });

  it("does not cache non-quota errors -- Google is retried next call", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new Error("Internal server error"));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await model.doGenerate({} as any);

    mockGoogleDoGenerate.mockClear();
    mockMinimaxDoGenerate.mockClear();
    mockGoogleDoGenerate.mockResolvedValue(mockGenerateResult);

    const model2 = getLanguageModel();
    const result = await model2.doGenerate({} as any);
    expect(mockGoogleDoGenerate).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockGenerateResult);
  });

  it("throws an exhaustion summary when every model is already circuit-open", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new MockAPICallError("Google unavailable", 429));
    mockMinimaxDoGenerate.mockRejectedValueOnce(new MockAPICallError("Minimax unavailable", 429));
    mockLlamaDoGenerate.mockRejectedValueOnce(new MockAPICallError("Llama unavailable", 429));
    mockAutoRouterDoGenerate.mockRejectedValueOnce(
      new MockAPICallError("AutoRouter unavailable", 429)
    );
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await expect(model.doGenerate({} as any)).rejects.toThrow("AutoRouter unavailable");

    mockGoogleDoGenerate.mockClear();
    mockMinimaxDoGenerate.mockClear();
    mockLlamaDoGenerate.mockClear();
    mockAutoRouterDoGenerate.mockClear();

    const model2 = getLanguageModel();

    await expect(model2.doGenerate({} as any)).rejects.toThrow(
      "All language models are currently quota exhausted: google-primary (resets in 24h 00m 00s), openrouter-minimax (resets in 00h 05m 00s), openrouter-llama (resets in 00h 05m 00s), openrouter-free-auto (resets in 00h 05m 00s)"
    );
    expect(mockGoogleDoGenerate).not.toHaveBeenCalled();
    expect(mockMinimaxDoGenerate).not.toHaveBeenCalled();
    expect(mockLlamaDoGenerate).not.toHaveBeenCalled();
    expect(mockAutoRouterDoGenerate).not.toHaveBeenCalled();
  });

  it("throws when CLOUDFLARE_ACCOUNT_ID is missing", () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;

    expect(() => getLanguageModel()).toThrow(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_GATEWAY_NAME must be set"
    );
  });

  it("throws when CLOUDFLARE_GATEWAY_NAME is missing", () => {
    delete process.env.CLOUDFLARE_GATEWAY_NAME;

    expect(() => getLanguageModel()).toThrow(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_GATEWAY_NAME must be set"
    );
  });

  it("includes apiKey in gateway config when CLOUDFLARE_API_KEY is set", () => {
    process.env.CLOUDFLARE_API_KEY = "cf-key";

    getLanguageModel();

    expect(mockCreateAiGateway).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "cf-key" }));
  });
});

describe("getEmbeddingModel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_GENERATIVE_AI_API_KEY: "test-key",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns google embedding model", () => {
    const model = getEmbeddingModel();

    expect(mockEmbeddingCall).toHaveBeenCalledWith("gemini-embedding-001");
    expect(model).toBe(mockEmbeddingModel);
  });

  it("respects GOOGLE_EMBEDDING_MODEL override", () => {
    process.env.GOOGLE_EMBEDDING_MODEL = "gemini-embedding-002";
    getEmbeddingModel();
    expect(mockEmbeddingCall).toHaveBeenCalledWith("gemini-embedding-002");
  });

  it("returns google-specific embedding provider options", () => {
    expect(getEmbeddingProviderOptions()).toEqual({
      google: { outputDimensionality: 768 },
    });
  });
});

describe("getEmbeddingDimensions", () => {
  it("always returns 768 (Google Gemini)", () => {
    expect(getEmbeddingDimensions()).toBe(768);
  });
});

describe("wrapStream – quota and exhaustion paths", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    resetQuotaCache();
    mockStreamResult = createStreamResult("mock-stream");
    mockMinimaxStreamResult = createStreamResult("mock-minimax-stream");
    mockLlamaStreamResult = createStreamResult("mock-llama-stream");
    mockAutoRouterStreamResult = createStreamResult("mock-auto-router-stream");
    mockGoogleDoGenerate.mockResolvedValue(mockGenerateResult);
    mockGoogleDoStream.mockImplementation(async () => mockStreamResult);
    mockMinimaxDoGenerate.mockResolvedValue(mockMinimaxGenerateResult);
    mockMinimaxDoStream.mockImplementation(async () => mockMinimaxStreamResult);
    mockLlamaDoGenerate.mockResolvedValue(mockLlamaGenerateResult);
    mockLlamaDoStream.mockImplementation(async () => mockLlamaStreamResult);
    mockAutoRouterDoGenerate.mockResolvedValue(mockAutoRouterGenerateResult);
    mockAutoRouterDoStream.mockImplementation(async () => mockAutoRouterStreamResult);

    process.env = {
      ...originalEnv,
      CLOUDFLARE_ACCOUNT_ID: "test-account-id",
      CLOUDFLARE_GATEWAY_NAME: "test-gateway",
      GOOGLE_GENERATIVE_AI_API_KEY: "test-key",
      OPENROUTER_API_KEY: "test-key",
      OPENROUTER_LANGUAGE_MODEL: "minimax/minimax-m2.5:free",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("falls back to Minimax doStream when Google throws a 403 quota error", async () => {
    mockGoogleDoStream.mockRejectedValueOnce(new MockAPICallError("Google quota (403)", 403));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    const result = await model.doStream({} as any);

    expect(mockGoogleDoStream).toHaveBeenCalled();
    expect(mockMinimaxDoStream).toHaveBeenCalled();
    expect(result).toBe(mockMinimaxStreamResult);
  });

  it("falls back to AutoRouter doStream when Google, Minimax and Llama all throw 429", async () => {
    mockGoogleDoStream.mockRejectedValueOnce(new MockAPICallError("Google quota", 429));
    mockMinimaxDoStream.mockRejectedValueOnce(new MockAPICallError("Minimax quota", 429));
    mockLlamaDoStream.mockRejectedValueOnce(new MockAPICallError("Llama quota", 429));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    const result = await model.doStream({} as any);

    expect(mockGoogleDoStream).toHaveBeenCalled();
    expect(mockMinimaxDoStream).toHaveBeenCalled();
    expect(mockLlamaDoStream).toHaveBeenCalled();
    expect(mockAutoRouterDoStream).toHaveBeenCalled();
    expect(result).toBe(mockAutoRouterStreamResult);
  });

  it("throws 'All language models exhausted' when all stream models fail", async () => {
    mockGoogleDoStream.mockRejectedValueOnce(new Error("Google stream down"));
    mockMinimaxDoStream.mockRejectedValueOnce(new Error("Minimax stream down"));
    mockLlamaDoStream.mockRejectedValueOnce(new Error("Llama stream down"));
    mockAutoRouterDoStream.mockRejectedValueOnce(new Error("AutoRouter stream down"));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await expect(model.doStream({} as any)).rejects.toThrow("AutoRouter stream down");
  });

  it("skips quota-exhausted models in wrapStream", async () => {
    // Exhaust Google via quota, then confirm next call skips it
    mockGoogleDoStream.mockRejectedValueOnce(new MockAPICallError("Google 429", 429));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await model.doStream({} as any);

    mockGoogleDoStream.mockClear();
    mockMinimaxDoStream.mockClear();

    // Second call — Google should be skipped (quota active)
    const model2 = getLanguageModel();
    await model2.doStream({} as any);

    expect(mockGoogleDoStream).not.toHaveBeenCalled();
    expect(mockMinimaxDoStream).toHaveBeenCalled();
  });

  it("marks stream quota exhaustion during consumption for later requests", async () => {
    const streamError = new MockAPICallError("Google mid-stream quota", 429);
    mockGoogleDoStream.mockImplementationOnce(async () => createFailingStreamResult(streamError));
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    const result = await model.doStream({} as any);
    const reader = result.stream.getReader();

    await expect(reader.read()).resolves.toEqual({ done: false, value: "partial-chunk" });
    await expect(reader.read()).rejects.toThrow("Google mid-stream quota");

    mockGoogleDoStream.mockClear();
    mockMinimaxDoStream.mockClear();
    consoleWarn.mockClear();

    const model2 = getLanguageModel();
    const fallbackResult = await model2.doStream({} as any);

    expect(mockGoogleDoStream).not.toHaveBeenCalled();
    expect(mockMinimaxDoStream).toHaveBeenCalledTimes(1);
    expect(fallbackResult).toBe(mockMinimaxStreamResult);
    expect(
      consoleWarn.mock.calls.some(
        ([message]) =>
          typeof message === "string" &&
          message.includes("[quota] google-primary quota exhausted. Resets in 24h 00m 00s.")
      )
    ).toBe(true);
  });
});
