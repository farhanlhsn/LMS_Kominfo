import type { APIRequestContext, Page } from "@playwright/test";
import { login, type E2ESession, type SeededRole } from "./api";

const SESSION_KEY = "lms.session.v1";

export async function loginPageAs(
  page: Page,
  request: APIRequestContext,
  role: SeededRole,
) {
  const session = await login(request, role);
  await seedBrowserSession(page, session);
  return session;
}

export async function seedBrowserSession(page: Page, session: E2ESession) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: SESSION_KEY, value: session },
  );
}
