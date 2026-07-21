import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
  setNavigator(originalNavigator);
  setWindow(originalWindow);
  setNotification(originalNotification);
  vi.restoreAllMocks();
});

describe("useNetworkStatus", () => {
  it("starts unknown before hydration and exposes effective type hook", async () => {
    setNavigator({
      onLine: true,
      connection: { effectiveType: "4g" },
    } as unknown as Navigator);
    setWindow({
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as Window);

    const { useNetworkStatus } = await import("./pwa-hooks");
    const result = useNetworkStatus();
    expect(result.status).toBe("unknown");
    expect(result.isOnline).toBe(true);
    // effectiveType and lastChangedAt are hydrated inside useEffect, which
    // is mocked as a no-op; assert the public shape only.
    expect(result.effectiveType).toBeNull();
    expect(result.lastChangedAt).toBeNull();
  });

  it("does not render offline during the pre-hydration state", async () => {
    setNavigator({
      onLine: false,
      connection: {},
    } as unknown as Navigator);
    setWindow({
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as Window);

    const { useNetworkStatus } = await import("./pwa-hooks");
    const result = useNetworkStatus();
    expect(result.status).toBe("unknown");
    expect(result.isOnline).toBe(true);
  });
});

describe("usePwaInstall", () => {
  it("starts in idle state without a beforeinstallprompt", async () => {
    setWindow({
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as Window);

    const { usePwaInstall } = await import("./pwa-hooks");
    const result = usePwaInstall();
    expect(result.state).toBe("idle");
  });

  it("install() returns null when no prompt was captured", async () => {
    setWindow({
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as Window);

    const { usePwaInstall } = await import("./pwa-hooks");
    const result = usePwaInstall();
    const outcome = await result.install();
    expect(outcome).toBeNull();
    expect(result.reset).toBeDefined();
  });
});

describe("useServiceWorkerUpdate", () => {
  it("stays idle when service workers are unsupported", async () => {
    setNavigator({ onLine: true } as unknown as Navigator);
    setWindow({
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as Window);
    setNotification(undefined);

    const { useServiceWorkerUpdate } = await import("./pwa-hooks");
    const result = useServiceWorkerUpdate();
    expect(result.state).toBe("idle");
  });

  it("check() resolves gracefully when there is no registration", async () => {
    const sw = {
      getRegistration: vi.fn().mockResolvedValue(undefined),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    setNavigator({
      serviceWorker: sw,
      onLine: true,
    } as unknown as Navigator);
    setWindow({
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as Window);

    const { useServiceWorkerUpdate } = await import("./pwa-hooks");
    const result = useServiceWorkerUpdate();
    await result.check();
    expect(sw.getRegistration).toHaveBeenCalled();
    expect(result.state).toBe("idle");
  });
});

describe("usePushSubscription", () => {
  beforeEach(() => {
    setNotification({ permission: "default" } as unknown as typeof Notification);
  });

  it("reports unsupported when Notification is missing", async () => {
    setNotification(undefined);
    setNavigator({
      serviceWorker: {
        ready: Promise.resolve({ pushManager: {} }),
      },
    } as unknown as Navigator);
    setWindow({} as unknown as Window);

    const { usePushSubscription } = await import("./pwa-hooks");
    const result = usePushSubscription();
    expect(result.support.supported).toBe(false);
    expect(result.support.permission).toBe("unsupported");
  });

  it("exposes support and a subscribe function", async () => {
    setWindow({ PushManager: class {} } as unknown as Window);
    setNotification({ permission: "default" } as unknown as typeof Notification);
    setNavigator({
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: { getSubscription: async () => null },
        }),
      },
    } as unknown as Navigator);

    const { usePushSubscription } = await import("./pwa-hooks");
    const result = usePushSubscription();
    expect(typeof result.subscribe).toBe("function");
    expect(typeof result.unsubscribe).toBe("function");
    expect(typeof result.refresh).toBe("function");
  });
});
