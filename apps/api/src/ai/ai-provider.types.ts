export interface AiProviderCapabilities {
  supportsChat: boolean;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
  supportsBatchEmbeddings: boolean;
  supportsToolCalling: boolean;
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
  providerName: string;
  model: string | null;
  embeddingDimensions?: number;
}

export interface AiChatRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
}

export interface AiChatResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AiChatProvider {
  readonly capabilities: AiProviderCapabilities;
  generateText(request: AiChatRequest): Promise<AiChatResult>;
  generateStream?(request: AiChatRequest): AsyncGenerator<string>;
}

export interface AiEmbeddingProvider {
  readonly capabilities: AiProviderCapabilities;
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface LocalEmbeddingProvider extends AiEmbeddingProvider {
  readonly revision?: string;
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );
  return magnitude > 0 ? vector.map((value) => value / magnitude) : vector;
}

export function deterministicEmbedding(
  text: string,
  dimensions: number,
): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const words = text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  for (const word of words) {
    let hash = 2166136261;
    for (const char of word) {
      hash ^= char.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 16777619);
    }
    const index = Math.abs(hash) % dimensions;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[index] = (vector[index] ?? 0) + sign;
  }
  return normalizeVector(vector);
}
