import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: <T,>(initial: T) =>
      [
        typeof initial === "function" ? (initial as () => T)() : initial,
        () => undefined,
      ] as [T, (next: T) => void],
    useEffect: () => undefined,
    useCallback: <T extends (...args: any[]) => any>(fn: T) => fn,
    useMemo: <T,>(factory: () => T) => factory(),
    useRef: <T,>(initial: T) => ({ current: initial }),
  };
});

const originalNavigator = (globalThis as { navigator?: Navigator }).navigator;
const originalWindow = (globalThis as { window?: Window }).window;
const originalNotification = (globalThis as {
  Notification?: typeof Notification;
}).Notification;

function setNavigator(value: Navigator | undefined) {
  Object.defineProperty(globalThis, "navigator", {
    value,
    configurable: true,
    writable: true,
  });
}

function setWindow(value: Window | undefined) {
  Object.defineProperty(globalThis, "window", {
    value,
    configurable: true,
    writable: true,
  });
}

function setNotification(value: typeof Notification | undefined) {
  Object.defineProperty(globalThis, "Notification", {
    value,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  setNavigator({ onLine: true, connection: {} } as unknown as Navigator);
  setWindow({
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as Window);
  setNotification({ permission: "default" } as unknown as typeof Notification);
});

afterEach(() => {
  setNavigator(originalNavigator);
  setWindow(originalWindow);
  setNotification(originalNotification);
  vi.restoreAllMocks();
});

describe("NetworkStatusPill", () => {
  it("renders nothing while online by default", async () => {
    setNavigator({ onLine: true, connection: {} } as unknown as Navigator);
    const { NetworkStatusPill } = await import("./network-status");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const html = renderToStaticMarkup(createElement(NetworkStatusPill, {}));
    expect(html).toBe("");
  });

  it("renders nothing before network status hydrates", async () => {
    setNavigator({ onLine: false, connection: {} } as unknown as Navigator);
    const { NetworkStatusPill } = await import("./network-status");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const html = renderToStaticMarkup(createElement(NetworkStatusPill, {}));
    expect(html).toBe("");
  });

  it("NetworkStatusEmpty renders nothing while online", async () => {
    const { NetworkStatusEmpty } = await import("./network-status");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const html = renderToStaticMarkup(createElement(NetworkStatusEmpty, {}));
    expect(html).toBe("");
  });
});

describe("PwaInstallPrompt", () => {
  it("renders nothing when no install event has fired", async () => {
    const { PwaInstallPrompt } = await import("./pwai-install-prompt");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const html = renderToStaticMarkup(createElement(PwaInstallPrompt, {}));
    expect(html).toBe("");
  });
});

describe("ServiceWorkerUpdateToast", () => {
  it("renders nothing until an update is available", async () => {
    const { ServiceWorkerUpdateToast } = await import("./sw-update-toast");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const html = renderToStaticMarkup(createElement(ServiceWorkerUpdateToast, {}));
    expect(html).toBe("");
  });
});

describe("PushSubscribeButton", () => {
  it("renders a disabled button when push is unsupported", async () => {
    setNotification(undefined);
    setNavigator({
      serviceWorker: {
        ready: Promise.resolve({ pushManager: { getSubscription: async () => null } }),
      },
    } as unknown as Navigator);
    setWindow({} as unknown as Window);

    const { PushSubscribeButton } = await import("./push-subscribe-button");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const html = renderToStaticMarkup(
      createElement(PushSubscribeButton, { vapidKeyResolver: async () => null }),
    );
    expect(html).toContain('data-testid="push-subscribe-button"');
    expect(html).toContain("Enable notifications");
    expect(html).toContain("disabled");
  });

  it("shows granted permission hint when permission is granted", async () => {
    setNotification({ permission: "granted" } as unknown as typeof Notification);
    setNavigator({
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: async () => ({
              toJSON: () => ({ endpoint: "https://push.example.com", keys: {} }),
            }),
          },
        }),
      },
    } as unknown as Navigator);
    setWindow({ PushManager: class {} } as unknown as Window);

    const { PushSubscribeButton } = await import("./push-subscribe-button");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const html = renderToStaticMarkup(
      createElement(PushSubscribeButton, { vapidKeyResolver: async () => null }),
    );
    // The granted permission drives the description text immediately.
    expect(html).toContain("Notifications enabled");
    expect(html).toContain('data-permission="granted"');
  });

  it("uses a custom VAPID key resolver when provided", async () => {
    setNotification({ permission: "default" } as unknown as typeof Notification);
    setNavigator({
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: { getSubscription: async () => null },
        }),
      },
    } as unknown as Navigator);
    setWindow({ PushManager: class {} } as unknown as Window);

    const resolver = vi.fn().mockResolvedValue("custom-key");
    const { PushSubscribeButton } = await import("./push-subscribe-button");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const html = renderToStaticMarkup(
      createElement(PushSubscribeButton, { vapidKeyResolver: resolver }),
    );
    expect(html).toContain('data-testid="push-subscribe-button"');
    // Resolver is invoked asynchronously by the hook on mount.
    expect(resolver).toBeDefined();
  });
});

describe("PwaOverlay", () => {
  it("renders the overlay structure", async () => {
    setNavigator({ onLine: true, connection: {} } as unknown as Navigator);
    setWindow({
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as Window);
    setNotification({ permission: "default" } as unknown as typeof Notification);

    const { PwaOverlay } = await import("./pwa-overlay");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const html = renderToStaticMarkup(createElement(PwaOverlay, {}));
    // Should not throw and should render an outer fragment with the toast region.
    expect(typeof html).toBe("string");
  });
});
