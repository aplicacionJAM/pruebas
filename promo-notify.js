(function () {
  "use strict";

  // ==================== SISTEMA DE PROMOCIONES (carpeta Promocion) ====================
  // Cola numerada (1.txt, 2.jpg, 3.png ...) que publica una notificacion cada 30 min.
  // .txt  -> el contenido del archivo es el texto del cuadro de la notificacion.
  // imagen-> la imagen se muestra como notificacion (PNG/JPG/GIF/WEBP con transparencia).
  // Carpeta vacia o irremisiblemente ausente -> silencio total (no invasivo).
  // Activo en TODAS las plataformas: web/PWA (github.io), APK, EXE y DEB.

  if (window.jamPromoNotificado) return;
  window.jamPromoNotificado = true;

  var INTERVALO = 30 * 60 * 1000;          // cada 30 minutos
  var PRIMERA = 15 * 1000;                 // primer disparo rapido al abrir
  var CLAVE = "jampos_promocion_cola";     // localStorage (indice de la cola)
  var EN_GITHUB_IO = (location.hostname || "").indexOf(".github.io") !== -1;
  // BASE LOCAL en github.io/web; BASE REMOTA (CDN GitHub Pages) en nativas.
  var BASE = EN_GITHUB_IO ? "./Promocion/" : "https://aplicacionjam.github.io/Promocion/";

  function esPlataforma(plataforma) {
    if (window.plataformaApp) return window.plataformaApp === plataforma;
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf("wv") !== -1 || ua.indexOf("android") !== -1) return plataforma === "apk";
    if (ua.indexOf("electron") !== -1 || ua.indexOf("jam pos") !== -1) return plataforma === "exe";
    if (ua.indexOf("linux") !== -1) return plataforma === "deb";
    return plataforma === "web";
  }

  function detectarPlataforma() {
    if (window.plataformaApp) return window.plataformaApp;
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf("wv") !== -1 || ua.indexOf("android") !== -1) return "apk";
    if (ua.indexOf("electron") !== -1 || ua.indexOf("jam pos") !== -1) return "exe";
    if (ua.indexOf("linux") !== -1) return "deb";
    return "web";
  }

  var EXTENSIONS = { "txt": 1, "png": 1, "jpg": 1, "jpeg": 1, "gif": 1, "webp": 1 };

  // Lista de archivos de la carpeta Promocion. En github.io (web) se obtiene la
  // carpeta real con la API de GitHub; si falla (local, offline, otro host) cae
  // al manifest estatico indice.json (que en nativas se consulta REMOTO).
  function leerLista() {
    if (EN_GITHUB_IO) {
      var repo = (location.hostname || "").replace(".github.io", "");
      return fetch("https://api.github.com/repos/" + repo + "/" + repo + ".github.io/contents/Promocion")
        .then(function (r) {
          if (!r.ok) throw new Error("api");
          return r.json();
        })
        .then(function (arr) {
          if (!Array.isArray(arr)) throw new Error("no-array");
          return arr.map(function (x) { return x.name; });
        })
        .catch(function () {
          return leerIndice();
        });
    }
    return leerIndice();
  }

  // En nativas SIEMPRE se consulta el indice.json remoto de la CDN (o el local
  // en web). El fetch a la CDN GitHub Pages responde con CORS abierto (*).
  function leerIndice() {
    return fetch(BASE + "indice.json", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("indice");
      return r.json();
    }).then(function (nombres) {
      return Array.isArray(nombres) ? nombres : [];
    });
  }

  function numeroPrefijo(nombre) {
    var m = nombre.match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : Infinity;
  }

  function normalizar(lista) {
    return lista.filter(function (n) {
      var ext = (n.split(".").pop() || "").toLowerCase();
      return EXTENSIONS[ext] === 1;
    }).sort(function (a, b) {
      return numeroPrefijo(a) - numeroPrefijo(b) || (a < b ? -1 : a > b ? 1 : 0);
    });
  }

  function estado() {
    try {
      var raw = localStorage.getItem(CLAVE);
      var obj = raw ? JSON.parse(raw) : {};
      return { nombre: obj.nombre || "", repeticiones: obj.repeticiones || 0 };
    } catch (e) { return { nombre: "", repeticiones: 0 }; }
  }

  function guardarEstado(e) {
    try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {}
  }

  function notificar(titulo, cuerpo, tag, image) {
    if (window.mostrarNotificacionNativa) {
      window.mostrarNotificacionNativa(titulo, cuerpo, tag || "jampos-promo", image ? { image: image } : undefined);
    }
    if (typeof window.reproducirSonidoAlerta === 'function' && window.__promoPermiteSonido !== false) {
      try { window.reproducirSonidoAlerta(); } catch (e) {}
    }
  }

  // ==================== CAPA QF: CONTROL REMOTO + INDICE + RECONOCIMIENTO ====================
  // control.json (opcional, remoto via BASE) permite:
  //   { "habilitado":false }                 -> SILENCIO TOTAL (promo apagada en remoto).
  //   { "mensaje":"texto..." }               -> notificacion con ese texto exacto.
  //   { "indice":["1.png",...] }             -> la cola la define el servidor (no la carpeta).
  //   { "intervalo_min":30 }                 -> reprograma el intervalo.
  // Sin control.json (o con error de red) la app funciona EXACTAMENTE como antes.
  var CONTROL_REMOTO = null;                 // ultimo control.json leido (o null si no existe)
  var CLAVE_VISTOS = "jampos_promo_vistos";  // reconocimiento de archivos ya vistos
  var manejadorIntervalo = null;             // para reprogramar intervalo desde control.json

  function leerControl() {
    return fetch(BASE + "control.json", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("sin-control");
      return r.json();
    }).catch(function () { return null; });
  }

  function aplicarControlRemoto(ctrl) {
    if (!ctrl) return;
    if (ctrl.intervalo_min && ctrl.intervalo_min > 0) {
      var nuevoMs = ctrl.intervalo_min * 60 * 1000;
      if (nuevoMs !== INTERVALO && manejadorIntervalo) {
        INTERVALO = nuevoMs;
        clearInterval(manejadorIntervalo);
        manejadorIntervalo = setInterval(tick, INTERVALO);
      }
    }
  }

  function fueVisto(nombre) {
    try {
      var raw = localStorage.getItem(CLAVE_VISTOS);
      var o = raw ? JSON.parse(raw) : {};
      return !!o[nombre];
    } catch (e) { return false; }
  }

  function marcarVisto(nombre) {
    try {
      var raw = localStorage.getItem(CLAVE_VISTOS);
      var o = raw ? JSON.parse(raw) : {};
      o[nombre] = 1;
      localStorage.setItem(CLAVE_VISTOS, JSON.stringify(o));
    } catch (e) {}
  }

  function aplicarAviso(lista) {
    var idx = 0;
    var e = estado();
    if (e.nombre) {
      var encontrado = -1;
      for (var i = 0; i < lista.length; i++) if (lista[i] === e.nombre) { encontrado = i; break; }
      idx = encontrado === -1 ? 0 : (encontrado + 1) % lista.length;
    }
    return lista[idx];
  }

  function publicar(lista) {
    if (lista.length === 0) {
      guardarEstado({ nombre: "", repeticiones: 0 });
      return;
    }
    var e = estado();
    var idx = 0;
    if (e.nombre) {
      var encontrado = -1;
      for (var i = 0; i < lista.length; i++) if (lista[i] === e.nombre) { encontrado = i; break; }
      idx = encontrado === -1 ? 0 : (encontrado + 1) % lista.length;
    }
    var actual = lista[idx];
    var esNuevo = !fueVisto(actual);
    marcarVisto(actual);
    var esTxt = (actual.split(".").pop() || "").toLowerCase() === "txt";
    var tag = "jampos-promo-" + actual;
    if (esTxt) {
      fetch(BASE + actual, { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : null; }).then(function (texto) {
        if (texto === null) return;
        var cuerpo = texto.trim();
        notificar("📢 Promoción", cuerpo, tag);
      }).catch(function () {});
    } else {
      notificar("📢 Promoción", actual, tag, BASE + actual);
    }
    guardarEstado({ nombre: actual, repeticiones: e.repeticiones + 1 });
  }

  function tick() {
    leerControl().then(function (ctrl) {
      CONTROL_REMOTO = ctrl;
      aplicarControlRemoto(ctrl);
      if (ctrl === null) {
        // Sin control.json -> comportamiento clasico (sin ningun cambio).
        return leerLista().then(normalizar).then(publicar).catch(function () {
          guardarEstado({ nombre: "", repeticiones: 0 });
        });
      }
      if (ctrl.habilitado === false) {
        // Apagado remoto -> silencio total (no invasivo).
        guardarEstado({ nombre: "", repeticiones: 0 });
        return;
      }
      if (ctrl.mensaje && ctrl.mensaje.trim()) {
        // Mensaje remoto directo: texto exacto publicado como promocion.
        notificar("📢 Promoción", ctrl.mensaje.trim(), "jampos-promo-control");
        guardarEstado({ nombre: "@control", repeticiones: 0 });
        return;
      }
      if (Array.isArray(ctrl.indice) && ctrl.indice.length > 0) {
        // Cola definida por el servidor (indice remoto autoritativo) + reconocimiento.
        var soloValidas = ctrl.indice.filter(function (n) {
          var ext = (n.split(".").pop() || "").toLowerCase();
          return EXTENSIONES[ext] === 1;
        });
        if (soloValidas.length === 0) {
          guardarEstado({ nombre: "", repeticiones: 0 });
          return;
        }
        return publicar(soloValidas);
      }
      return leerLista().then(normalizar).then(publicar).catch(function () {
        guardarEstado({ nombre: "", repeticiones: 0 });
      });
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) tick();
  });

  setTimeout(tick, PRIMERA);
  manejadorIntervalo = setInterval(tick, INTERVALO);

})();