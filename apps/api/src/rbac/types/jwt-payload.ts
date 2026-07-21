export interface AccessTokenPayload {
  sub: string;
  sessionId: string;
  activeOrganizationId: string | null;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: "refresh";
}
