import { SetMetadata } from "@nestjs/common";
import type { AccessContextType } from "@lms/db";

export const ACCESS_SCOPE_KEY = "access_scope";

export interface AccessScopeMetadata {
  type: AccessContextType;
  param?: string;
  bodyField?: string;
}

export const AccessScope = (scope: AccessScopeMetadata) =>
  SetMetadata(ACCESS_SCOPE_KEY, scope);
