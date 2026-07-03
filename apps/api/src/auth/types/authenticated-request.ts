import type { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  sessionId: string;
  activeOrganizationId: string | null;
}

export interface OrganizationContext {
  id: string;
  slug: string;
  name: string;
  memberId: string;
  roleKeys: string[];
  permissionKeys: string[];
  isPlatformAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  organization?: OrganizationContext;
}
