const CACHE_NAME = "jampos-web-cache-v12-a19-snd";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./logo.svg",
  "./icon.svg",
  "./icon-192.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512.svg",
  "./tailwind.js",
  "./html2canvas.min.js",
  "./fontawesome.min.css",
  "./fa-brands-400.woff2",
  "./fa-brands-400.ttf",
  "./fa-regular-400.woff2",
  "./fa-regular-400.ttf",
  "./fa-solid-900.woff2",
  "./fa-solid-900.ttf",
  "./fa-v4compatibility.woff2",
  "./fa-v4compatibility.ttf",
  "./style.css",
  "./quagga.min.js",
  "./web-bridge.js",
  "./trial.js",
  "./update-notify.js",
  "./promo-notify.js",
  "./update.json",
  "./app.js",
  "./notificacion/1.mp3",
  "./notificacion/2.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).catch(function() {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", function(event) {
  var data = event.data;
  if (data && data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (data && data.type === "showNotification") {
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: data.tag || "jampos",
      image: data.image || "",
      vibrate: [200, 100, 200],
      requireInteraction: true
    });
  }
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url && "focus" in clientList[i]) return clientList[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(self.registration.scope);
    })
  );
});

self.addEventListener("sync", function(event) {
  if (event.tag === "sync-data") {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener("fetch", (event) => {
  var req = event.request;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(function() {
        return caches.match("./index.html").then(function(cached) {
          return cached || caches.match("./offline.html");
        });
      })
    );
    return;
  }

  var url = new URL(req.url);

  if (url.origin !== location.origin) return;

  // update.json SIEMPRE va a red (nunca a cache) para que el aviso vea
  // versiones nuevas aunque el resto de la app funcione offline.
  if (url.pathname.indexOf("/update.json") !== -1) {
    event.respondWith(fetch(req).catch(function() { return caches.match("./update.json"); }));
    return;
  }

  // La carpeta Promocion SIEMPRE va a red (nunca a cache) para que las
  // promociones del servidor se lean siempre actualizadas.
  if (url.pathname.indexOf("/Promocion/") !== -1) {
    event.respondWith(fetch(req).catch(function() { return caches.match(req).then(function(c) { return c || Response.error(); }); }));
    return;
  }

  event.respondWith(
    caches.match(req).then(function(cached) {
      var fetchPromise = fetch(req).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, clone);
          });
        }
        return response;
      }).catch(function() {
        return cached || caches.match("./offline.html");
      });
      return cached || fetchPromise;
    })
  );
});
