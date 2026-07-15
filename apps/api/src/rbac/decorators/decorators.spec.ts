import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { ActiveOrganization } from "./active-organization.decorator";
import { CurrentUser } from "./current-user.decorator";
import { Permissions, REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator";
import { Reflector } from "@nestjs/core";

function paramFactory(decorator: (...args: any[]) => ParameterDecorator) {
  class Host {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    method(@decorator() _value: unknown) {}
  }
  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Host,
    "method",
  ) as Record<string, { factory: (data: unknown, ctx: unknown) => unknown }>;
  const key = Object.keys(metadata)[0]!;
  return metadata[key]!.factory;
}

describe("rbac decorators", () => {
  it("Permissions sets metadata", () => {
    class Host {
      @Permissions("courses:read", "courses:update")
      handler() {}
    }
    const reflector = new Reflector();
    expect(
      reflector.get(REQUIRED_PERMISSIONS_KEY, Host.prototype.handler),
    ).toEqual(["courses:read", "courses:update"]);
  });

  it("CurrentUser reads request.user", () => {
    const factory = paramFactory(CurrentUser);
    const user = { id: "u1" };
    const value = factory(undefined, {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    });
    expect(value).toBe(user);
  });

  it("ActiveOrganization reads request.organization", () => {
    const factory = paramFactory(ActiveOrganization);
    const organization = { id: "org-1" };
    const value = factory(undefined, {
      switchToHttp: () => ({
        getRequest: () => ({ organization }),
      }),
    });
    expect(value).toBe(organization);
  });
});
