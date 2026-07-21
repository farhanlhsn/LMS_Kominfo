import { BadRequestException, Injectable } from "@nestjs/common";
type LiveClassProvider = "MANUAL_LINK" | "ZOOM" | "GOOGLE_MEET" | "CUSTOM";

export interface LiveClassProviderAdapter {
  readonly key: LiveClassProvider;
  readonly integrationMode: "manual_link";
  validateMeetingUrl(url: string): string;
}

class ManualLinkAdapter implements LiveClassProviderAdapter {
  readonly integrationMode = "manual_link" as const;
  constructor(readonly key: LiveClassProvider, private readonly allowedHosts: string[] = []) {}
  validateMeetingUrl(value: string) {
    let url: URL;
    try { url = new URL(value); } catch { throw new BadRequestException("A valid HTTPS meeting link is required"); }
    if (url.protocol !== "https:") throw new BadRequestException("Meeting links must use HTTPS");
    if (this.allowedHosts.length && !this.allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      throw new BadRequestException(`The meeting link does not match the selected ${this.key.toLowerCase()} provider`);
    }
    return url.toString();
  }
}

@Injectable()
export class LiveClassProviderService {
  private readonly adapters = new Map<LiveClassProvider, LiveClassProviderAdapter>([
    ["MANUAL_LINK", new ManualLinkAdapter("MANUAL_LINK")],
    ["ZOOM", new ManualLinkAdapter("ZOOM", ["zoom.us"])],
    ["GOOGLE_MEET", new ManualLinkAdapter("GOOGLE_MEET", ["meet.google.com"])],
    ["CUSTOM", new ManualLinkAdapter("CUSTOM")],
  ]);

  prepare(provider: LiveClassProvider, meetingUrl?: string | null) {
    if (!meetingUrl) throw new BadRequestException("Paste a meeting link before scheduling the live class");
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new BadRequestException("Unsupported live class provider");
    return { meetingUrl: adapter.validateMeetingUrl(meetingUrl), integrationMode: adapter.integrationMode };
  }

  capabilities() {
    return [...this.adapters.values()].map(({ key, integrationMode }) => ({ provider: key, integrationMode, apiIntegration: false }));
  }
}
