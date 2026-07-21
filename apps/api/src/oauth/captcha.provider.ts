export const CAPTCHA_PROVIDER = Symbol.for("lms.captcha.provider");

export type CaptchaVerification = {
  valid: boolean;
  score?: number;
  reason?: string;
};

export interface CaptchaProvider {
  readonly name: string;
  verify(token: string | null | undefined, context?: Record<string, unknown>): Promise<CaptchaVerification>;
}

export class MockCaptchaProvider implements CaptchaProvider {
  readonly name = "mock";

  async verify(token: string | null | undefined): Promise<CaptchaVerification> {
    if (!token || token.length < 4) {
      return { valid: false, reason: "missing-token" };
    }
    if (token === "INVALID" || token.startsWith("bad-")) {
      return { valid: false, reason: "rejected" };
    }
    return { valid: true, score: 0.95 };
  }
}
