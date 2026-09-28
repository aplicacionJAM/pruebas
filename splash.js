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

    var ICONO = rutaBase + 'icon-512.png';
    var NS = 'http://www.w3.org/2000/svg';
    var LADO = 230; // lado de la caja del logo (viewBox del SVG)

    var logo = document.createElement('div');
    // width/height explicitos (no solo aspect-ratio) para que tambien funcione
    // en WebViews antiguas donde aspect-ratio no existe.
    logo.style.cssText = 'position:relative;width:46vw;max-width:230px;height:46vw;max-height:230px;overflow:hidden;';

    // Capa 1 - estado VACIO: silueta del icono en gris claro (se ve siempre,
    // sin depender de mask-image). Asi se distingue con claridad que el logo
    // aun no se ha "llenado".
    var base = document.createElement('img');
    base.src = ICONO;
    base.alt = 'JAM POS';
    base.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;' +
        'filter:grayscale(1) brightness(1.5) contrast(.85);opacity:.55;';
    logo.appendChild(base);

    // Capa 2 - estado LLENO: el ICONO (no un cuadro) se llena de azul con un
    // borde de ola que sube. Para que el azul nunca se salga de la silueta,
    // el liquido se dibuja dentro de un <mask> con la forma del icono, y el
    // nivel lo recortan dos paths de onda (seno). Nada de rectangulo azul.
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + LADO + ' ' + LADO);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';

    var defs = document.createElementNS(NS, 'defs');

    // Mascara = silueta del icono (el filtro la vuelve blanca solida, asi la
    // mascara usa el canal alpha del PNG y no sus colores).
    var mask = document.createElementNS(NS, 'mask');
    mask.setAttribute('id', 'jampIcono');
    mask.setAttribute('maskUnits', 'userSpaceOnUse');
    mask.setAttribute('x', '0');
    mask.setAttribute('y', '0');
    mask.setAttribute('width', LADO);
    mask.setAttribute('height', LADO);
    var maskImg = document.createElementNS(NS, 'image');
    maskImg.setAttribute('href', ICONO);
    maskImg.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', ICONO);
    maskImg.setAttribute('x', '0');
    maskImg.setAttribute('y', '0');
    maskImg.setAttribute('width', LADO);
    maskImg.setAttribute('height', LADO);
    maskImg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    maskImg.style.cssText = 'filter:brightness(0) invert(1);';
    mask.appendChild(maskImg);
    defs.appendChild(mask);

    // Degradado azul del liquido.
    var grad = document.createElementNS(NS, 'linearGradient');
    grad.setAttribute('id', 'jampAgua');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');
    var s1 = document.createElementNS(NS, 'stop');
    s1.setAttribute('offset', '0');
    s1.setAttribute('stop-color', '#60a5fa');
    var s2 = document.createElementNS(NS, 'stop');
    s2.setAttribute('offset', '1');
    s2.setAttribute('stop-color', '#2563eb');
    grad.appendChild(s1);
    grad.appendChild(s2);
    defs.appendChild(grad);

    svg.appendChild(defs);

    // Grupo con la mascara: TODO lo que hay dentro queda recortado al logo.
    var gAgua = document.createElementNS(NS, 'g');
    gAgua.setAttribute('mask', 'url(#jampIcono)');
    svg.appendChild(gAgua);

    // Sombra de la ola (detras, mas clara y mas baja) para dar volumen.
    var pathFondo = document.createElementNS(NS, 'path');
    pathFondo.setAttribute('fill', '#93c5fd');
    pathFondo.setAttribute('opacity', '.75');
    gAgua.appendChild(pathFondo);

    // Nivel principal del liquido.
    var pathFrente = document.createElementNS(NS, 'path');
    pathFrente.setAttribute('fill', 'url(#jampAgua)');
    gAgua.appendChild(pathFrente);

    logo.appendChild(svg);
    capa.appendChild(logo);

    // Construye el path de una onda (seno) que sirve de "nivel de agua".
    function ondaPath(y, amp, fase) {
        var d = 'M0,' + LADO + ' L0,' + y.toFixed(1);
        var paso = 8;
        for (var x = 0; x <= LADO; x += paso) {
            var yy = y + Math.sin((x / LADO) * Math.PI * 3 + fase) * amp;
            d += ' L' + x + ',' + yy.toFixed(1);
        }
        d += ' L' + LADO + ',' + LADO + ' Z';
        return d;
    }

    // Pinta el nivel del liquido. p = 0..1 (avance), t = fase del tiempo.
    function pintarRelleno(p, t) {
        var nivel = Math.max(0, Math.min(1, p));
        var y = LADO * (1 - nivel) - 4; // sube de abajo (230) a arriba (0)
        pathFrente.setAttribute('d', ondaPath(y, 8, t));
        pathFondo.setAttribute('d', ondaPath(y + 11, 6, t * 1.35 + 1.7));
    }
    pintarRelleno(0, 0);

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
            // El nivel sube sincronizado con el audio y la fase de la onda
            // avanza sola, asi el borde queda siempre ondeado.
            pintarRelleno(p, (Date.now() - inicio) / 260);
        }, 60);
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
