/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getLanguageModel,
  getEmbeddingModel,
  getEmbeddingProviderOptions,
  getEmbeddingDimensions,
  resetQuotaCache,
} from "./ai";

const mockGenerateResult = {
  content: [{ type: "text" as const, text: "hello" }],
  finishReason: "stop" as const,
  usage: { inputTokens: 10, outputTokens: 5 },
  warnings: [],
};

const mockStreamResult = { stream: "mock-stream" };

const mockFallbackGenerateResult = {
  content: [{ type: "text" as const, text: "fallback hello" }],
  finishReason: "stop" as const,
  usage: { inputTokens: 8, outputTokens: 4 },
  warnings: [],
};

const mockFallbackStreamResult = { stream: "mock-fallback-stream" };

const mockGoogleDoGenerate = jest.fn().mockResolvedValue(mockGenerateResult);
const mockGoogleDoStream = jest.fn().mockResolvedValue(mockStreamResult);

const mockGoogleModel = {
  specificationVersion: "v3" as const,
  provider: "google",
  modelId: "gemini-2.5-flash",
  supportedUrls: {},
  doGenerate: mockGoogleDoGenerate,
  doStream: mockGoogleDoStream,
};

const mockOpenrouterDoGenerate = jest.fn().mockResolvedValue(mockFallbackGenerateResult);
const mockOpenrouterDoStream = jest.fn().mockResolvedValue(mockFallbackStreamResult);

const mockOpenrouterModel = {
  specificationVersion: "v3" as const,
  provider: "openrouter",
  modelId: "minimax/minimax-m2.5:free",
  supportedUrls: {},
  doGenerate: mockOpenrouterDoGenerate,
  doStream: mockOpenrouterDoStream,
};

const mockAiGatewayFn = jest.fn((model: any) => model);
const mockCreateAiGateway = jest.fn(() => mockAiGatewayFn);

jest.mock("ai-gateway-provider", () => ({
  createAiGateway: (...args: unknown[]) =>
    mockCreateAiGateway(...(args as Parameters<typeof mockCreateAiGateway>)),
}));

const mockGoogleCall = jest.fn(() => mockGoogleModel);
const mockOpenaiCall = jest.fn(() => mockOpenrouterModel);
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
    mockGoogleDoGenerate.mockResolvedValue(mockGenerateResult);
    mockGoogleDoStream.mockResolvedValue(mockStreamResult);
    mockOpenrouterDoGenerate.mockResolvedValue(mockFallbackGenerateResult);
    mockOpenrouterDoStream.mockResolvedValue(mockFallbackStreamResult);
    process.env = {
      ...originalEnv,
      CLOUDFLARE_ACCOUNT_ID: "test-account-id",
      CLOUDFLARE_GATEWAY_NAME: "test-gateway",
      GOOGLE_GENERATIVE_AI_API_KEY: "test-key",
      OPENROUTER_API_KEY: "test-key",
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
    expect(mockOpenrouterDoGenerate).not.toHaveBeenCalled();
    expect(result).toBe(mockGenerateResult);
  });

  it("falls back to OpenRouter doGenerate when Google throws", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new Error("Google unavailable"));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    const result = await model.doGenerate({} as any);

    expect(mockGoogleDoGenerate).toHaveBeenCalled();
    expect(mockOpenrouterDoGenerate).toHaveBeenCalled();
    expect(result).toBe(mockFallbackGenerateResult);
  });

  it("delegates doStream to Google on success", async () => {
    const model = getLanguageModel();
    const result = await model.doStream({} as any);

    expect(mockGoogleDoStream).toHaveBeenCalled();
    expect(mockOpenrouterDoStream).not.toHaveBeenCalled();
    expect(result).toBe(mockStreamResult);
  });

  it("falls back to OpenRouter doStream when Google throws", async () => {
    mockGoogleDoStream.mockRejectedValueOnce(new Error("Google unavailable"));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    const result = await model.doStream({} as any);

    expect(mockGoogleDoStream).toHaveBeenCalled();
    expect(mockOpenrouterDoStream).toHaveBeenCalled();
    expect(result).toBe(mockFallbackStreamResult);
  });

  it("propagates fallback error when both models fail", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new Error("Google down"));
    mockOpenrouterDoGenerate.mockRejectedValueOnce(new Error("OpenRouter down"));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await expect(model.doGenerate({} as any)).rejects.toThrow("OpenRouter down");
  });

  it("caches quota on 429 and skips Google on subsequent calls", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new MockAPICallError("Rate limit exceeded", 429));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();

    await model.doGenerate({} as any);
    expect(mockGoogleDoGenerate).toHaveBeenCalledTimes(1);
    expect(mockOpenrouterDoGenerate).toHaveBeenCalledTimes(1);

    mockGoogleDoGenerate.mockClear();
    mockOpenrouterDoGenerate.mockClear();

    const model2 = getLanguageModel();
    await model2.doGenerate({} as any);
    expect(mockGoogleDoGenerate).not.toHaveBeenCalled();
    expect(mockOpenrouterDoGenerate).toHaveBeenCalledTimes(1);
  });

  it("caches quota on 403 and skips Google on subsequent calls", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new MockAPICallError("Resource exhausted", 403));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await model.doGenerate({} as any);

    mockGoogleDoGenerate.mockClear();
    mockOpenrouterDoGenerate.mockClear();

    const model2 = getLanguageModel();
    await model2.doGenerate({} as any);
    expect(mockGoogleDoGenerate).not.toHaveBeenCalled();
    expect(mockOpenrouterDoGenerate).toHaveBeenCalledTimes(1);
  });

  it("retries Google after 24h quota reset", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new MockAPICallError("Rate limit exceeded", 429));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await model.doGenerate({} as any);

    const realDateNow = Date.now;
    Date.now = () => realDateNow() + 24 * 60 * 60 * 1000 + 1;

    mockGoogleDoGenerate.mockClear();
    mockOpenrouterDoGenerate.mockClear();
    mockGoogleDoGenerate.mockResolvedValue(mockGenerateResult);

    const model2 = getLanguageModel();
    await model2.doGenerate({} as any);
    expect(mockGoogleDoGenerate).toHaveBeenCalledTimes(1);
    expect(mockOpenrouterDoGenerate).not.toHaveBeenCalled();

    Date.now = realDateNow;
  });

  it("caches quota on 429 via doStream and skips Google on subsequent stream calls", async () => {
    const quotaError = new MockAPICallError("Rate limit exceeded", 429);
    mockGoogleDoStream.mockRejectedValueOnce(quotaError);
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await model.doStream({} as any);
    expect(mockGoogleDoStream).toHaveBeenCalledTimes(1);
    expect(mockOpenrouterDoStream).toHaveBeenCalledTimes(1);

    mockGoogleDoStream.mockClear();
    mockOpenrouterDoStream.mockClear();

    const model2 = getLanguageModel();
    await model2.doStream({} as any);
    expect(mockGoogleDoStream).not.toHaveBeenCalled();
    expect(mockOpenrouterDoStream).toHaveBeenCalledTimes(1);
  });

  it("does not cache non-quota errors -- Google is retried next call", async () => {
    mockGoogleDoGenerate.mockRejectedValueOnce(new Error("Internal server error"));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const model = getLanguageModel();
    await model.doGenerate({} as any);

    mockGoogleDoGenerate.mockClear();
    mockOpenrouterDoGenerate.mockClear();
    mockGoogleDoGenerate.mockResolvedValue(mockGenerateResult);

    const model2 = getLanguageModel();
    const result = await model2.doGenerate({} as any);
    expect(mockGoogleDoGenerate).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockGenerateResult);
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
