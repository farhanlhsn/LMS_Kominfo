export const API_VERSION_PREFIX = "api/v1";
export const DEFAULT_TIMEZONE = "UTC";

export const DEFAULT_PORTS = {
  api: 4000,
  web: 3000,
} as const;

export function readRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export type AiChatProviderName =
  "mock" | "openai" | "openai_compatible" | "gemini_openai_compatible";
export type AiEmbeddingProviderName = AiChatProviderName | "local";
export type AiRouterMode = "rules_first" | "rules_then_local";
export type AiAnswerMode =
  | "STRICT_COURSE_ONLY"
  | "COURSE_FIRST_WITH_DOMAIN_FALLBACK"
  | "GENERAL_EDUCATIONAL_ALLOWED"
  | "DISABLED";

export interface AiProviderConnectionConfig {
  apiKey?: string;
  baseUrl?: string;
  chatModel?: string;
  embeddingModel?: string;
  organizationId?: string;
}

export interface AiConfig {
  enabled: boolean;
  chatProvider: AiChatProviderName;
  embeddingProvider: AiEmbeddingProviderName;
  routerMode: AiRouterMode;
  answerMode: AiAnswerMode;
  allowGeneralEducational: boolean;
  allowOffTopic: boolean;
  requestTimeoutMs: number;
  streamingEnabled: boolean;
  maxOutputTokens: number;
  defaultTemperature: number;
  rag: { topK: number; minScore: number; maxContextTokens: number };
  cache: { enabled: boolean; ttlSeconds: number };
  followups: { enabled: boolean; count: number };
  canonicalization: {
    enabled: boolean;
    useExternalModel: boolean;
    similarityThreshold: number;
  };
  localClassifier: {
    enabled: boolean;
    provider: string;
    timeoutMs: number;
    domainSimilarityThreshold: number;
    offTopicSimilarityThreshold: number;
  };
  localEmbedding: {
    provider: string;
    model: string;
    revision?: string;
    dimensions: number;
    queryPrefix: string;
    documentPrefix: string;
    normalize: boolean;
    version?: string;
  };
  providers: {
    openai: AiProviderConnectionConfig;
    openaiCompatible: AiProviderConnectionConfig;
    geminiOpenAiCompatible: AiProviderConnectionConfig;
  };
  usage: { loggingEnabled: boolean; logPrompts: boolean };
  rateLimit: {
    enabled: boolean;
    perUserPerMinute: number;
    perOrgPerMinute: number;
  };
}

export const AI_CONFIG = Symbol("AI_CONFIG");

const CHAT_PROVIDERS = [
  "mock",
  "openai",
  "openai_compatible",
  "gemini_openai_compatible",
] as const;
const EMBEDDING_PROVIDERS = [...CHAT_PROVIDERS, "local"] as const;
const ROUTER_MODES = ["rules_first", "rules_then_local"] as const;
const ANSWER_MODES = [
  "STRICT_COURSE_ONLY",
  "COURSE_FIRST_WITH_DOMAIN_FALLBACK",
  "GENERAL_EDUCATIONAL_ALLOWED",
  "DISABLED",
] as const;
const LOCAL_EMBEDDING_PROVIDERS = ["transformers_js", "mock"] as const;

type Environment = Record<string, unknown>;

function value(env: Environment, name: string): string | undefined {
  const current = env[name];
  return typeof current === "string" && current.trim()
    ? current.trim()
    : undefined;
}

function booleanValue(
  env: Environment,
  name: string,
  fallback: boolean,
): boolean {
  const current = value(env, name);
  if (current === undefined) return fallback;
  if (current === "true") return true;
  if (current === "false") return false;
  throw new Error(`${name} must be either true or false`);
}

function numberValue(
  env: Environment,
  name: string,
  fallback: number,
  options: { min?: number; max?: number; integer?: boolean } = {},
): number {
  const raw = value(env, name);
  const parsed = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number`);
  if (options.integer && !Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer`);
  }
  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${name} must be at least ${options.min}`);
  }
  if (options.max !== undefined && parsed > options.max) {
    throw new Error(`${name} must be at most ${options.max}`);
  }
  return parsed;
}

function enumValue<T extends string>(
  env: Environment,
  name: string,
  supported: readonly T[],
  fallback: T,
): T {
  const current = value(env, name) ?? fallback;
  if (!supported.includes(current as T)) {
    throw new Error(
      `${name} has unsupported value "${current}". Supported values: ${supported.join(", ")}`,
    );
  }
  return current as T;
}

function requireValues(
  env: Environment,
  names: string[],
  selection: string,
): void {
  const missing = names.filter((name) => !value(env, name));
  if (missing.length) {
    throw new Error(`${selection} requires: ${missing.join(", ")}`);
  }
}

export function createAiConfig(env: Environment = process.env): AiConfig {
  const enabled = booleanValue(env, "AI_ENABLED", false);
  const selectedChatProvider = enumValue(
    env,
    "AI_CHAT_PROVIDER",
    CHAT_PROVIDERS,
    "mock",
  );
  const selectedEmbeddingProvider = enumValue(
    env,
    "AI_EMBEDDING_PROVIDER",
    EMBEDDING_PROVIDERS,
    "mock",
  );
  const chatProvider = enabled ? selectedChatProvider : "mock";
  const embeddingProvider = enabled ? selectedEmbeddingProvider : "mock";
  const localEmbeddingProvider = enumValue(
    env,
    "AI_LOCAL_EMBEDDING_PROVIDER",
    LOCAL_EMBEDDING_PROVIDERS,
    "transformers_js",
  );

  if (enabled) {
    if (chatProvider === "openai") {
      requireValues(
        env,
        ["OPENAI_API_KEY", "OPENAI_CHAT_MODEL"],
        "AI_CHAT_PROVIDER=openai",
      );
    } else if (chatProvider === "openai_compatible") {
      requireValues(
        env,
        [
          "OPENAI_COMPATIBLE_API_KEY",
          "OPENAI_COMPATIBLE_BASE_URL",
          "OPENAI_COMPATIBLE_CHAT_MODEL",
        ],
        "AI_CHAT_PROVIDER=openai_compatible",
      );
    } else if (chatProvider === "gemini_openai_compatible") {
      requireValues(
        env,
        ["GEMINI_API_KEY", "GEMINI_OPENAI_BASE_URL", "GEMINI_CHAT_MODEL"],
        "AI_CHAT_PROVIDER=gemini_openai_compatible",
      );
    }

    if (embeddingProvider === "openai") {
      requireValues(
        env,
        ["OPENAI_API_KEY", "OPENAI_EMBEDDING_MODEL"],
        "AI_EMBEDDING_PROVIDER=openai",
      );
    } else if (embeddingProvider === "openai_compatible") {
      requireValues(
        env,
        [
          "OPENAI_COMPATIBLE_API_KEY",
          "OPENAI_COMPATIBLE_BASE_URL",
          "OPENAI_COMPATIBLE_EMBEDDING_MODEL",
        ],
        "AI_EMBEDDING_PROVIDER=openai_compatible",
      );
    } else if (embeddingProvider === "gemini_openai_compatible") {
      requireValues(
        env,
        ["GEMINI_API_KEY", "GEMINI_OPENAI_BASE_URL", "GEMINI_EMBEDDING_MODEL"],
        "AI_EMBEDDING_PROVIDER=gemini_openai_compatible",
      );
    } else if (embeddingProvider === "local") {
      requireValues(
        env,
        [
          "AI_LOCAL_EMBEDDING_PROVIDER",
          "AI_LOCAL_EMBEDDING_MODEL",
          "AI_LOCAL_EMBEDDING_DIMENSIONS",
        ],
        "AI_EMBEDDING_PROVIDER=local",
      );
    }
  }

  return {
    enabled,
    chatProvider,
    embeddingProvider,
    routerMode: enumValue(
      env,
      "AI_ROUTER_MODE",
      ROUTER_MODES,
      "rules_then_local",
    ),
    answerMode: enumValue(
      env,
      "AI_ANSWER_MODE",
      ANSWER_MODES,
      "COURSE_FIRST_WITH_DOMAIN_FALLBACK",
    ),
    allowGeneralEducational: booleanValue(
      env,
      "AI_ALLOW_GENERAL_EDUCATIONAL",
      true,
    ),
    allowOffTopic: booleanValue(env, "AI_ALLOW_OFF_TOPIC", false),
    requestTimeoutMs: numberValue(env, "AI_REQUEST_TIMEOUT_MS", 60_000, {
      min: 1,
      integer: true,
    }),
    streamingEnabled: booleanValue(env, "AI_STREAMING_ENABLED", true),
    maxOutputTokens: numberValue(env, "AI_MAX_OUTPUT_TOKENS", 900, {
      min: 1,
      integer: true,
    }),
    defaultTemperature: numberValue(env, "AI_DEFAULT_TEMPERATURE", 0.2, {
      min: 0,
      max: 2,
    }),
    rag: {
      topK: numberValue(env, "AI_RAG_TOP_K", 5, { min: 1, integer: true }),
      minScore: numberValue(env, "AI_RAG_MIN_SCORE", 0.2, { min: 0, max: 1 }),
      maxContextTokens: numberValue(env, "AI_MAX_CONTEXT_TOKENS", 3500, {
        min: 1,
        integer: true,
      }),
    },
    cache: {
      enabled: booleanValue(env, "AI_ENABLE_ANSWER_CACHE", true),
      ttlSeconds: numberValue(env, "AI_ANSWER_CACHE_TTL_SECONDS", 86400, {
        min: 1,
        integer: true,
      }),
    },
    followups: {
      enabled: booleanValue(env, "AI_ENABLE_FOLLOWUP_SUGGESTIONS", true),
      count: numberValue(env, "AI_FOLLOWUP_SUGGESTION_COUNT", 3, {
        min: 0,
        max: 5,
        integer: true,
      }),
    },
    canonicalization: {
      enabled: booleanValue(env, "AI_CANONICALIZATION_ENABLED", true),
      useExternalModel: booleanValue(
        env,
        "AI_CANONICALIZATION_USE_EXTERNAL_MODEL",
        false,
      ),
      similarityThreshold: numberValue(
        env,
        "AI_CANONICAL_SIMILARITY_THRESHOLD",
        0.86,
        { min: 0, max: 1 },
      ),
    },
    localClassifier: {
      enabled: booleanValue(env, "AI_LOCAL_CLASSIFIER_ENABLED", true),
      provider:
        value(env, "AI_LOCAL_CLASSIFIER_PROVIDER") ?? "rules_and_embedding",
      timeoutMs: numberValue(env, "AI_LOCAL_CLASSIFIER_TIMEOUT_MS", 10000, {
        min: 1,
        integer: true,
      }),
      domainSimilarityThreshold: numberValue(
        env,
        "AI_DOMAIN_SIMILARITY_THRESHOLD",
        0.78,
        { min: 0, max: 1 },
      ),
      offTopicSimilarityThreshold: numberValue(
        env,
        "AI_OFF_TOPIC_SIMILARITY_THRESHOLD",
        0.8,
        { min: 0, max: 1 },
      ),
    },
    localEmbedding: {
      provider: localEmbeddingProvider,
      model:
        value(env, "AI_LOCAL_EMBEDDING_MODEL") ??
        "intfloat/multilingual-e5-small",
      revision: value(env, "AI_LOCAL_EMBEDDING_MODEL_REVISION"),
      dimensions: numberValue(env, "AI_LOCAL_EMBEDDING_DIMENSIONS", 384, {
        min: 1,
        integer: true,
      }),
      queryPrefix: value(env, "AI_LOCAL_EMBEDDING_QUERY_PREFIX") ?? "query:",
      documentPrefix:
        value(env, "AI_LOCAL_EMBEDDING_DOCUMENT_PREFIX") ?? "passage:",
      normalize: booleanValue(env, "AI_LOCAL_EMBEDDING_NORMALIZE", true),
      version: value(env, "AI_LOCAL_EMBEDDING_VERSION"),
    },
    providers: {
      openai: {
        apiKey: value(env, "OPENAI_API_KEY"),
        baseUrl: value(env, "OPENAI_BASE_URL") ?? "https://api.openai.com/v1",
        chatModel: value(env, "OPENAI_CHAT_MODEL"),
        embeddingModel: value(env, "OPENAI_EMBEDDING_MODEL"),
        organizationId: value(env, "OPENAI_ORG_ID"),
      },
      openaiCompatible: {
        apiKey: value(env, "OPENAI_COMPATIBLE_API_KEY"),
        baseUrl: value(env, "OPENAI_COMPATIBLE_BASE_URL"),
        chatModel: value(env, "OPENAI_COMPATIBLE_CHAT_MODEL"),
        embeddingModel: value(env, "OPENAI_COMPATIBLE_EMBEDDING_MODEL"),
        organizationId: value(env, "OPENAI_COMPATIBLE_ORG_ID"),
      },
      geminiOpenAiCompatible: {
        apiKey: value(env, "GEMINI_API_KEY"),
        baseUrl:
          value(env, "GEMINI_OPENAI_BASE_URL") ??
          "https://generativelanguage.googleapis.com/v1beta/openai/",
        chatModel: value(env, "GEMINI_CHAT_MODEL") ?? "gemini-2.5-flash",
        embeddingModel: value(env, "GEMINI_EMBEDDING_MODEL"),
      },
    },
    usage: {
      loggingEnabled: booleanValue(env, "AI_USAGE_LOGGING_ENABLED", true),
      logPrompts: booleanValue(env, "AI_LOG_PROMPTS", false),
    },
    rateLimit: {
      enabled: booleanValue(env, "AI_RATE_LIMIT_ENABLED", true),
      perUserPerMinute: numberValue(
        env,
        "AI_RATE_LIMIT_PER_USER_PER_MINUTE",
        10,
        { min: 1, integer: true },
      ),
      perOrgPerMinute: numberValue(
        env,
        "AI_RATE_LIMIT_PER_ORG_PER_MINUTE",
        100,
        { min: 1, integer: true },
      ),
    },
  };
}

export function validateEnvironment(env: Environment): Environment {
  createAiConfig(env);
  return env;
}
