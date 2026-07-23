import { describe, expect, it, vi } from "vitest";
import {
  ContextualRbacService,
  resolveCapabilityStates,
} from "./contextual-rbac.service";

describe("contextual RBAC capability resolution", () => {
  it("lets a descendant ALLOW override an ancestor PREVENT", () => {
    const result = resolveCapabilityStates([
      {
        id: "r1",
        key: "instructor",
        name: "Instructor",
        assignedAt: ["organization:o1"],
        baseGrant: false,
        overrides: [
          { effect: "PREVENT", depth: 1 },
          { effect: "ALLOW", depth: 3 },
        ],
      },
    ]);

    expect(result.allowed).toBe(true);
    expect(result.roles[0]?.effectiveEffect).toBe("ALLOW");
  });

  it("lets one role grant when another role is prevented", () => {
    const result = resolveCapabilityStates([
      {
        id: "r1",
        key: "learner",
        name: "Learner",
        assignedAt: ["organization:o1"],
        baseGrant: true,
        overrides: [{ effect: "PREVENT", depth: 2 }],
      },
      {
        id: "r2",
        key: "reviewer",
        name: "Reviewer",
        assignedAt: ["course:c1"],
        baseGrant: true,
        overrides: [],
      },
    ]);

    expect(result.allowed).toBe(true);
  });

  it("makes PROHIBIT final across all roles and descendants", () => {
    const result = resolveCapabilityStates([
      {
        id: "r1",
        key: "learner",
        name: "Learner",
        assignedAt: ["organization:o1"],
        baseGrant: true,
        overrides: [
          { effect: "PROHIBIT", depth: 1 },
          { effect: "ALLOW", depth: 4 },
        ],
      },
      {
        id: "r2",
        key: "instructor",
        name: "Instructor",
        assignedAt: ["course:c1"],
        baseGrant: true,
        overrides: [],
      },
    ]);

    expect(result.prohibited).toBe(true);
    expect(result.allowed).toBe(false);
  });

  it("fails closed when capability definition is missing", async () => {
    const prisma = {
      permission: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const contexts = {
      ensureContext: vi.fn().mockResolvedValue({
        id: "ctx",
        key: "organization:o1",
        type: "ORGANIZATION",
        instanceId: "o1",
      }),
    };
    const service = new ContextualRbacService(
      prisma as never,
      contexts as never,
    );

    const decision = await service.evaluate({
      organizationId: "o1",
      userId: "u1",
      permissionKey: "missing:capability",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("MISSING_CAPABILITY");
  });
});
