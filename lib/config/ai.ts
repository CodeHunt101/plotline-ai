import { createAiGateway } from "ai-gateway-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import type { LanguageModel } from "ai";

const GOOGLE_EMBEDDING_DIMENSIONS = 768;
const DEFAULT_GOOGLE_LANGUAGE_MODEL = "gemini-2.5-flash";
const DEFAULT_GOOGLE_EMBEDDING_MODEL = "gemini-embedding-001";
const DEFAULT_OPENROUTER_LANGUAGE_MODEL = "minimax/minimax-m2.5:free";
const DEFAULT_OPENROUTER_EMBEDDING_MODEL = "nvidia/llama-nemotron-embed-vl-1b-v2:free";

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

export function getLanguageModel(): LanguageModel {
  const provider = process.env.AI_TEXT_PROVIDER ?? "google";

  switch (provider) {
    case "openrouter": {
      const openrouter = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      return openrouter(process.env.OPENROUTER_LANGUAGE_MODEL ?? DEFAULT_OPENROUTER_LANGUAGE_MODEL);
    }

    case "google": {
      const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
      return getGateway()(
        google(process.env.GOOGLE_LANGUAGE_MODEL ?? DEFAULT_GOOGLE_LANGUAGE_MODEL)
      );
    }

    default:
      throw new Error(
        `Unsupported AI_TEXT_PROVIDER "${provider}". Valid values: google, openrouter`
      );
  }
}

export function getEmbeddingModel() {
  const provider = process.env.AI_EMBEDDING_PROVIDER ?? "google";

  switch (provider) {
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google.embedding(process.env.GOOGLE_EMBEDDING_MODEL ?? DEFAULT_GOOGLE_EMBEDDING_MODEL);
    }

    case "openrouter": {
      const openrouter = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      return openrouter.embedding(
        process.env.OPENROUTER_EMBEDDING_MODEL ?? DEFAULT_OPENROUTER_EMBEDDING_MODEL
      );
    }

    default:
      throw new Error(
        `Unsupported AI_EMBEDDING_PROVIDER "${provider}". Valid values: google, openrouter`
      );
  }
}

export function getEmbeddingProviderOptions() {
  const provider = process.env.AI_EMBEDDING_PROVIDER ?? "google";

  if (provider === "google") {
    return {
      google: { outputDimensionality: GOOGLE_EMBEDDING_DIMENSIONS },
    };
  }

  return undefined;
}
