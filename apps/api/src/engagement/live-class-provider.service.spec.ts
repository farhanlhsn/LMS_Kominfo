import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { LiveClassProviderService } from "./live-class-provider.service";

describe("LiveClassProviderService", () => {
  const service = new LiveClassProviderService();
  it("keeps all providers in manual-link mode without API integration", () => {
    expect(service.capabilities()).toHaveLength(4);
    expect(service.capabilities().every((item) => item.integrationMode === "manual_link" && !item.apiIntegration)).toBe(true);
  });
  it("validates provider-specific links", () => {
    expect(service.prepare("ZOOM", "https://example.zoom.us/j/123").meetingUrl).toContain("zoom.us");
    expect(() => service.prepare("GOOGLE_MEET", "https://zoom.us/j/123")).toThrow(BadRequestException);
  });
  it("requires HTTPS", () => expect(() => service.prepare("CUSTOM", "http://meeting.example.test/room")).toThrow(BadRequestException));
});
