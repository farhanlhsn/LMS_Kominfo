import { expect, type APIRequestContext } from "@playwright/test";

export const seededUsers = {
  learner: {
    email: "learner.one@example.com",
    password: "ChangeMe123!",
  },
  learnerTwo: {
    email: "learner.two@example.com",
    password: "ChangeMe123!",
  },
  instructor: {
    email: "instructor@example.com",
    password: "ChangeMe123!",
  },
  admin: {
    email: "super.admin@example.com",
    password: "ChangeMe123!",
  },
} as const;

export type SeededRole = keyof typeof seededUsers;

export interface E2ESession {
  user: {
    id: string;
    email: string;
    name?: string | null;
    permissions?: string[];
  };
  activeOrganization: {
    id: string;
    name: string;
    slug: string;
  };
  accessToken: string;
  refreshToken: string;
  organizations?: unknown[];
}

type ApiEnvelope<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | {
      success: false;
      error?: { code?: string; message?: string; details?: unknown };
    };

export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()} ${Math.random().toString(16).slice(2, 8)}`;
}

export function authHeaders(session: E2ESession) {
  return {
    Authorization: `Bearer ${session.accessToken}`,
    "x-organization-id": session.activeOrganization.id,
  };
}

export function apiUrl(path: string) {
  const base =
    process.env.E2E_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000/api/v1";
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export async function unwrap<T>(response: Awaited<ReturnType<APIRequestContext["get"]>>) {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  expect(response.ok(), await failureMessage(response, body)).toBeTruthy();
  expect(body?.success, await failureMessage(response, body)).toBe(true);
  return (body as { success: true; data: T; meta?: Record<string, unknown> }).data;
}

export async function unwrapWithMeta<T>(
  response: Awaited<ReturnType<APIRequestContext["get"]>>,
) {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  expect(response.ok(), await failureMessage(response, body)).toBeTruthy();
  expect(body?.success, await failureMessage(response, body)).toBe(true);
  const success = body as { success: true; data: T; meta?: Record<string, unknown> };
  return { data: success.data, meta: success.meta };
}

async function failureMessage(
  response: Awaited<ReturnType<APIRequestContext["get"]>>,
  body: unknown,
) {
  return `${response.status()} ${response.statusText()} ${JSON.stringify(body)}`;
}

export async function login(
  request: APIRequestContext,
  role: keyof typeof seededUsers,
) {
  const credentials = seededUsers[role];
  const loginResponse = await request.post(apiUrl("/auth/login"), {
    data: credentials,
  });
  const loginData = await unwrap<{
    user: E2ESession["user"];
    activeOrganization: E2ESession["activeOrganization"];
    tokens: { accessToken: string; refreshToken: string };
  }>(loginResponse);

  const session: E2ESession = {
    user: loginData.user,
    activeOrganization: loginData.activeOrganization,
    accessToken: loginData.tokens.accessToken,
    refreshToken: loginData.tokens.refreshToken,
  };

  const me = await unwrap<{
    user: E2ESession["user"];
    activeOrganization: E2ESession["activeOrganization"];
    organizations: unknown[];
  }>(
    await request.get(apiUrl("/auth/me"), {
      headers: authHeaders(session),
    }),
  );

  return {
    ...session,
    user: me.user,
    activeOrganization: me.activeOrganization,
    organizations: me.organizations,
  };
}

export async function apiGet<T>(
  request: APIRequestContext,
  session: E2ESession,
  path: string,
) {
  return unwrap<T>(
    await request.get(apiUrl(path), {
      headers: authHeaders(session),
    }),
  );
}

export async function apiGetWithMeta<T>(
  request: APIRequestContext,
  session: E2ESession,
  path: string,
) {
  return unwrapWithMeta<T>(
    await request.get(apiUrl(path), {
      headers: authHeaders(session),
    }),
  );
}

export async function apiPost<T>(
  request: APIRequestContext,
  session: E2ESession,
  path: string,
  data?: unknown,
) {
  return unwrap<T>(
    await request.post(apiUrl(path), {
      headers: authHeaders(session),
      data,
    }),
  );
}

export async function apiPatch<T>(
  request: APIRequestContext,
  session: E2ESession,
  path: string,
  data?: unknown,
) {
  return unwrap<T>(
    await request.patch(apiUrl(path), {
      headers: authHeaders(session),
      data,
    }),
  );
}

export async function apiDelete<T>(
  request: APIRequestContext,
  session: E2ESession,
  path: string,
) {
  return unwrap<T>(
    await request.delete(apiUrl(path), {
      headers: authHeaders(session),
    }),
  );
}

export async function expectForbidden(
  requestPromise: Promise<Awaited<ReturnType<APIRequestContext["get"]>>>,
) {
  const response = await requestPromise;
  expect(response.status()).toBe(403);
}

export async function expectUnauthorized(
  requestPromise: Promise<Awaited<ReturnType<APIRequestContext["get"]>>>,
) {
  const response = await requestPromise;
  expect(response.status()).toBe(401);
}

/** IDOR / ownership denials often surface as 403 or 404 (no resource leak). */
export async function expectDenied(
  requestPromise: Promise<Awaited<ReturnType<APIRequestContext["get"]>>>,
  allowed: number[] = [403, 404],
) {
  const response = await requestPromise;
  const status = response.status();
  const body = await response.text();
  expect(
    allowed.includes(status),
    `expected denied status ${allowed.join("|")}, got ${status}: ${body}`,
  ).toBe(true);
  return response;
}

export async function rawGet(
  request: APIRequestContext,
  session: E2ESession,
  path: string,
  headers: Record<string, string> = {},
) {
  return request.get(apiUrl(path), {
    headers: { ...authHeaders(session), ...headers },
  });
}

export async function rawPost(
  request: APIRequestContext,
  session: E2ESession,
  path: string,
  data?: unknown,
  headers: Record<string, string> = {},
) {
  return request.post(apiUrl(path), {
    headers: { ...authHeaders(session), ...headers },
    data,
  });
}

export async function rawPatch(
  request: APIRequestContext,
  session: E2ESession,
  path: string,
  data?: unknown,
) {
  return request.patch(apiUrl(path), {
    headers: authHeaders(session),
    data,
  });
}

export async function rawDelete(
  request: APIRequestContext,
  session: E2ESession,
  path: string,
) {
  return request.delete(apiUrl(path), {
    headers: authHeaders(session),
  });
}
