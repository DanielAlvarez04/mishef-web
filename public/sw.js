/**
 * Service Worker de Naranja Pimienta (plan.md §7).
 *
 * Reglas de seguridad:
 * - Solo se cachean recursos estáticos propios (chunks con hash, CSS e iconos).
 * - La navegación va siempre a la red; la única excepción es /pos, que se
 *   conserva para reabrir el POS sin conexión y se borra al cambiar de sesión.
 * - Nada de credenciales, cookies ni datos personales entran en la caché
 *   estática; la copia del POS se elimina al iniciar o cerrar sesión.
 */
const CACHE = "np-static-v1";
const POS_CACHE = "np-pos-v1";
const POS_PATH = "/pos";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Si un recurso falla no se rompe la instalación del SW.
      .then((cache) =>
        Promise.all(
          PRECACHE.map((url) =>
            cache.add(new Request(url, { cache: "reload" })).catch(() => null)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE && key !== POS_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === "CACHE_POS") {
    event.waitUntil(
      fetch(POS_PATH, { credentials: "same-origin" })
        .then(async (response) => {
          // Un redirect a /login no es una copia válida del POS.
          if (!response.ok || response.redirected) return;
          const cache = await caches.open(POS_CACHE);
          await cache.put(POS_PATH, response);
        })
        .catch(() => undefined)
    );
  }
});

/** Cache-first para assets con hash (inmutables). */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

/** Sirve lo cacheado y refresca en segundo plano. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached ?? (await network) ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: red primero, sin cachear HTML autenticado.
  // Excepción: /pos se conserva para poder reabrir el punto de venta sin red.
  // Es HTML autenticado y se borra al iniciar/cerrar sesión (`clearPosCache`).
  if (request.mode === "navigate") {
    const isPos = url.pathname === POS_PATH || url.pathname === `${POS_PATH}/`;

    if (isPos) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(
                caches
                  .open(POS_CACHE)
                  .then((cache) => cache.put(POS_PATH, copy))
                  .catch(() => undefined)
              );
            }
            return response;
          })
          .catch(async () => {
            const cached = await caches.match(POS_PATH, {
              cacheName: POS_CACHE,
            });
            if (cached) return cached;

            const offline = await caches.match(OFFLINE_URL);
            return (
              offline ??
              new Response("Sin conexión", {
                status: 503,
                headers: { "content-type": "text/plain; charset=utf-8" },
              })
            );
          })
      );
      return;
    }

    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        const offline = await cache.match(OFFLINE_URL);
        return (
          offline ??
          new Response("Sin conexión", {
            status: 503,
            headers: { "content-type": "text/plain; charset=utf-8" },
          })
        );
      })
    );
    return;
  }

  // Chunks de Next.js: el nombre incluye el hash del contenido.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Iconos de la app.
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // El resto (RSC, API, datos) va directo a la red.
});
