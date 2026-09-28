// ============================================================
// web-bridge.js · JAM POS ESTABLE
// Emula el puente nativo AndroidBridge (WebView -> JS) usando
// exclusivamente APIs de navegador:
//   - Carpeta elegida  -> File System Access API (showDirectoryPicker)
//   - Guardar/Leer     -> subcarpeta JAMPOS dentro de la carpeta
//   - Ticket imagen    -> Blob + descarga (o carpeta si hay una elegida)
//   - Impresión        -> iframe oculto + window.print()
//   - Notificaciones   -> Notification API + service worker
//   - Versión ESTABLE: completa, sin candado ni límites de prueba
// ============================================================
(function () {
    'use strict';

    // Si ya existe un puente nativo REAL (APK: inyectado por MainActivity vía
    // addJavascriptInterface), NO sobreescribirlo: esta emulación es solo para
    // navegador/PWA. En el APK este archivo queda inerte.
    if (window.AndroidBridge) return;

    const DB_NAME = 'jampos-web-fs';
    const DB_STORE = 'handles';
    const SUB_CARPETA = 'JAMPOS';

    let carpetaHandle = null;
    let carpetaNombre = '';

    // ---------- IndexedDB para conservar el handle de la carpeta ----------
    function abrirIDB() {
        return new Promise(function (resolve, reject) {
            var req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = function () {
                if (!req.result.objectStoreNames.contains(DB_STORE)) {
                    req.result.createObjectStore(DB_STORE);
                }
            };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
    }
    function guardarHandle(h) {
        return abrirIDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(DB_STORE, 'readwrite');
                tx.objectStore(DB_STORE).put(h, 'carpeta');
                tx.oncomplete = function () { db.close(); resolve(); };
                tx.onerror = function () { db.close(); reject(tx.error); };
            });
        });
    }
    function cargarHandle() {
        return abrirIDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(DB_STORE, 'readonly');
                var g = tx.objectStore(DB_STORE).get('carpeta');
                g.onsuccess = function () { db.close(); resolve(g.result || null); };
                g.onerror = function () { db.close(); reject(g.error); };
            });
        });
    }

    // ---------- base64 <-> bytes ----------
    function b64ToBytes(b64) {
        var bin = atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }
    function bytesToB64(bytes) {
        var bin = '';
        var chunk = 0x8000;
        for (var i = 0; i < bytes.length; i += chunk) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(bin);
    }
    function dataUrlToBytes(dataUrl) {
        var b64 = String(dataUrl).indexOf('base64,') >= 0
            ? String(dataUrl).split('base64,')[1]
            : '';
        return b64ToBytes(b64);
    }

    // ---------- helpers UI ----------
    function notificar(mensaje, tipo) {
        try {
            if (window.mostrarNotificacion) { window.mostrarNotificacion(mensaje, tipo || 'info'); return; }
        } catch (e) {}
        try { alert(mensaje); } catch (e) {}
    }
    function descargarBlob(blob, nombre) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 5000);
    }

    // ---------- carpeta (File System Access API) ----------
    async function subCarpetaJAMPOS() {
        if (!carpetaHandle) return null;
        try {
            for await (const entry of carpetaHandle.values()) {
                if (entry.kind === 'directory' && entry.name === SUB_CARPETA) return entry;
            }
        } catch (e) {}
        try {
            return await carpetaHandle.getDirectoryHandle(SUB_CARPETA, { create: true });
        } catch (e) { return null; }
    }

    async function elegirCarpeta() {
        if (!window.showDirectoryPicker) {
            notificar('Tu navegador no soporta elegir carpeta (usa Chrome/Edge). Los archivos se descargarán a Descargas.', 'info');
            if (window.carpetaSeleccionadaCallback) window.carpetaSeleccionadaCallback('', '');
            return;
        }
        try {
            var h = await window.showDirectoryPicker({ mode: 'readwrite' });
            carpetaHandle = h;
            carpetaNombre = h.name || 'Carpeta';
            try { await guardarHandle(h); } catch (e) {}
            if (window.carpetaSeleccionadaCallback) window.carpetaSeleccionadaCallback(carpetaNombre, 'web:' + (h.name || ''));
        } catch (e) {
            if (window.carpetaSeleccionadaCallback) window.carpetaSeleccionadaCallback('', '');
        }
    }

    async function getCarpetaInfo() {
        if (!carpetaHandle) return '';
        return (carpetaNombre || 'Carpeta') + '|web:' + (carpetaHandle.name || '');
    }

    async function escribirEnCarpeta(nombre, bytes) {
        var sub = await subCarpetaJAMPOS();
        if (!sub) return false;
        try {
            var f = await sub.getFileHandle(nombre, { create: true });
            var w = await f.createWritable();
            await w.write(bytes);
            await w.close();
            return true;
        } catch (e) { return false; }
    }

    async function guardarArchivo(nombre, mime, base64) {
        var bytes = b64ToBytes(base64);
        if (await escribirEnCarpeta(nombre, bytes)) return 'ok:web:' + nombre;
        descargarBlob(new Blob([bytes], { type: mime || 'application/octet-stream' }), nombre);
        return 'ok:web-descarga';
    }

    async function saveTicketImage(dataUrl, nombre) {
        var bytes = dataUrlToBytes(dataUrl);
        if (await escribirEnCarpeta(nombre, bytes)) return 'ok:web:' + nombre;
        descargarBlob(new Blob([bytes], { type: 'image/png' }), nombre);
        return 'ok:web-descarga';
    }

    async function leerArchivo(nombre) {
        try {
            var sub = await subCarpetaJAMPOS();
            if (!sub) return 'null';
            var f = await sub.getFileHandle(nombre);
            var file = await f.getFile();
            var buf = await file.arrayBuffer();
            return bytesToB64(new Uint8Array(buf));
        } catch (e) { return 'null'; }
    }

    async function listarArchivos() {
        try {
            var sub = await subCarpetaJAMPOS();
            if (!sub) return '[]';
            var nombres = [];
            for await (const entry of sub.values()) {
                if (entry.kind === 'file') nombres.push(entry.name);
            }
            return JSON.stringify(nombres);
        } catch (e) { return '[]'; }
    }

    // ---------- impresión ----------
    function printTicket(html, nombre) {
        var iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.setAttribute('aria-hidden', 'true');
        iframe.srcdoc = html;
        document.body.appendChild(iframe);
        iframe.onload = function () {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (e) {}
            setTimeout(function () { iframe.remove(); }, 2000);
        };
    }

    // ---------- misc ----------
    function setSystemBarsColor(color) {
        try {
            var meta = document.getElementById('themeColorMeta') ||
                document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', color);
            var cs = document.getElementById('colorSchemeMeta');
            if (cs) {
                var hex = String(color).replace('#', '');
                var r = parseInt(hex.substr(0, 2), 16) || 0;
                var g = parseInt(hex.substr(2, 2), 16) || 0;
                var b = parseInt(hex.substr(4, 2), 16) || 0;
                cs.setAttribute('content', (0.299 * r + 0.587 * g + 0.114 * b) < 150 ? 'dark' : 'light');
            }
        } catch (e) {}
    }
    function deviceId() {
        var id = localStorage.getItem('jampos_device_id');
        if (!id) {
            id = 'web-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
            localStorage.setItem('jampos_device_id', id);
        }
        return id;
    }
    function cerrarApp() {
        try { window.close(); } catch (e) {}
    }
    function toast(mensaje) {
        notificar(mensaje, 'info');
    }
    function esVersionPrueba() {
        return false;
    }

    // Versión ESTABLE — completa, sin candado ni conteo de días.
    // No se escribe ninguna marca de prueba.
    function verificarPrueba() {
        return JSON.stringify({
            bloqueada: false,
            diasRestantes: 0,
            fechaInicio: 0,
            tamper: false,
            version: 'estable'
        });
    }

    // ---------- Wake Lock (pantalla encendida) ----------
    var _wakeLock = null;
    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                _wakeLock = await navigator.wakeLock.request('screen');
                _wakeLock.addEventListener('release', function() { _wakeLock = null; });
                console.log('[PWA] Wake Lock activo');
                return true;
            }
        } catch (e) { console.log('[PWA] Wake Lock no disponible:', e.message); }
        return false;
    }
    async function releaseWakeLock() {
        try { if (_wakeLock) { await _wakeLock.release(); _wakeLock = null; } } catch (e) {}
    }

    // ---------- Orientation Lock ----------
    function lockPortrait() {
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('portrait').catch(function() {});
            }
        } catch (e) {}
    }

    // ---------- iOS Standalone Detection ----------
    function esAppInstalada() {
        return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    }

    // ---------- Visibility: re-request Wake Lock al volver ----------
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && !_wakeLock) {
            requestWakeLock();
        }
    });

    // ---------- restaurar carpeta persistida ----------
    cargarHandle().then(function (h) {
        if (h) { carpetaHandle = h; carpetaNombre = h.name || 'Carpeta'; }
    }).catch(function () {});

    window.AndroidBridge = {
        cerrarApp: cerrarApp,
        toast: toast,
        esVersionPrueba: esVersionPrueba,
        deviceId: deviceId,
        verificarPrueba: verificarPrueba,
        setSystemBarsColor: setSystemBarsColor,
        saveTicketImage: saveTicketImage,
        printTicket: printTicket,
        elegirCarpeta: elegirCarpeta,
        getCarpetaInfo: getCarpetaInfo,
        guardarArchivo: guardarArchivo,
        leerArchivo: leerArchivo,
        listarArchivos: listarArchivos,
        requestWakeLock: requestWakeLock,
        releaseWakeLock: releaseWakeLock,
        lockPortrait: lockPortrait,
        esAppInstalada: esAppInstalada
    };
})();
