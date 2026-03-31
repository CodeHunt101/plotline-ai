import { wrapLanguageModel, APICallError } from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import type { LanguageModelMiddleware } from "ai";

type WrappableLanguageModel = Parameters<typeof wrapLanguageModel>[0]["model"];
type StreamResult = Awaited<ReturnType<WrappableLanguageModel["doStream"]>>;
type ModelQuotaConfig = {
  id: string;
  quotaResetMs: number;
};
type FallbackConfig = ModelQuotaConfig & {
  getModel: () => WrappableLanguageModel;
};

const GOOGLE_EMBEDDING_DIMENSIONS = 768;
const DEFAULT_GOOGLE_LANGUAGE_MODEL = "gemini-2.5-flash";
const DEFAULT_GOOGLE_EMBEDDING_MODEL = "gemini-embedding-001";
const DEFAULT_OPENROUTER_LANGUAGE_MODEL = "minimax/minimax-m2.5:free";

const GOOGLE_QUOTA_RESET_MS = 24 * 60 * 60 * 1000;
const OPENROUTER_QUOTA_RESET_MS = 5 * 60 * 1000;

// Best-effort, in-memory circuit breaker state. This is per-process/per-isolate only
// and is not intended to provide durable or cross-instance coordination.
const quotaExhaustedAt = new Map<string, { timestamp: number; delayMs: number }>();

function formatDurationMs(durationMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, durationMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(
    seconds
  ).padStart(2, "0")}s`;
}

function getQuotaStatus(modelId: string): { exhausted: boolean; resetsIn: string | null } {
  const exhausted = quotaExhaustedAt.get(modelId);
  if (!exhausted) {
    return { exhausted: false, resetsIn: null };
  }
  const { timestamp, delayMs } = exhausted;
  const elapsed = Date.now() - timestamp;
  const remaining = delayMs - elapsed;
  if (remaining <= 0) {
    quotaExhaustedAt.delete(modelId);
    return { exhausted: false, resetsIn: null };
  }
  return { exhausted: true, resetsIn: formatDurationMs(remaining) };
}

function isQuotaExhausted(modelId: string): boolean {
  const { exhausted, resetsIn } = getQuotaStatus(modelId);
  if (exhausted) {
    console.warn(`[quota] ${modelId} quota exhausted. Resets in ${resetsIn}.`);
  }
  return exhausted;
}

function isQuotaError(error: unknown): boolean {
  return APICallError.isInstance(error) && (error.statusCode === 429 || error.statusCode === 403);
}

function markQuotaExhausted(modelId: string, statusCode: number, delayMs: number) {
  const now = Date.now();
  quotaExhaustedAt.set(modelId, { timestamp: now, delayMs });
  const resetAt = new Date(now + delayMs).toISOString();
  console.warn(
    `[quota] ${modelId} quota exhausted (${statusCode}). Circuit breaker active until ${resetAt}.`
  );
}

/** Reset the in-memory quota circuit breaker (for testing). */
export function resetQuotaCache(): void {
  quotaExhaustedAt.clear();
}

function createAllModelsExhaustedError(models: ModelQuotaConfig[]): Error {
  const exhaustionSummary = models
    .map(({ id }) => {
      const { exhausted, resetsIn } = getQuotaStatus(id);
      return exhausted && resetsIn
        ? `${id} (resets in ${resetsIn})`
        : `${id} (availability unknown)`;
    })
    .join(", ");

  return new Error(`All language models are currently quota exhausted: ${exhaustionSummary}`);
}

function wrapStreamResultWithQuotaDetection(
  result: StreamResult,
  model: ModelQuotaConfig
): StreamResult {
  const reader = result.stream.getReader();

  result.stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          controller.close();
          return;
        }

        controller.enqueue(value);
      } catch (error) {
        if (isQuotaError(error)) {
          markQuotaExhausted(model.id, (error as APICallError).statusCode!, model.quotaResetMs);
        } else {
          console.warn(`Streaming language model (${model.id}) failed during consumption:`, error);
        }

        controller.error(error);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });

  return result;
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

function getOpenRouterLanguageModel(modelIdOverride?: string): WrappableLanguageModel {
  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  return openrouter(
    modelIdOverride ?? process.env.OPENROUTER_LANGUAGE_MODEL ?? DEFAULT_OPENROUTER_LANGUAGE_MODEL
  );
}

function createFallbackMiddleware(
  primary: ModelQuotaConfig,
  fallbacks: FallbackConfig[]
): LanguageModelMiddleware {
  return {
    specificationVersion: "v3",
    wrapGenerate: async ({ doGenerate, params }) => {
      let lastError: unknown | undefined;

      if (!isQuotaExhausted(primary.id)) {
        try {
          return await doGenerate();
        } catch (error) {
          if (isQuotaError(error)) {
            markQuotaExhausted(
              primary.id,
              (error as APICallError).statusCode!,
              primary.quotaResetMs
            );
          } else {
            console.warn(
              `Primary language model (${primary.id}) failed, trying next fallback:`,
              error
            );
          }
          lastError = error;
        }
      }

      for (const fallback of fallbacks) {
        if (isQuotaExhausted(fallback.id)) continue;

        try {
          return await fallback.getModel().doGenerate(params);
        } catch (error) {
          if (isQuotaError(error)) {
            markQuotaExhausted(
              fallback.id,
              (error as APICallError).statusCode!,
              fallback.quotaResetMs
            );
          } else {
            console.warn(
              `Fallback language model (${fallback.id}) failed, trying next fallback:`,
              error
            );
          }
          lastError = error;
        }
      }

      if (lastError !== undefined) {
        throw lastError;
      }

      throw createAllModelsExhaustedError([primary, ...fallbacks]);
    },
    wrapStream: async ({ doStream, params }) => {
      let lastError: unknown | undefined;

      if (!isQuotaExhausted(primary.id)) {
        try {
          return wrapStreamResultWithQuotaDetection(await doStream(), primary);
        } catch (error) {
          if (isQuotaError(error)) {
            markQuotaExhausted(
              primary.id,
              (error as APICallError).statusCode!,
              primary.quotaResetMs
            );
          } else {
            console.warn(
              `Primary language model (${primary.id}) failed, trying next fallback:`,
              error
            );
          }
          lastError = error;
        }
      }

      for (const fallback of fallbacks) {
        if (isQuotaExhausted(fallback.id)) continue;

        try {
          return wrapStreamResultWithQuotaDetection(
            await fallback.getModel().doStream(params),
            fallback
          );
        } catch (error) {
          if (isQuotaError(error)) {
            markQuotaExhausted(
              fallback.id,
              (error as APICallError).statusCode!,
              fallback.quotaResetMs
            );
          } else {
            console.warn(
              `Fallback language model (${fallback.id}) failed, trying next fallback:`,
              error
            );
          }
          lastError = error;
        }
      }

      if (lastError !== undefined) {
        throw lastError;
      }

      throw createAllModelsExhaustedError([primary, ...fallbacks]);
    },
  };
}

/** Google Gemini (primary) with automatic fallback to multiple OpenRouter models. Quota errors (429/403) trigger customized circuit breakers. */
export function getLanguageModel(): WrappableLanguageModel {
  const primary = getGoogleLanguageModel();
  return wrapLanguageModel({
    model: primary,
    middleware: createFallbackMiddleware(
      {
        id: "google-primary",
        quotaResetMs: GOOGLE_QUOTA_RESET_MS,
      },
      [
        {
          id: "openrouter-minimax",
          quotaResetMs: OPENROUTER_QUOTA_RESET_MS,
          getModel: () =>
            getOpenRouterLanguageModel(
              process.env.OPENROUTER_LANGUAGE_MODEL ?? DEFAULT_OPENROUTER_LANGUAGE_MODEL
            ),
        },
        {
          id: "openrouter-llama",
          quotaResetMs: OPENROUTER_QUOTA_RESET_MS,
          getModel: () => getOpenRouterLanguageModel("meta-llama/llama-3.3-70b-instruct:free"),
        },
        {
          id: "openrouter-free-auto",
          quotaResetMs: OPENROUTER_QUOTA_RESET_MS,
          getModel: () => getOpenRouterLanguageModel("openrouter/free"),
        },
      ]
    ),
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
