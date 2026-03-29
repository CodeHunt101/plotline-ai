import { wrapLanguageModel, APICallError } from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import type { LanguageModelMiddleware } from "ai";

type WrappableLanguageModel = Parameters<typeof wrapLanguageModel>[0]["model"];

const GOOGLE_EMBEDDING_DIMENSIONS = 768;
const DEFAULT_GOOGLE_LANGUAGE_MODEL = "gemini-2.5-flash";
const DEFAULT_GOOGLE_EMBEDDING_MODEL = "gemini-embedding-001";
const DEFAULT_OPENROUTER_LANGUAGE_MODEL = "minimax/minimax-m2.5:free";

const QUOTA_RESET_MS = 24 * 60 * 60 * 1000;

let googleQuotaExhaustedAt: number | null = null;

function isGoogleQuotaExhausted(): boolean {
  if (!googleQuotaExhaustedAt) return false;
  if (Date.now() - googleQuotaExhaustedAt >= QUOTA_RESET_MS) {
    googleQuotaExhaustedAt = null;
    return false;
  }
  return true;
}

function isQuotaError(error: unknown): boolean {
  return APICallError.isInstance(error) && (error.statusCode === 429 || error.statusCode === 403);
}

/** Reset the in-memory quota circuit breaker (for testing). */
export function resetQuotaCache(): void {
  googleQuotaExhaustedAt = null;
}

function getGateway() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const gateway = process.env.CLOUDFLARE_GATEWAY_NAME;

  if (!accountId || !gateway) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_GATEWAY_NAME must be set");
  }

  return createAiGateway({
    accountId,
    gateway,
    ...(process.env.CLOUDFLARE_API_KEY ? { apiKey: process.env.CLOUDFLARE_API_KEY } : {}),
  });
}

function getGoogleLanguageModel(): WrappableLanguageModel {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
  return getGateway()(google(process.env.GOOGLE_LANGUAGE_MODEL ?? DEFAULT_GOOGLE_LANGUAGE_MODEL));
}

function getOpenRouterLanguageModel(): WrappableLanguageModel {
  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  return openrouter(process.env.OPENROUTER_LANGUAGE_MODEL ?? DEFAULT_OPENROUTER_LANGUAGE_MODEL);
}

function createFallbackMiddleware(
  getFallback: () => WrappableLanguageModel
): LanguageModelMiddleware {
  return {
    specificationVersion: "v3",
    wrapGenerate: async ({ doGenerate, params }) => {
      if (isGoogleQuotaExhausted()) {
        return getFallback().doGenerate(params);
      }
      try {
        return await doGenerate();
      } catch (primaryError) {
        if (isQuotaError(primaryError)) googleQuotaExhaustedAt = Date.now();
        console.warn("Primary language model failed, using fallback:", primaryError);
        return getFallback().doGenerate(params);
      }
    },
    wrapStream: async ({ doStream, params }) => {
      if (isGoogleQuotaExhausted()) {
        return getFallback().doStream(params);
      }
      try {
        return await doStream();
      } catch (primaryError) {
        if (isQuotaError(primaryError)) googleQuotaExhaustedAt = Date.now();
        console.warn("Primary language model failed, using fallback:", primaryError);
        return getFallback().doStream(params);
      }
    },
  };
}

/** Google Gemini (primary) with automatic fallback to OpenRouter MiniMax. Quota errors (429/403) trigger a 24-hour circuit breaker. */
export function getLanguageModel(): WrappableLanguageModel {
  const primary = getGoogleLanguageModel();
  return wrapLanguageModel({
    model: primary,
    middleware: createFallbackMiddleware(() => getOpenRouterLanguageModel()),
  });
}

/** Embedding model using Google Gemini (`gemini-embedding-001` by default). */
export function getEmbeddingModel() {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  return google.embedding(process.env.GOOGLE_EMBEDDING_MODEL ?? DEFAULT_GOOGLE_EMBEDDING_MODEL);
}

/** Provider options for Google embeddings (fixed output dimensionality). */
export function getEmbeddingProviderOptions() {
  return {
    google: { outputDimensionality: GOOGLE_EMBEDDING_DIMENSIONS },
  };
}

/** Returns the vector dimensions for the embedding model: always 768 (Google Gemini). */
export function getEmbeddingDimensions(): number {
  return GOOGLE_EMBEDDING_DIMENSIONS;
}
