// =========== AVISO DE NUEVAS VERSIONES (WEB/PWA/APK/EXE/DEB) ===========
// Mecanismo SIMPLE por PRESENCIA DE ARCHIVO (sin editar versiones a mano):
//   - La app lista la carpeta de su plataforma en el servidor:
//       web/PWA -> carpeta RAIZ (lista completa);  apk -> 'apk';  exe -> 'exe';  deb -> 'deb'
//   - Si en esa carpeta hay un archivo INSTALABLE (.apk/.exe/.deb) -> hay parche
//     publicado: popup con opcion de descargar e instalar.
//   - Opcionalmente un archivo .txt en la carpeta define el titulo y las notas:
//       - el NOMBRE del .txt (sin .txt)  -> titulo/encabezado del parche.
//       - el CONTENIDO del .txt          -> lista de mejoras/notas del parche.
//   - Carpeta de la plataforma VACIA (sin instalable y sin .txt) -> SILENCIO total:
//     la app arranca normal, sin popup ni notificaciones.
//   - Solo hay un .txt (sin instalable) -> notificacion informativa (sin descarga).
//   - Regla de marcador: se recuerda que la version de ESTE archivo ya se instalo
//     (por nombre + tamano); no vuelve a avisar mientras siga publicado el mismo
//     archivo. Si se publica otro (otro nombre o el mismo nombre con contenido
//     distinto) -> avisa de nuevo.
//   - Funciona offline / sin servidor del libro: cualquier fallo de red o 404 se
//     ignora en silencio. No interfiere con el candado ni con la UI.
(function () {
    if (window.jamUpdaterLoaded) return;
    window.jamUpdaterLoaded = true;

    // Version INTERNA fija de esta app (no cambia hasta que madure). Compatible siempre.
    var APP_VERSION = '1.1';
    // Nombre del archivo instalable CON EL QUE SE ENTREGO esta build. Sirve de
    // referencia: mientras la carpeta tenga exactamente ese archivo, es la misma
    // version ya instalada (silencio). Un archivo distinto = un parche pendiente.
    var APP_ARCHIVO = {
        web: '',
        apk: 'JAMPOS-1.1-estable-final.apk',
        exe: 'JAM POS 1.1 estable final.exe',
        deb: 'JAM POS 1.1 estable final (Linux).deb'
    };
    var EXTENSION_INSTALABLE = { web: '', apk: '.apk', exe: '.exe', deb: '.deb' };

    var BASE_URL = 'https://aplicacionjam.github.io/'; // raiz publicada (GitHub Pages)
    var PLATAFORMA = detectarPlataforma();             // 'web' | 'apk' | 'exe' | 'deb'
    var CARPETA = PLATAFORMA === 'web' ? '' : PLATAFORMA + '/';
    var UPDATE_URL = 'update.json';                    // respaldo (solo si no se puede listar)
    var CHECK_INICIAL_MS = 4000;                       // espera tras cargar la app
    var CHECK_INTERVALO_MS = 6 * 60 * 60 * 1000;       // cada 6 horas
    var ultimoManifest = null;                         // contenido del update.json mas reciente (remoto/nativo)

    // Deteccion automatica de la plataforma. Prioridad:
    //   1) window.plataformaApp si el shell nativo lo inyecta (apk/exe/deb/web).
    //   2) Por userAgent: WebView Android -> apk; Electron Windows -> exe;
    //      Electron Linux -> deb; navegador/PWA -> web.
    function detectarPlataforma() {
        try {
            if (window.plataformaApp) return String(window.plataformaApp);
            var ua = (navigator.userAgent || '').toLowerCase();
            var nativa = !!(window.AndroidBridge ||
                (typeof window.process !== 'undefined' && window.process.versions && window.process.versions.electron));
            if (!nativa && ua.indexOf('electron') === -1) return 'web';
            if (ua.indexOf('android') !== -1) return 'apk';
            if (ua.indexOf('windows') !== -1) return 'exe';
            if (ua.indexOf('linux') !== -1) return 'deb';
            return 'web';
        } catch (e) { return 'web'; }
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    function appBloqueada() {
        try {
            if (window.__jamt_estado && window.__jamt_estado.bloqueada) return true;
            if (document.querySelector('.jamult-bloqueo')) return true;
            if (window._pruebaInfo && window._pruebaInfo.bloqueada) return true;
        } catch (e) {}
        return false;
    }

    var overlay = null;
    var __avisadoSesion = {}; // evita re-avisar el mismo archivo varias veces en UNA sesion

    // ===== MARCADOR LOCAL: version ya descargada/instalada en ESTE equipo =====
    // Guarda "nombre:size" del archivo instalable que este equipo ya acepto/instalo.
    // Mientras siga publicado ese mismo archivo (mismo nombre y tamano) no se avisa.
    var CLAVE_INSTALADA = 'jampos_ultima_instalada';

    function leerInstalada() {
        try {
            var v = localStorage.getItem(CLAVE_INSTALADA);
            if (v) return String(v);
        } catch (e) {}
        return '';
    }
    function guardarInstalada(v) {
        try { localStorage.setItem(CLAVE_INSTALADA, String(v)); } catch (e) {}
    }
    // Marcador moderno = "nombre:size". Marcadores de versiones anteriores son
    // numeros (ej. '1.1a'): se tratan como "no registrado con la regla nueva".
    function esFirmaModerna(m) {
        return /^.+:\d+$/i.test(String(m || ''));
    }
    function firmaDe(item) {
        return item ? String(item.name) + ':' + (item.size || 0) : '';
    }

    function cerrarPopup() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
    }

    function toast(mensaje) {
        try { if (window.mostrarNotificacion) { window.mostrarNotificacion(mensaje, 'info'); return; } } catch (e) {}
        try {
            var el = document.createElement('div');
            el.style.cssText = 'position:fixed;right:12px;bottom:12px;left:12px;max-width:320px;margin:0 auto;z-index:999991;background:rgba(17,17,20,.92);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 12px;font-family:sans-serif;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.35)';
            el.textContent = mensaje;
            document.body.appendChild(el);
            setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4000);
        } catch (e) {}
    }

    function crearEstilos() {
        if (document.getElementById('jamupd-estilos')) return;
        var s = document.createElement('style');
        s.id = 'jamupd-estilos';
        s.textContent =
            '.jamupd-fondo{position:fixed;inset:0;z-index:999992;background:rgba(8,8,12,.66);display:flex;align-items:center;justify-content:center;padding:18px;' +
            'font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}' +
            '.jamupd-caja{max-width:360px;width:100%;max-height:88vh;overflow:auto;background:#141419;color:#f5f5f7;border:1px solid rgba(255,255,255,.14);' +
            'border-radius:18px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.5);animation:jamupdIn .3s ease}' +
            '@keyframes jamupdIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}' +
            '.jamupd-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(59,130,246,.16);color:#60a5fa;border:1px solid rgba(59,130,246,.4);' +
            'font-size:11px;font-weight:700;letter-spacing:.5px;padding:5px 10px;border-radius:999px;margin-bottom:12px;text-transform:uppercase}' +
            '.jamupd-caja h2{margin:0 0 6px;font-size:19px;line-height:1.3;font-weight:800;letter-spacing:.2px}' +
            '.jamupd-sub{font-size:12px;opacity:.6;margin:0 0 14px}' +
            '.jamupd-notas{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:8px}' +
            '.jamupd-notas li{display:flex;gap:9px;font-size:13px;line-height:1.5;align-items:flex-start}' +
            '.jamupd-notas li b{color:#34d399;flex:0 0 auto}' +
            '.jamupd-aviso{background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);color:#fbbf24;border-radius:12px;padding:10px 12px;' +
            'font-size:12px;line-height:1.55;margin:0 0 8px}' +
            '.jamupd-btn{width:100%;border:0;border-radius:14px;padding:14px;font-size:14px;font-weight:800;cursor:pointer;margin-top:8px;letter-spacing:.2px}' +
            '.jamupd-btn-actualizar{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff}' +
            '.jamupd-btn-actualizar:active{opacity:.85}' +
            '.jamupd-btn-quedarme{background:rgba(255,255,255,.07);color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.14)}' +
            '.jamupd-btn-quedarme:active{background:rgba(255,255,255,.14)}' +
            '@media(prefers-color-scheme:light){.jamupd-fondo{background:rgba(240,242,245,.72)}.jamupd-caja{background:#ffffff;color:#18181b;border-color:rgba(0,0,0,.12)}' +
            '.jamupd-btn-quedarme{background:rgba(0,0,0,.05);color:#374151;border-color:rgba(0,0,0,.14)}}.jamupd-notas li span{min-width:0}';
        document.head.appendChild(s);
    }

    // Lista los archivos de la carpeta de la plataforma como {name, size}.
    // En github.io se obtiene la carpeta REAL con la API de GitHub; si falla
    // (local, offline, otro host) cae al update.json de respaldo.
    // En NATIVAS (apk/exe/deb) la carpeta local no existe ni importa: se
    // consulta SIEMPRE el update.json REMOTO de su plataforma (publicado en el
    // repo), que declara el campo 'archivo' (y opcionalmente 'descarga').
    function listarCarpeta() {
        var hs = location.hostname || '';
        var enGithubIo = hs.indexOf('.github.io') !== -1;
        if (enGithubIo) {
            var repo = hs.replace('.github.io', '');
            return fetch('https://api.github.com/repos/' + repo + '/' + repo + '.github.io/contents/' + CARPETA)
                .then(function (r) {
                    if (!r.ok) throw new Error('api');
                    return r.json();
                })
                .then(function (arr) {
                    if (!Array.isArray(arr)) throw new Error('no-array');
                    return arr.map(function (x) { return { name: x.name, size: x.size || 0 }; });
                })
                .catch(function () {
                    return listarPorManifestRemoto();
                });
        }
        return listarPorManifestRemoto();
    }

    // En NATIVAS (o cuando no hay github.io): el update.json remoto de la
    // propia plataforma es LA fuente (tiene 'archivo' y opcionalmente
    // 'descarga' a GitHub Releases). El update.json LOCAL solo se usa como
    // ultimo respaldo offline (sin archivo => seria una lista vacia).
    function listarPorManifestRemoto() {
        var url = PLATAFORMA === 'web' ? UPDATE_URL : BASE_URL + CARPETA + 'update.json';
        return fetch(url + '?v=' + Date.now(), { cache: 'no-store' })
            .then(function (r) {
                if (!r.ok) throw new Error('manifest');
                return r.json();
            })
            .then(function (u) {
                ultimoManifest = u;
                return u && u.archivo ? [{ name: u.archivo, size: 0 }] : [];
            })
            .catch(function () {
                return leerUpdateJson().then(function (u) {
                    ultimoManifest = u;
                    return u && u.archivo ? [{ name: u.archivo, size: 0 }] : [];
                });
            });
    }

    function leerUpdateJson() {
        return fetch(UPDATE_URL + '?v=' + Date.now(), { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });
    }

    // Contenido del archivo .txt (notas del parche). Si falla, notas vacias.
    function leerNotas(nombre) {
        if (!nombre) return Promise.resolve([]);
        return fetch(BASE_URL + CARPETA + nombre, { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.text() : ''; })
            .then(function (txt) {
                return String(txt).split('\n').map(function (l) { return l.replace(/\r$/, '').trim(); })
                    .filter(function (l) { return l.length > 0; });
            })
            .catch(function () { return []; });
    }

    // Archivo instalable en una lista (item {name,size} o null). Prioriza el
    // propio APP_ARCHIVO de la plataforma si esta; si no, el primer instalable.
    function hallarInstalable(lista) {
        var ext = EXTENSION_INSTALABLE[PLATAFORMA];
        if (!ext) return null;
        for (var i = 0; i < lista.length; i++) {
            if (String(lista[i].name).toLowerCase() === String(APP_ARCHIVO[PLATAFORMA]).toLowerCase()) return lista[i];
        }
        for (var j = 0; j < lista.length; j++) {
            var n = String(lista[j].name);
            var ln = n.toLowerCase();
            if (ln.indexOf(ext) === ln.length - ext.length) return lista[j];
        }
        return null;
    }

    // Archivo .txt informativo en la lista (item o null). Prioriza el que coincida
    // con el nombre del instalable (ej: "JAM POS-txt.txt" junto a "JAM POS.apk").
    function hallarTxt(lista) {
        var inst = hallarInstalable(lista);
        var base = inst ? String(inst.name).replace(/\.[^.]+$/, '').toLowerCase() : null;
        var elegido = null;
        for (var i = 0; i < lista.length; i++) {
            var n = String(lista[i].name);
            if (/\.txt$/i.test(n) && n.toLowerCase() !== 'update.json') {
                if (base && n.toLowerCase().indexOf(base) !== -1) return lista[i];
                if (!elegido) elegido = lista[i];
            }
        }
        return elegido;
    }

    function tituloDeTxt(nombre) {
        if (!nombre) return 'JAM POS Parche';
        var n = String(nombre).replace(/\.txt$/i, '').replace(/[_-]+/g, ' ').trim();
        return n ? n : 'JAM POS Parche';
    }

    function mostrarPopup(datos) {
        if (overlay) cerrarPopup();
        if (appBloqueada()) return;
        crearEstilos();
        overlay = document.createElement('div');
        overlay.className = 'jamupd-fondo';
        var tieneDescarga = !!datos.descarga;
        var notasHtml = (datos.notas && datos.notas.length)
            ? '<ul class="jamupd-notas">' + datos.notas.map(function (n) { return '<li><b>&#10003;</b><span>' + escapeHtml(String(n)) + '</span></li>'; }).join('') + '</ul>'
            : '';
        var botones =
            (tieneDescarga ? '<button class="jamupd-btn jamupd-btn-actualizar" id="jamupdSi">&#10515;&nbsp; Descargar e instalar</button>' : '<button class="jamupd-btn jamupd-btn-actualizar" id="jamupdSi">&#10003;&nbsp; Entendido</button>') +
            (tieneDescarga ? '<button class="jamupd-btn jamupd-btn-quedarme" id="jamupdNo">No aceptar por ahora</button>' : '');
        overlay.innerHTML =
            '<div class="jamupd-caja">' +
            '<div class="jamupd-badge">&#9650;&nbsp;' + (tieneDescarga ? 'Actualizaci&oacute;n disponible' : 'Novedad de JAM POS') + '</div>' +
            '<h2>JAM POS v1.1 By @felinuxs</h2>' +
            '<p class="jamupd-sub">' + escapeHtml(String(datos.titulo)) + '</p>' +
            notasHtml +
            (tieneDescarga ? '<div class="jamupd-aviso">&#9888;&nbsp;Hay un nuevo parche de la aplicaci&oacute;n. Desc&aacute;rgala e inst&aacute;lala para disfrutar de las mejoras.</div>' : '') +
            botones +
            '</div>';
        document.body.appendChild(overlay);
        ultimosDatos = datos;
        var elSi = overlay.querySelector('#jamupdSi');
        var elNo = overlay.querySelector('#jamupdNo');
        if (elSi) elSi.onclick = tieneDescarga ? actualizarAhora : avisoEntendido;
        if (elNo) elNo.onclick = quedarse;
    }

    var ultimosDatos = null;

    // Boton "Entendido" de un aviso sin descarga: marca visto una sola vez.
    function avisoEntendido() {
        cerrarPopup();
        var claveTxt = ultimosDatos && ultimosDatos.claveVisto ? ultimosDatos.claveVisto : '';
        try { if (claveTxt) localStorage.setItem('jampos_aviso_' + claveTxt, '1'); } catch (e) {}
    }

    function quedarse() {
        cerrarPopup();
        // El usuario decidio quedarse: NO registra el archivo, asi que en el
        // proximo inicio se le vuelve a recordar mientras siga el parche.
        toast('De momento te quedas con esta versi\u00f3n. Te avisamos en el pr\u00f3ximo inicio.');
    }

    var recargando = false;

    function navegacionForzada() {
        if (recargando) return;
        recargando = true;
        window.location.href = window.location.href.split('#')[0] + (window.location.search ? '&' : '?') + 'jampos_upd=' + Date.now();
        setTimeout(function () { window.location.reload(); }, 4000);
    }

    function urlDescarga() {
        try {
            var d = ultimosDatos || {};
            if (d.descarga) return String(d.descarga);
            if (d.archivo && PLATAFORMA !== 'web') return BASE_URL + PLATAFORMA + '/' + String(d.archivo);
        } catch (e) {}
        return '';
    }

    function actualizarAhora() {
        cerrarPopup();
        // El usuario acepto el parche: registrar este archivo instalable (nombre:size).
        if (ultimosDatos && ultimosDatos.firma) guardarInstalada(String(ultimosDatos.firma));
        if (PLATAFORMA !== 'web') {
            var url = urlDescarga();
            if (!url) { toast('No se encontre el enlace de descarga del parche.'); return; }
            toast('Abriendo descarga de la actualizaci\u00f3n...');
            var puente = window.AndroidBridge;
            try {
                if (puente && typeof puente.abrirEnlace === 'function') { puente.abrirEnlace(url); return; }
            } catch (e) {}
            try {
                var a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener';
                document.body.appendChild(a);
                a.click();
                setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 100);
            } catch (e) {}
            return;
        }
        // WEB/PWA: recarga a la nueva version via Service Worker.
        toast('Buscando actualizaci&oacute;n...');
        if ('serviceWorker' in navigator) {
            try {
                var handler = function () {
                    try { navigator.serviceWorker.removeEventListener('controllerchange', handler); } catch (e) {}
                    setTimeout(function () { window.location.reload(); }, 600);
                };
                navigator.serviceWorker.addEventListener('controllerchange', handler);
                navigator.serviceWorker.getRegistration().then(function (reg) {
                    if (reg) {
                        if (reg.waiting) { try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {} }
                        try { reg.update(); } catch (e) {}
                        setTimeout(navegacionForzada, 6000);
                    } else {
                        navegacionForzada();
                    }
                }).catch(navegacionForzada);
            } catch (e) { navegacionForzada(); }
        } else {
            navegacionForzada();
        }
    }

    function aviso_nuevo(archivo, txt, notas) {
        var claveTxt = txt ? String(txt.name).replace(/\.txt$/i, '') : '';
        // Aviso informativo (solo .txt) ya visto? una sola vez.
        if (!archivo && claveTxt) {
            try { if (localStorage.getItem('jampos_aviso_' + claveTxt)) return; } catch (e) {}
        }
        // Si el instalable publicado es EXACTAMENTE el archivo con el que se entrego
        // esta build, ya lo tenemos instalado: silencio.
        if (archivo && String(archivo.name).toLowerCase() === String(APP_ARCHIVO[PLATAFORMA] || '').toLowerCase()) return;
        if (archivo) {
            var firma = firmaDe(archivo);
            var marker = leerInstalada();
            if (marker === firma) return;                 // mismo archivo ya instalado
            if (esFirmaModerna(marker) && marker !== firma) {
                __avisadoSesion[firma] = true;
                return presentar(archivo, txt, notas, firma);
            }
            // marker vacio o de versiones anteriores:
            if (!marker || !esFirmaModerna(marker)) {
                // No hay registro del archivo: si en la carpeta esta SOLO el mismo
                // archivo entregado, se anota en silencio (es la version actual).
                var soloPropio = true;
                for (var i = 0; i < (window.__jamListaActual || []).length; i++) {
                    var n = String(window.__jamListaActual[i].name).toLowerCase();
                    if (n.indexOf(EXTENSION_INSTALABLE[PLATAFORMA]) !== -1 &&
                        n !== String(APP_ARCHIVO[PLATAFORMA]).toLowerCase()) { soloPropio = false; break; }
                }
                if (soloPropio) { guardarInstalada(firma); return; } // ya es la version actual
                __avisadoSesion[firma] = true;
                return presentar(archivo, txt, notas, firma);
            }
        } else {
            // Sin instalable pero con .txt: notificacion informativa.
            if (__avisadoSesion['txt:' + claveTxt]) return;
            __avisadoSesion['txt:' + claveTxt] = true;
            if (!claveTxt) return;
            return presentar(null, txt, notas, null);
        }
    }

    function presentar(archivo, txt, notas, firma) {
        var nombreInst = archivo ? String(archivo.name) : '';
        var titulo = archivo
            ? (tituloDeTxt(txt ? txt.name : null) + ' &middot; ' + escapeHtml(nombreInst))
            : tituloDeTxt(txt ? txt.name : null);
        // La URL de descarga puede venir del update.json remoto (campo
        // 'descarga', util para EXE/DEB alojados en GitHub Releases) o, en su
        // defecto, del instalable publicado en la carpeta de la plataforma.
        var descarga = '';
        try {
            if (ultimoManifest && ultimoManifest.descarga) descarga = String(ultimoManifest.descarga);
        } catch (e) {}
        if (!descarga && archivo && PLATAFORMA !== 'web') {
            descarga = BASE_URL + PLATAFORMA + '/' + nombreInst;
        }
        mostrarPopup({
            archivo: nombreInst,
            firma: firma || '',
            claveVisto: txt ? String(txt.name).replace(/\.txt$/i, '') : '',
            titulo: titulo,
            notas: notas,
            descarga: descarga
        });
    }

    function comprobar() {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        if (appBloqueada()) return;
        if (document.readyState === 'loading') { setTimeout(comprobar, CHECK_INICIAL_MS); return; }
        listarCarpeta()
            .then(function (lista) {
                if (!Array.isArray(lista) || lista.length === 0) return; // carpeta vacia: silencio
                window.__jamListaActual = lista;
                var archivo = hallarInstalable(lista);
                var txt = hallarTxt(lista);
                if (!archivo && !txt) return; // sin instalable ni .txt: silencio
                var claveTxt = txt ? String(txt.name).replace(/\.txt$/i, '') : '';
                if (!archivo && claveTxt) {
                    try { if (localStorage.getItem('jampos_aviso_' + claveTxt)) return; } catch (e) {}
                }
                if (__avisadoSesion[archivo ? firmaDe(archivo) : ('txt:' + claveTxt)]) return;
                return leerNotas(txt ? txt.name : null).then(function (notas) {
                    // Si no hay .txt con notas (caso nativas via manifest), usar
                    // las notas publicadas en el propio update.json.
                    if ((!notas || notas.length === 0) && ultimoManifest && Array.isArray(ultimoManifest.notas)) {
                        notas = ultimoManifest.notas.map(String);
                    }
                    aviso_nuevo(archivo, txt, notas);
                });
            })
            .catch(function () {});
    }

    function iniciar() {
        setTimeout(comprobar, CHECK_INICIAL_MS);
        setInterval(comprobar, CHECK_INTERVALO_MS);
        if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
            window.addEventListener('online', function () { setTimeout(comprobar, 3000); });
        }
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) setTimeout(comprobar, 2000);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();

    window.jamCheckUpd = comprobar;   // util para depuracion/forzar
    window.jamListarCarpeta = listarCarpeta;
    window.jamHallarInstalable = hallarInstalable;
    window.jamAvisoNuevo = aviso_nuevo;
})();