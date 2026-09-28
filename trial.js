// ============================================================================
// JAM POS PRUEBA 7 DIAS - Candado fuerte de 7 dias (discreto + aviso de respaldo).
//
// - El conteo arranca desde el primer arranque del aplicativo.
// - Canal nativo AndroidBridge.verificarUltimate() es la fuente de verdad:
//   UltimateTrial.kt escribe marcas en SharedPreferences + /sdcard/JAM POS/ +
//   MediaStore (Descargas y Fotos), ancladas al ANDROID_ID y con anti-retroceso
//   de reloj -> DESINSTALAR Y REINSTALAR NO RESETEA EL CONTEO.
// - Canales web de respaldo (localStorage + IndexedDB + CacheStorage): la marca
//   MAS ANTIGUA gana.
// - Aviso de respaldo: cuando quedan <= 2 dias (5to/6to/7mo) muestra en cada
//   apertura un aviso con boton "Guardar mis datos ahora" (exporta a
//   /sdcard/JAM POS/ para poder restaurarlos en la version completa).
// - Al cumplirse los 7 dias -> bloqueo total (pantalla de bloqueo).
// - API publica identica a la version anterior:
//   window.JAMUltimateTrial = { DIAS, iniciar, verificar, estado, bloquearInmediato }
//   y window.__jamt_estado.
// ============================================================================
(function () {
    // Master switch del candado de prueba. En "false" el arranque es normal
    // (sin candado): el sistema vuelve a operar libre y version completa.
    // El codigo del candado (detectores + canales storage/IDB/Cache + botones
    // de respaldo + pantalla de bloqueo) queda INTACTO abajo, listo para
    // reactivarse en un futuro si se decide limitar la prueba otra vez.
    var CANDADO_ACTIVO = false;

    var DIAS = 7;
    var AVISO_DIAS = 2;              // aviso de respaldo en la ventana final
    var MS_DIA = 86400000;
    var TOLERANCIA = 5 * 60000;      // 5 min de tolerancia de reloj
    var KEY = 'jamt_ultimate';
    var KEY_UID = 'jamt_ultimate_uid';
    var IDB_NAME = 'jam_ultimate';
    var IDB_STORE = 'kv';
    var CACHE_NAME = 'jamt-ult-v1';

    function ahora() { return Date.now(); }

    function codificar(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
    function decodificar(s) {
        try {
            var o = JSON.parse(decodeURIComponent(escape(atob(s))));
            if (!o || typeof o.f !== 'number') return null;
            return o;
        } catch (e) { return null; }
    }

    function uid() {
        try {
            var u = localStorage.getItem(KEY_UID);
            if (!u) {
                u = 'u' + Math.random().toString(36).slice(2) + '_' + ahora().toString(36);
                localStorage.setItem(KEY_UID, u);
            }
            return u;
        } catch (e) { return ''; }
    }

    // ---------------- Canal nativo (APK) ----------------
    function estadoNativo() {
        try {
            if (window.AndroidBridge && typeof AndroidBridge.verificarUltimate === 'function') {
                var n = JSON.parse(AndroidBridge.verificarUltimate());
                if (n && typeof n.fechaInicio === 'number' && n.fechaInicio > 0) return n;
            }
        } catch (e) {}
        return null;
    }

    // ---------------- Canales web ----------------
    function leerLocal() { try { var r = localStorage.getItem(KEY); return r ? decodificar(r) : null; } catch (e) { return null; } }
    function escribirLocal(m) { try { localStorage.setItem(KEY, codificar(m)); } catch (e) {} }

    function abrirIDB() {
        return new Promise(function (res) {
            try {
                var req = indexedDB.open(IDB_NAME, 1);
                req.onupgradeneeded = function (e) { try { e.target.result.createObjectStore(IDB_STORE); } catch (x) {} };
                req.onsuccess = function () { res(req.result); };
                req.onerror = function () { res(null); };
            } catch (e) { res(null); }
        });
    }
    function leerIDB() {
        return new Promise(function (res) {
            abrirIDB().then(function (db) {
                if (!db) return res(null);
                try {
                    var t = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(KEY);
                    t.onsuccess = function () { try { res(t.result ? decodificar(t.result) : null); } catch (e) { res(null); } };
                    t.onerror = function () { res(null); };
                } catch (e) { res(null); }
            });
        });
    }
    function escribirIDB(m) {
        return new Promise(function (res) {
            abrirIDB().then(function (db) {
                if (!db) return res();
                try { db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(codificar(m), KEY); } catch (e) {}
                res();
            });
        });
    }

    function abrirCache() { try { return Promise.resolve(caches.open(CACHE_NAME)); } catch (e) { return Promise.resolve(null); } }
    function leerCache() {
        return abrirCache().then(function (c) {
            if (!c) return null;
            return c.match('jam-marca').then(function (r) {
                if (!r) return null;
                return r.text().then(function (t) { return decodificar(t); }).catch(function () { return null; });
            }).catch(function () { return null; });
        });
    }
    function escribirCache(m) {
        return abrirCache().then(function (c) {
            if (!c) return;
            return c.put('jam-marca', new Response(JSON.stringify(m))).catch(function () {});
        });
    }

    // ---------------- Calculo del estado ----------------
    function calcular(lista) {
        var ahoraReal = ahora();
        var fondo = ahoraReal;
        var ultima = 0;
        if (lista.length) {
            fondo = lista.reduce(function (a, b) { return Math.min(a, b.f); }, fondo);
            ultima = lista.reduce(function (a, b) { return Math.max(a, b.l || 0); }, 0);
        }
        // ancla monotona contra retroceso de reloj
        var ahoraE = Math.max(ahoraReal, ultima);
        var dias = Math.floor((ahoraE - fondo) / MS_DIA);
        var tamper = false;
        for (var i = 0; i < lista.length; i++) {
            if (lista[i].f > ahoraReal + TOLERANCIA || (lista[i].l && lista[i].l > ahoraReal + TOLERANCIA)) tamper = true;
        }
        // Si la marca NATIVA dicta bloqueo, la respetamos siempre (dias >= DIAS o tamper)
        var bloqueada = dias >= DIAS || tamper;
        var diaActual = bloqueada ? DIAS : Math.min(DIAS, dias + 1);
        var restantes = bloqueada ? 0 : Math.max(0, DIAS - dias);
        return {
            bloqueada: bloqueada,
            tamper: tamper,
            diaActual: diaActual,
            diasRestantes: restantes,
            fechaInicio: fondo,
            diasTotales: DIAS
        };
    }

    function estadoActual() { return window.__jamt_estado || null; }

    // ---------------- Verificacion principal ----------------
    function verificar() {
        return new Promise(function (resolver) {
            var lista = [];
            var nativo = estadoNativo();

            function terminar() {
                // El canal nativo (APK) es la fuente de verdad
                if (nativo) {
                    var blobqueo = nativo.bloqueada === true;
                    var nDia = nativo.diaActual || Math.min(DIAS, Math.floor((ahora() - nativo.fechaInicio) / MS_DIA) + 1);
                    var nRest = nativo.diasRestantes !== undefined ? nativo.diasRestantes
                        : Math.max(0, DIAS - Math.floor((ahora() - nativo.fechaInicio) / MS_DIA));
                    var estNativo = {
                        bloqueada: blobqueo || nativo.tamper === true,
                        tamper: nativo.tamper === true,
                        diaActual: nDia,
                        diasRestantes: nRest,
                        fechaInicio: nativo.fechaInicio,
                        diasTotales: DIAS
                    };
                    window.__jamt_estado = estNativo;

                    var marcaNativa = { v: 1, f: nativo.fechaInicio, l: ahora(), u: 'native' };
                    escribirLocal(marcaNativa);
                    escribirIDB(marcaNativa);
                    escribirCache(marcaNativa);
                    return resolver(estNativo);
                }

                if (lista.length === 0) {
                    // primera ejecucion (contexto web): crear fecha de inicio
                    var m = { v: 1, f: ahora(), l: ahora(), u: uid() };
                    escribirLocal(m);
                    escribirIDB(m);
                    escribirCache(m);
                    window.__jamt_estado = calcular([m]);
                    return resolver(window.__jamt_estado);
                }
                var est = calcular(lista);
                var nuevo = { v: 1, f: est.fechaInicio, l: ahora(), u: uid() };
                escribirLocal(nuevo);
                escribirIDB(nuevo);
                escribirCache(nuevo);
                window.__jamt_estado = est;
                resolver(est);
            }

            var m = leerLocal(); if (m) lista.push(m);
            leerIDB().then(function (i) { if (i) lista.push(i); terminar(); });
            leerCache().then(function (c) { if (c) lista.push(c); terminar(); });
        });
    }

    // ---------------- UI ----------------
    function crearEstilos() {
        var estilo = document.createElement('style');
        estilo.textContent =
            '.jamult-toast{position:fixed;right:12px;bottom:12px;left:12px;max-width:320px;margin:0 auto;z-index:999990;' +
            'background:rgba(17,17,20,.88);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:10px 12px;' +
            'font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#f5f5f7;box-shadow:0 8px 28px rgba(0,0,0,.35);' +
            'animation:jamultIn .35s ease;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
            'display:flex;align-items:center;gap:10px;user-select:none}' +
            '.jamult-toast.jamult-out{animation:jamultOut .4s ease forwards}' +
            '.jamult-icon{font-size:16px;filter:drop-shadow(0 0 6px rgba(255,255,255,.25))}' +
            '.jamult-cuerpo{flex:1;min-width:0}' +
            '.jamult-titulo{font-size:12px;font-weight:600;letter-spacing:.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '.jamult-barra{height:3px;border-radius:3px;background:rgba(255,255,255,.15);margin-top:6px;overflow:hidden}' +
            '.jamult-barra-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#ef4444,#f97316);transition:width .6s ease}' +
            '.jamult-pct{font-size:10px;opacity:.65;margin-top:3px;letter-spacing:.3px}' +
            '.jamult-cerrar{background:transparent;border:0;color:rgba(255,255,255,.55);font-size:15px;line-height:1;padding:4px 6px;cursor:pointer;border-radius:8px}' +
            '.jamult-cerrar:hover{color:#fff;background:rgba(255,255,255,.1)}' +
            '@keyframes jamultIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
            '@keyframes jamultOut{to{opacity:0;transform:translateY(12px)}}' +
            '.jamult-aviso{position:fixed;inset:0;z-index:999995;background:rgba(8,8,18,.92);backdrop-filter:blur(8px);' +
            'display:flex;align-items:center;justify-content:center;overflow:auto}' +
            '.jamult-aviso-caja{max-width:360px;margin:24px;text-align:center;background:#14141f;color:#f5f5f7;' +
            'border-radius:24px;padding:26px 22px;border:1px solid #2c2c3a;box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
            '.jamult-aviso-icono{font-size:46px;margin-bottom:10px}' +
            '.jamult-aviso h2{font-size:19px;margin:0 0 8px;font-weight:800;color:#fbbf24}' +
            '.jamult-aviso p{font-size:13.5px;line-height:1.55;opacity:.9;margin:0 0 12px}' +
            '.jamult-aviso p b{color:#fca5a5}' +
            '.jamult-aviso-datos{font-size:12px;opacity:.7;margin:0 0 16px;padding:10px;background:rgba(255,255,255,.06);' +
            'border-radius:12px;line-height:1.5}' +
            '.jamult-aviso-btn{display:block;width:100%;margin-top:8px;padding:13px;border:none;border-radius:14px;' +
            'font-size:14.5px;font-weight:700;cursor:pointer}' +
            '.jamult-aviso-btn-primario{background:linear-gradient(90deg,#3b82f6,#22d3ee);color:#fff}' +
            '.jamult-aviso-btn-secundario{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.2)}' +
            '.jamult-aviso-btn:active{transform:scale(.97)}' +
            '.jamult-bloqueo{position:fixed;inset:0;z-index:999999;background:#0b0b0f;color:#f5f5f7;display:flex;align-items:center;justify-content:center;' +
            'font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;overflow:auto}' +
            '.jamult-bloqueo-caja{max-width:340px;margin:24px;text-align:center;padding:0}' +
            '.jamult-bloqueo-icono{font-size:52px;margin-bottom:14px;filter:drop-shadow(0 0 18px rgba(239,68,68,.45))}' +
            '.jamult-bloqueo h2{font-size:20px;margin:0 0 8px;font-weight:700}' +
            '.jamult-bloqueo p{font-size:14px;line-height:1.55;opacity:.85;margin:0 0 6px}' +
            '.jamult-bloqueo-marca{font-size:12px;opacity:.5;margin-top:16px}' +
            '.jamult-bloqueo-btn{margin-top:20px;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.2);' +
            'border-radius:12px;padding:11px 26px;font-size:14px;font-weight:600;cursor:pointer}' +
            '.jamult-bloqueo-btn:active{background:rgba(255,255,255,.15)}';
        document.head.appendChild(estilo);
    }

    function hacerBackup() {
        try {
            if (window._ejecutarBackupLocal && typeof window._ejecutarBackupLocal === 'function') {
                window._ejecutarBackupLocal();
            } else if (window.exportarBackupJSON && typeof window.exportarBackupJSON === 'function') {
                window.exportarBackupJSON();
            } else if (window.AndroidBridge && typeof AndroidBridge.cerrarApp === 'function') {
                // sin app.js cargado: los datos ya se auto-guardan en /JAM POS/
            }
        } catch (e) {}
    }

    function mostrarDiscreto(estado) {
        if (!estado || estado.bloqueada) return;
        try { if (sessionStorage.getItem('jamt_popup_shown')) return; } catch (e) {}
        try { sessionStorage.setItem('jamt_popup_shown', '1'); } catch (e) {}

        var textoDia = estado.diaActual === 1 ? '1' : String(estado.diaActual);
        var toast = document.createElement('div');
        toast.className = 'jamult-toast';
        var pct = Math.round((estado.diaActual / estado.diasTotales) * 100);
        toast.innerHTML =
            '<span class="jamult-icon">&#9200;</span>' +
            '<div class="jamult-cuerpo">' +
            '<div class="jamult-titulo">JAM POS &middot; Versi&oacute;n de prueba &mdash; d&iacute;a ' + textoDia + ' de ' + estado.diasTotales + '</div>' +
            '<div class="jamult-barra"><div class="jamult-barra-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="jamult-pct">' + (estado.diasRestantes === 1 ? '1 d&iacute;a restante' : (estado.diasRestantes) + ' d&iacute;as restantes') + '</div>' +
            '</div>' +
            '<button class="jamult-cerrar" aria-label="Cerrar">&times;</button>';
        document.body.appendChild(toast);

        function cerrar() {
            if (toast.parentNode) {
                toast.classList.add('jamult-out');
                setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 380);
            }
        }
        toast.querySelector('.jamult-cerrar').onclick = cerrar;
        setTimeout(cerrar, 5000);
    }

    // Aviso de respaldo previo al bloqueo (ventana final). Se muestra una vez por proceso.
    function mostrarAvisoRespaldo(estado) {
        if (!estado || estado.bloqueada) return;
        if (estado.diasRestantes > AVISO_DIAS) return;
        if (document.querySelector('.jamult-aviso') || document.querySelector('.jamult-bloqueo')) return;
        try { if (sessionStorage.getItem('jamt_aviso_shown')) return; } catch (e) {}
        try { sessionStorage.setItem('jamt_aviso_shown', '1'); } catch (e) {}

        var diasText = estado.diasRestantes === 1 ? '1 d&iacute;a' : estado.diasRestantes + ' d&iacute;as';
        var aviso = document.createElement('div');
        aviso.className = 'jamult-aviso';
        aviso.innerHTML =
            '<div class="jamult-aviso-caja">' +
            '<div class="jamult-aviso-icono">&#128274;</div>' +
            '<h2>Tu prueba casi termina</h2>' +
            '<p>Te quedan <b>' + diasText + '</b> de uso gratuito. Cuando termine, el aplicativo se bloquear&aacute;.' +
            ' Para no perder tus productos, clientes y ventas, guarda una copia de seguridad: podr&aacute;s restaurarla en la versi&oacute;n completa.</p>' +
            '<div class="jamult-aviso-datos">&#128190; Tus datos se guardan en <b>/JAM POS/</b> de este dispositivo y all&iacute; podr&aacute;s recuperarlos despu&eacute;s.</div>' +
            '<button class="jamult-aviso-btn jamult-aviso-btn-primario" id="jamultBackupBtn">&#128190; Guardar mis datos ahora</button>' +
            '<button class="jamult-aviso-btn jamult-aviso-btn-secundario" id="jamultAvisoCerrar">Continuar usando</button>' +
            '</div>';
        document.body.appendChild(aviso);
        aviso.querySelector('#jamultBackupBtn').onclick = function () { hacerBackup(); };
        aviso.querySelector('#jamultAvisoCerrar').onclick = function () { if (aviso.parentNode) aviso.parentNode.removeChild(aviso); };
    }

    function mostrarBloqueo() {
        if (document.querySelector('.jamult-bloqueo')) return;
        var fondo = document.createElement('div');
        fondo.className = 'jamult-bloqueo';
        fondo.innerHTML =
            '<div class="jamult-bloqueo-caja">' +
            '<div class="jamult-bloqueo-icono">&#128274;</div>' +
            '<h2>Periodo de prueba finalizado</h2>' +
            '<p>El periodo de prueba de <b>7 d&iacute;as</b> de JAM POS ha terminado.</p>' +
            '<p>Tus datos siguen guardados en <b>/JAM POS/</b> de este dispositivo; podr&aacute;s restaurarlos en la versi&oacute;n completa.</p>' +
            '<button class="jamult-bloqueo-btn" onclick="' +
            'if(window.AndroidBridge&&typeof AndroidBridge.cerrarApp===\'function\')AndroidBridge.cerrarApp();' +
            'else try{window.close()}catch(e){}' +
            '">Cerrar aplicaci&oacute;n</button>' +
            '<div class="jamult-bloqueo-marca">JAM POS &middot; Prueba 7 d&iacute;as &middot; v1.1</div>' +
            '</div>';
        document.body.appendChild(fondo);
    }

    // ---------------- Arranque ----------------
    function iniciar() {
        if (!CANDADO_ACTIVO) return;      // candado apagado -> arranque normal directo
        crearEstilos();
        verificar().then(function (estado) {
            if (estado && estado.bloqueada) { mostrarBloqueo(); return; }
            mostrarDiscreto(estado);
            mostrarAvisoRespaldo(estado);
        });
    }

    function bloquearInmediato() {
        if (!CANDADO_ACTIVO) return false;   // candado apagado -> el sistema Ultimate nunca bloquea
        var est = estadoActual();
        if (est && est.bloqueada) { mostrarBloqueo(); return true; }
        var n = estadoNativo();
        if (n && (n.bloqueada === true || n.tamper === true)) {
            window.__jamt_estado = { bloqueada: true, tamper: n.tamper === true, diaActual: DIAS, diasRestantes: 0, fechaInicio: n.fechaInicio, diasTotales: DIAS };
            mostrarBloqueo();
            return true;
        }
        return false;
    }

    window.JAMUltimateTrial = {
        DIAS: DIAS,
        iniciar: iniciar,
        verificar: verificar,
        estado: estadoActual,
        bloquearInmediato: bloquearInmediato
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();