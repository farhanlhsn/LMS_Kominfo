const CACHE = "lms-v1";
const STATIC_ASSETS = [
  "/",
  "/my-learning",
  "/courses",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

function isCacheableRequest(request, url) {
  // Filter out non-network requests (chrome-extension, moz-extension, data, blob, file, etc.)
  const isHttpRequest = url.protocol === "http:" || url.protocol === "https:";
  return isHttpRequest && request.method === "GET" && url.protocol !== "chrome-extension:" && url.protocol !== "moz-extension:";
}

function cacheResponse(request, response) {
  if (!response.ok) {
    return response;
  }

  const clone = response.clone();
  caches.open(CACHE).then((cache) => cache.put(request, clone));
  return response;
}

function offlineApiResponse() {
  return new Response(JSON.stringify({ error: "offline" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!isCacheableRequest(request, url)) {
    return;
  }

  // API requests: network-only
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).catch(() => offlineApiResponse()));
    return;
  }

  // Static assets: cache-first
  if (request.destination === "style" || request.destination === "script" || request.destination === "font" || request.destination === "image") {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((response) => cacheResponse(request, response))
      )
    );
    return;
  }

  // Navigation: network-first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => cacheResponse(request, response))
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      data: { url: data.url || "/" },
    };
    event.waitUntil(
      self.registration.showNotification(data.title || "LMS Platform", options)
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification("LMS Platform", { body: event.data.text() })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.includes(url));
      if (existing) { existing.focus(); return; }
      clients.openWindow(url);
    })
  );
});
