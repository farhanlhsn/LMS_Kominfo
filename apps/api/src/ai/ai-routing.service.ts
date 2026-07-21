import { Inject, Injectable } from "@nestjs/common";
import { AI_CONFIG, type AiConfig } from "@lms/config";
import { AiEmbeddingProviderFactory } from "./ai-provider.factories";

export type AiRoute = "COURSE" | "GENERAL" | "BLOCKED" | "OFF_TOPIC";

const cheatingPatterns = [
  /(?:kasih|beri|bocorkan|tunjukkan).*(?:jawaban|kunci).*(?:quiz|kuis|ujian|tes|nomor)/i,
  /(?:jawaban|kunci).*(?:quiz|kuis|ujian|tes).*(?:nomor|soal)/i,
  /kerjakan.*(?:quiz|kuis|ujian|tes).*(?:saya|aku)/i,
];
const offTopicPatterns = [
  /(?:cara|resep|bahan).*(?:sayur|sop|masak|goreng|kue)/i,
  /(?:prediksi|taruhan).*(?:bola|slot|judi)/i,
];
const educationalTerms = new Set([
  "algoritma",
  "api",
  "basis",
  "biology",
  "database",
  "ekonomi",
  "fisika",
  "http",
  "jaringan",
  "kimia",
  "komputer",
  "matematika",
  "programming",
  "pemrograman",
  "science",
  "statistik",
  "tcp",
  "teknologi",
  "udp",
  "web",
]);

@Injectable()
export class AiRoutingService {
  constructor(
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    private readonly embeddingFactory?: AiEmbeddingProviderFactory,
  ) {}

  classify(question: string, hasCourseContext: boolean): AiRoute {
    const boundary = this.preflight(question);
    if (boundary) return boundary;
    if (hasCourseContext) return "COURSE";
    const terms = question.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    if (terms.some((term) => educationalTerms.has(term))) return "GENERAL";
    if (!this.config.allowOffTopic) return "OFF_TOPIC";
    return this.config.allowGeneralEducational ? "GENERAL" : "OFF_TOPIC";
  }

  preflight(question: string): "BLOCKED" | "OFF_TOPIC" | null {
    if (cheatingPatterns.some((pattern) => pattern.test(question)))
      return "BLOCKED";
    if (offTopicPatterns.some((pattern) => pattern.test(question)))
      return "OFF_TOPIC";
    return null;
  }

  async classifyWithLocalEmbedding(
    question: string,
    hasCourseContext: boolean,
  ): Promise<AiRoute> {
    const rules = this.classify(question, hasCourseContext);
    if (
      hasCourseContext ||
      !this.config.localClassifier.enabled ||
      this.config.routerMode === "rules_first" ||
      !this.embeddingFactory
    ) {
      return rules;
    }
    const provider = this.embeddingFactory.create();
    const [query, domain, offTopic] = await provider.embedBatch([
      question,
      "computer science networking programming mathematics physics chemistry biology economics education technology tcp udp api database",
      "cooking recipes food gambling betting celebrity gossip household chores",
    ]);
    const similarity = (left: number[] = [], right: number[] = []) =>
      left.length === right.length
        ? left.reduce(
            (sum, value, index) => sum + value * (right[index] ?? 0),
            0,
          )
        : -1;
    const domainScore = similarity(query, domain);
    const offTopicScore = similarity(query, offTopic);
    if (
      offTopicScore >=
        this.config.localClassifier.offTopicSimilarityThreshold &&
      offTopicScore > domainScore
    ) {
      return "OFF_TOPIC";
    }
    if (domainScore >= this.config.localClassifier.domainSimilarityThreshold) {
      return "GENERAL";
    }
    return rules;
  }
}
