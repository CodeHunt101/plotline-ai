import { getLanguageModel, getEmbeddingModel, getEmbeddingProviderOptions } from "./ai";

const mockAiGatewayFn = jest.fn((model) => model);
const mockCreateAiGateway = jest.fn(() => mockAiGatewayFn);

jest.mock("ai-gateway-provider", () => ({
  createAiGateway: (...args: unknown[]) =>
    mockCreateAiGateway(...(args as Parameters<typeof mockCreateAiGateway>)),
}));

const mockGoogleModel = { provider: "google", modelId: "gemini-2.5-flash" };
const mockOpenrouterModel = { provider: "openrouter", modelId: "minimax/minimax-m2.5:free" };
const mockOpenrouterEmbeddingModel = {
  provider: "openrouter",
  modelId: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
};
const mockEmbeddingModel = { provider: "google", modelId: "gemini-embedding-001" };

const mockOpenaiCall = jest.fn(() => mockOpenrouterModel);
const mockOpenaiEmbeddingCall = jest.fn(() => mockOpenrouterEmbeddingModel);
const mockGoogleCall = jest.fn(() => mockGoogleModel);
const mockEmbeddingCall = jest.fn(() => mockEmbeddingModel);

jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: jest.fn(() => {
    const fn = mockOpenaiCall;
    (fn as unknown as { embedding: jest.Mock }).embedding = mockOpenaiEmbeddingCall;
    return fn;
  }),
}));

jest.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: jest.fn(() => {
    const fn = mockGoogleCall;
    (fn as unknown as { embedding: jest.Mock }).embedding = mockEmbeddingCall;
    return fn;
  }),
}));

describe("getLanguageModel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CLOUDFLARE_ACCOUNT_ID: "test-account-id",
      CLOUDFLARE_GATEWAY_NAME: "test-gateway",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns google model when AI_TEXT_PROVIDER is google", () => {
    process.env.AI_TEXT_PROVIDER = "google";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";

    const model = getLanguageModel();

    expect(mockCreateAiGateway).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: "test-account-id", gateway: "test-gateway" })
    );
    expect(mockGoogleCall).toHaveBeenCalledWith("gemini-2.5-flash");
    expect(model).toBe(mockGoogleModel);
  });

  it("defaults to google when AI_TEXT_PROVIDER is not set", () => {
    delete process.env.AI_TEXT_PROVIDER;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";

    getLanguageModel();

    expect(mockGoogleCall).toHaveBeenCalledWith("gemini-2.5-flash");
  });

  it("returns openrouter model when AI_TEXT_PROVIDER is openrouter", () => {
    process.env.AI_TEXT_PROVIDER = "openrouter";
    process.env.OPENROUTER_API_KEY = "test-key";

    const { createOpenAI } = jest.requireMock("@ai-sdk/openai");
    const model = getLanguageModel();

    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "https://openrouter.ai/api/v1" })
    );
    expect(mockOpenaiCall).toHaveBeenCalledWith("minimax/minimax-m2.5:free");
    expect(model).toBe(mockOpenrouterModel);
  });

  it("throws for unknown AI_TEXT_PROVIDER", () => {
    process.env.AI_TEXT_PROVIDER = "unknown-provider";

    expect(() => getLanguageModel()).toThrow(
      'Unsupported AI_TEXT_PROVIDER "unknown-provider". Valid values: google, openrouter'
    );
  });

  it("throws when CLOUDFLARE_ACCOUNT_ID is missing and provider is google", () => {
    process.env.AI_TEXT_PROVIDER = "google";
    delete process.env.CLOUDFLARE_ACCOUNT_ID;

    expect(() => getLanguageModel()).toThrow(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_GATEWAY_NAME must be set"
    );
  });

  it("throws when CLOUDFLARE_GATEWAY_NAME is missing and provider is google", () => {
    process.env.AI_TEXT_PROVIDER = "google";
    delete process.env.CLOUDFLARE_GATEWAY_NAME;

    expect(() => getLanguageModel()).toThrow(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_GATEWAY_NAME must be set"
    );
  });

  it("does not require CF gateway vars when AI_TEXT_PROVIDER is openrouter", () => {
    process.env.AI_TEXT_PROVIDER = "openrouter";
    process.env.OPENROUTER_API_KEY = "test-key";
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_GATEWAY_NAME;

    expect(() => getLanguageModel()).not.toThrow();
  });

  it("includes apiKey in gateway config when CLOUDFLARE_API_KEY is set", () => {
    process.env.AI_TEXT_PROVIDER = "google";
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
      OPENROUTER_API_KEY: "openrouter-key",
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

  it("returns openrouter embedding model when AI_EMBEDDING_PROVIDER is openrouter", () => {
    process.env.AI_EMBEDDING_PROVIDER = "openrouter";

    const { createOpenAI } = jest.requireMock("@ai-sdk/openai");
    const model = getEmbeddingModel();

    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "https://openrouter.ai/api/v1" })
    );
    expect(mockOpenaiEmbeddingCall).toHaveBeenCalledWith(
      "nvidia/llama-nemotron-embed-vl-1b-v2:free"
    );
    expect(model).toBe(mockOpenrouterEmbeddingModel);
  });

  it("returns google-specific embedding provider options", () => {
    expect(getEmbeddingProviderOptions()).toEqual({
      google: { outputDimensionality: 768 },
    });
  });

  it("returns no provider options for openrouter embeddings", () => {
    process.env.AI_EMBEDDING_PROVIDER = "openrouter";

    expect(getEmbeddingProviderOptions()).toBeUndefined();
  });

  it("throws for unknown embedding provider", () => {
    process.env.AI_EMBEDDING_PROVIDER = "unknown-provider";

    expect(() => getEmbeddingModel()).toThrow(
      'Unsupported AI_EMBEDDING_PROVIDER "unknown-provider". Valid values: google, openrouter'
    );
  });
});
