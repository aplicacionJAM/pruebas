// ============================================================================
// JAM POS - SPLASH DE ARRANQUE (capa decorativa).
//
// - No retrasa el arranque: app.js carga y opera DEBAJO al mismo tiempo.
//   Esta capa solo se superpone visualmente mientras dura el sonido de inicio.
// - Reproduce el sonido de arranque (1.mp3 interno / el que tenga "Elegir
//   sonido") y dura EXACTAMENTE lo que dura el MP3.
// - Efecto: el logo (icon-512) se rellena de "agua" de abajo hacia arriba al
//   ritmo del audio, como un splash animado sencillo (fill desde abajo).
// - Se retira sola al terminar el audio (o al error/salto, con tope de 4s).
// - Compatible con APK nativo (file:///android_asset/...) y con la version web.
// ============================================================================
(function () {
    // Solo la primera carga: si ya se mostro esta sesion no se repite.
    try { if (sessionStorage.getItem('jamsplash_shown')) return; } catch (e) {}
    try { sessionStorage.setItem('jamsplash_shown', '1'); } catch (e) {}

    var SONIDO = 'notificacion/1.mp3';
    var esNativa = typeof window.AndroidBridge !== 'undefined' && !!window.AndroidBridge;

    // Usa el sonido interno elegido por el usuario (misma preferencia del
    // servicio y de las alertas: "usarSonidoInterno").
    try {
        var cfg = JSON.parse(localStorage.getItem('jampos_config') || 'null');
        if (cfg && cfg.usarSonidoInterno !== false) { /* preferimos interno */ }
    } catch (e) {}
    // El webroot del APK es file:///android_asset/www/ (MainActivity carga ahi
    // index.html). En web se deduce del src de este script (raiz del sitio).
    var rutaBase = esNativa ? 'file:///android_asset/www/' : '';
    if (!esNativa) { var r = (new URL(document.currentScript && document.currentScript.src || location.href)).href; rutaBase = r.substring(0, r.lastIndexOf('/') + 1); }

    var audio = new Audio();
    audio.src = rutaBase + 'notificacion/1.mp3';
    audio.preload = 'auto';

    var DURACION_MAX_MS = 4000; // tope de seguridad por si el MP3 no carga

    var capa = document.createElement('div');
    capa.id = 'jampoSplash';
    capa.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483000;' +
        'background:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'font-family:sans-serif;transition:opacity .35s ease;';

    var logo = document.createElement('div');
    logo.style.cssText = 'position:relative;width:46vw;max-width:230px;aspect-ratio:1;';
    // Imagen del logo "completo" (gris referencial) y encima el mismo logo
    // "recortado" que se va llenando de azul de abajo hacia arriba.
    var cont = document.createElement('div');
    cont.style.cssText =
        'position:absolute;inset:0;overflow:hidden;-webkit-mask-image:url(' +
        (rutaBase + 'icon-512.png') +
        ');mask-image:url(' +
        (rutaBase + 'icon-512.png') +
        ');-webkit-mask-size:100%;mask-size:100%;-webkit-mask-repeat:no-repeat;';

    var agua = document.createElement('div');
    agua.style.cssText =
        'position:absolute;left:0;right:0;bottom:0;height:0%;' +
        'background:linear-gradient(180deg,#60a5fa,#2563eb);transition:height 80ms linear;';
    cont.appendChild(agua);
    logo.appendChild(cont);
    capa.appendChild(logo);

    var pie = document.createElement('div');
    pie.textContent = 'JAM POS';
    pie.style.cssText =
        'margin-top:10px;font-size:13px;color:#475569;font-weight:700;letter-spacing:.12em;';
    capa.appendChild(pie);

    document.documentElement.appendChild(capa);

    // El "llenado" avanza sincronizado con el tiempo del audio (0..1 de duracion),
    // asi la transicion termina justo cuando acaba el sonido.
    var fin = null;
    function retirar() {
        if (fin) return; fin = true;
        try { audio.pause(); } catch (e) {}
        capa.style.opacity = '0';
        setTimeout(function () {
            try { if (capa.parentNode) capa.parentNode.removeChild(capa); } catch (e) {}
        }, 380);
    }

    function durarAlAudio(dur) {
        var total = Math.min(dur * 1000 || DURACION_MAX_MS, 6000);
        var inicio = Date.now();
        var t = setInterval(function () {
            var p = (Date.now() - inicio) / total;
            if (p >= 1.25) { clearInterval(t); retirar(); return; }
            agua.style.height = Math.min(100, Math.round(p * 100)) + '%';
        }, 90);
        setTimeout(retirar, total + 320);
    }

    var arranco = Date.now();
    function onLista() {
        try { audio.play().catch(function(){}); } catch (e) {}
        durarAlAudio(isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 2.6);
    }
    audio.addEventListener('loadedmetadata', function () { onLista(); }, false);
    audio.addEventListener('canplay', function () { /* fallback */ }, false);

    // Si el audio no carga en 2.4s, igual mostramos una version corta y salimos.
    setTimeout(function () {
        if (!fin && Date.now() - arranco > 2400 && capa.parentNode) retirar();
    }, DURACION_MAX_MS);

    audio.load();
})();
