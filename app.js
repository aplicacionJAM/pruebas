// ==================== UTILIDADES ====================
    const escapeHtml = s => s != null ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) : '';
    const fmtPrecio = v => { let num = Number(v); if(isNaN(num)) num = 0; let p = num.toFixed(2).split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return p.join(','); };
    const fmtDolar = v => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const parseBs = v => {
        let s = String(v == null ? '' : v).trim();
        if (!s) return 0;
        const tieneComa = s.includes(','), tienePunto = s.includes('.');
        let n;
        if (tieneComa && tienePunto) n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
        else if (tieneComa) n = parseFloat(s.replace(/,/g, '.'));
        else n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    };
    // ============ MÁSCARA Bs (entrada de derecha a izquierda, estilo caja registradora) ============
    const fmtEnteroBs = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    function pintarBs(input) {
        const dig = input.dataset.bsDig || '';
        if (!dig) {
            input.value = '';
            input.dataset.bsPrev = '';
            if (typeof document !== 'undefined' && document.activeElement === input) {
                try { input.setSelectionRange(0, 0); } catch(e) {}
            }
            return;
        }
        const ent = fmtEnteroBs(dig.length > 2 ? (dig.slice(0, -2).replace(/^0+(?=\d)/, '') || '0') : '0');
        const dec = dig.slice(-2).padStart(2, '0');
        input.value = ent + ',' + dec;
        input.dataset.bsPrev = input.value;
        if (typeof document !== 'undefined' && document.activeElement === input) {
            try { input.setSelectionRange(input.value.length, input.value.length); } catch(e) {}
        }
    }
    function digDesdeTexto(s) {
        const limpio = String(s).replace(/[^\d,]/g, '');
        const idx = limpio.indexOf(',');
        const ent = (idx !== -1 ? limpio.slice(0, idx) : limpio).replace(/^0+(?=\d)/, '') || '0';
        const dec = idx !== -1 ? (limpio.slice(idx + 1).slice(0, 2) || '').padEnd(2, '0') : '';
        let num = parseInt(ent, 10) * 100 + (dec ? parseInt(dec, 10) : 0);
        if (!isFinite(num) || num < 0) num = 0;
        num = Math.min(num, 99999999999999);
        return String(num).slice(0, 14);
    }
    function sincerarDig(input) {
        const t = input.value.split(',');
        const ent = (t[0] || '').replace(/\D/g, '');
        const dec = t.length > 1 ? (t[1] || '').replace(/\D/g, '').slice(0, 2) : '';
        let num = parseInt(ent || '0', 10) * 100 + (dec ? parseInt(dec.padEnd(2, '0'), 10) : 0);
        input.dataset.bsDig = (isFinite(num) && num > 0) ? String(Math.min(num, 99999999999999)).slice(0, 14) : '';
        input.dataset.bsPrev = input.value;
        input.dataset.bsReiniciar = '1';
    }
    function sincronizarBs(input) {
        if (!input) return;
        sincerarDig(input);
    }
    function fijarBs(input, numero) {
        input.value = numero > 0 ? fmtPrecio(numero) : '';
        sincronizarBs(input);
    }
    function reconciliarBs(input) {
        if (input.dataset.bsOk !== '1' || input.dataset.bsPrev === undefined) return false;
        const V = input.value, prev = input.dataset.bsPrev;
        if (V === prev) return false;
        let dig = input.dataset.bsDig || '';
        let a = 0, L = Math.min(prev.length, V.length);
        while (a < L && prev[a] === V[a]) a++;
        let b = 0;
        while (b < L - a && prev[prev.length - 1 - b] === V[V.length - 1 - b]) b++;
        const ins = V.slice(a, V.length - b);
        const del = prev.slice(a, prev.length - b);
        if (ins && !del) {
            if (ins.length === 1 && /^\d$/.test(ins)) {
                if (input.dataset.bsReiniciar === '1') { dig = ''; input.dataset.bsReiniciar = '0'; }
                if (dig.length < 14) dig += ins;
            } else if (ins.length === 1 && (ins === ',' || ins === '.')) {
                input.dataset.bsDig = dig;
                pintarBs(input);
                return true;
            } else {
                input.dataset.bsDig = digDesdeTexto(ins).slice(0, 14);
                input.dataset.bsReiniciar = '0';
                pintarBs(input);
                return true;
            }
        } else if (del && !ins) {
            const nDel = (del.match(/\d/g) || []).length;
            if (nDel > 0) {
                dig = dig.slice(0, Math.max(0, dig.length - nDel));
                input.dataset.bsReiniciar = '0';
            }
        } else if (del && ins) {
            if (ins.length === 1 && /^\d$/.test(ins) && (del.replace(/\D/g, '').length <= 1)) {
                if (input.dataset.bsReiniciar === '1') { dig = ''; input.dataset.bsReiniciar = '0'; }
                if (dig.length < 14) dig += ins;
            } else {
                input.dataset.bsDig = digDesdeTexto(V).slice(0, 14);
                input.dataset.bsReiniciar = '0';
                pintarBs(input);
                return true;
            }
        } else {
            return false;
        }
        input.dataset.bsDig = dig.slice(0, 14);
        pintarBs(input);
        return true;
    }
    function aplicarMascaraBs(input, placeholder) {
        if (!input || input.dataset.bsOk) return;
        input.dataset.bsOk = '1';
        input.dataset.bsReiniciar = '1';
        if (input.type !== 'text') input.type = 'text';
        input.inputMode = 'decimal';
        if (placeholder) input.placeholder = placeholder;
        input.addEventListener('input', () => { if (reconciliarBs(input)) input.dispatchEvent(new Event('input', { bubbles: true })); });
        input.addEventListener('paste', () => setTimeout(() => { input.dataset.bsDig = digDesdeTexto(input.value).slice(0, 14); input.dataset.bsReiniciar = '0'; pintarBs(input); }, 0));
        if (input.value) sincronizarBs(input); else { input.dataset.bsDig = ''; input.dataset.bsPrev = ''; }
    }
    const esOscuro = c => { let r=parseInt(c.slice(1,3),16), g=parseInt(c.slice(3,5),16), b=parseInt(c.slice(5,7),16); return(.299*r + .587*g + .114*b) < 128; };
    const normalizeText = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const capitalizeWords = s => s.replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (m, p1, p2) => p1 + p2.toUpperCase());
    const TOKENS_FA = { '💵':'fa-money-bill-wave', '💰':'fa-sack-dollar', '💳':'fa-credit-card', '🏦':'fa-building-columns', '📱':'fa-mobile-screen-button', '🔀':'fa-shuffle', '📷':'fa-camera', '📦':'fa-boxes-stacked', '🗑':'fa-trash', '🗑️':'fa-trash', '✅':'fa-circle-check', '❌':'fa-circle-xmark', '⚠️':'fa-triangle-exclamation', 'ℹ️':'fa-circle-info', '❓':'fa-circle-question', '💾':'fa-floppy-disk', '📁':'fa-folder', '📂':'fa-folder-open', '☁️':'fa-cloud', '🚚':'fa-truck', '🛒':'fa-cart-shopping', '🛍️':'fa-bag-shopping', '🔒':'fa-lock', '🔓':'fa-lock-open', '🕘':'fa-clock', '🟢':'fa-circle', '🟡':'fa-circle', '🔴':'fa-circle', '📊':'fa-chart-column', '🧮':'fa-calculator', '🏷️':'fa-tag', '👤':'fa-user', '👥':'fa-users', '💚':'fa-heart', '🏢':'fa-building', '🌐':'fa-globe', '🪙':'fa-coins', '📘':'fa-book', '📆':'fa-calendar-days', '📅':'fa-calendar-days', '📈':'fa-chart-line', '🧾':'fa-receipt', '💸':'fa-money-bill-wave', '📜':'fa-scroll', '✏️':'fa-pen', '📞':'fa-phone', '📋':'fa-clipboard', '🔔':'fa-bell', '🔖':'fa-tag', '🔗':'fa-link', '📌':'fa-thumbtack', '📍':'fa-location-dot', '🌟':'fa-star', '🎨':'fa-palette', '🌓':'fa-circle-half-stroke', '🌙':'fa-moon', '🧑‍💼':'fa-user-tie', '⚙️':'fa-gear', '🪪':'fa-id-card', '📲':'fa-mobile-screen', '🔄':'fa-rotate', '💱':'fa-money-bill-transfer', '💡':'fa-lightbulb', '🔐':'fa-lock', '💼':'fa-briefcase', '✉️':'fa-envelope', '🙏':'fa-hands-praying', '🔊':'fa-volume-high', '🗓️':'fa-calendar-days', '💲':'fa-dollar-sign', '📤':'fa-upload', '📥':'fa-download', '↔️':'fa-right-left', '⏱️':'fa-stopwatch', }; const COLOR_FA = { '🟢':'#22c55e', '🟡':'#eab308', '🔴':'#ef4444', }; function nodosIconosFA(texto, contenedor) { if (texto == null) return; let s = String(texto); const claves = Object.keys(TOKENS_FA).sort((a,b) => b.length - a.length); while (s.length) { let idx = -1, tok = ''; claves.forEach(k => { const i = s.indexOf(k); if (i !== -1 && (idx === -1 || i < idx)) { idx = i; tok = k; } }); if (idx === -1) { contenedor.appendChild(document.createTextNode(s)); return; } if (idx > 0) contenedor.appendChild(document.createTextNode(s.slice(0, idx))); const ic = document.createElement('i'); ic.className = 'fas ' + TOKENS_FA[tok]; if (COLOR_FA[tok]) ic.style.color = COLOR_FA[tok]; contenedor.appendChild(ic); s = s.slice(idx + tok.length); } }
    function mostrarNotificacion(mensaje, tipo = 'info') { const notif = document.createElement('div'); notif.className = 'notificacion-flotante'; notif.style.backgroundColor = tipo === 'success' ? '#10b981' : (tipo === 'error' ? '#ef4444' : '#3b82f6'); notif.style.color = 'white'; const iconos = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' }; const ic = document.createElement('i'); ic.className = 'fas ' + (iconos[tipo] || 'fa-circle-info'); notif.appendChild(ic); const txt = document.createElement('span'); nodosIconosFA(String(mensaje || '').replace(/^\s*(✅|❌|⚠️|ℹ️|❓)\s*/u, ''), txt); notif.appendChild(txt); document.body.appendChild(notif); setTimeout(() => notif.remove(), 3000); }
    async function puenteResultado(v){ return (v && typeof v.then === 'function') ? await v : v; }
    function mostrarNotificacionNativa(titulo, cuerpo, tag, opciones) {
        // NATIVAS primero: si hay puente con canal real (Android notification /
        // Electron OS notification) se usa ese; lo demas es solo web/PWA.
        try {
            var br = window.AndroidBridge;
            if (br && typeof br.mostrarNotificacion === 'function') {
                var t = String(tag || 'jampos');
                var colorPromo = null;
                try {
                    var th = window.D && window.D.config && window.D.config.theme;
                    if (t.indexOf('jampos-promo') === 0 && th) colorPromo = String(th);
                } catch (e) {}
                br.mostrarNotificacion(String(titulo || ''), String(cuerpo || ''), t, colorPromo);
                return;
            }
        } catch (e) {}
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
        const mensaje = () => { return { type: 'showNotification', title: titulo, body: cuerpo, tag: tag || 'jampos', image: opciones && opciones.image ? String(opciones.image) : undefined, icon: './icon-192.png', badge: './icon-192.png' }; };
        if (Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(function(reg) { if(reg.active) reg.active.postMessage(mensaje()); });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(function(perm) {
                if (perm === 'granted') {
                    navigator.serviceWorker.ready.then(function(reg) { if(reg.active) reg.active.postMessage(mensaje()); });
                }
            });
        }
    }
    
    // Empuja una preferencia de alertas al servicio nativo (APK) para que suene
    // o se calle la notif de cambio de tasa en segundo plano. En web/PWA solo
    // se guarda en localStorage (los toggles mandan en el propio JS).
    async function notificarPrefServicio(clave, valor) {
        try {
            if (window.AndroidBridge && typeof window.AndroidBridge.guardarPrefServicio === 'function') {
                window.AndroidBridge.guardarPrefServicio(String(clave), Boolean(valor));
            } else {
                const prefs = JSON.parse(localStorage.getItem('jam_pos_prefs') || '{}');
                prefs[clave] = Boolean(valor);
                localStorage.setItem('jam_pos_prefs', JSON.stringify(prefs));
            }
        } catch (e) {}
    }

    // ==================== DIÁLOGOS NATIVOS (reemplazan alert/confirm/prompt) ====================
    function jamDialogo(opciones) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-form';
            overlay.style.zIndex = '12000';
            const iconos = { info: 'fa-circle-info', error: 'fa-triangle-exclamation', success: 'fa-circle-check', pregunta: 'fa-circle-question' };
            const tipo = opciones.tipo || 'info';
            const cerrar = (i) => {
                let val = i >= 0 ? opciones.botones[i].valor : null;
                if (opciones.input && val === '__ok__') {
                    const inp = document.getElementById('dialogoInput');
                    val = inp ? inp.value : '';
                }
                overlay.remove();
                resolve(val);
            };
            const dialogo = document.createElement('div');
            dialogo.className = 'dialogo-nativo';
            const titulo = document.createElement('div');
            titulo.className = 'dialogo-titulo';
            const icono = document.createElement('span');
            icono.className = 'dialogo-icono';
            icono.innerHTML = `<i class="fas ${iconos[tipo] || 'fa-circle-info'}"></i>`;
            titulo.appendChild(icono);
            titulo.appendChild(document.createTextNode(opciones.titulo || 'Aviso'));
            dialogo.appendChild(titulo);
            const cuerpo = document.createElement('div');
            cuerpo.className = 'dialogo-cuerpo';
            nodosIconosFA(opciones.mensaje, cuerpo);
            dialogo.appendChild(cuerpo);
            let inp = null;
            if (opciones.input) {
                inp = document.createElement('input');
                inp.id = 'dialogoInput';
                inp.className = 'dialogo-input';
                inp.type = 'text';
                inp.value = opciones.input.valor || '';
                inp.placeholder = opciones.input.placeholder || '';
                inp.autocomplete = 'off';
                dialogo.appendChild(inp);
            }
            const botones = document.createElement('div');
            botones.className = 'dialogo-botones';
            opciones.botones.forEach((b, i) => {
                const btn = document.createElement('button');
                btn.className = 'dialogo-boton' + (b.destacado ? ' dialogo-boton-primario' : '');
                btn.textContent = b.texto;
                btn.onclick = () => cerrar(i);
                botones.appendChild(btn);
            });
            dialogo.appendChild(botones);
            overlay.appendChild(dialogo);
            document.body.appendChild(overlay);
            overlay.onclick = (e) => { if (e.target === overlay) cerrar(opciones.botones.length === 1 ? 0 : -1); };
            if (inp) {
                const idxOk = opciones.botones.findIndex(b => b.valor === '__ok__');
                inp.focus();
                inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && idxOk >= 0) cerrar(idxOk); });
            }
        });
    }
    function jamAlert(mensaje, tipo = 'info') {
        return jamDialogo({ titulo: tipo === 'error' ? 'Error' : 'Aviso', mensaje, tipo, botones: [{ texto: 'Aceptar', valor: true, destacado: true }] });
    }
    function jamConfirm(mensaje) {
        return jamDialogo({ titulo: 'Confirmación', mensaje, tipo: 'pregunta', botones: [{ texto: 'Cancelar', valor: false }, { texto: 'Aceptar', valor: true, destacado: true }] });
    }
    function jamPrompt(mensaje, valor, placeholder) {
        return jamDialogo({ titulo: 'Ingreso de datos', mensaje, tipo: 'info', input: { valor, placeholder }, botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Aceptar', valor: '__ok__', destacado: true }] });
    }
    window.alert = (m) => jamAlert(String(m));
    
    // ==================== RECORTADOR DE LOGO (1:1, canvas) ====================
    function abrirRecortadorLogo(dataUrl, onListo) {
        const MAX = 340;
        const img = new Image();
        img.onload = () => {
            const natW = img.naturalWidth, natH = img.naturalHeight;
            const escala = Math.min(MAX / natW, MAX / natH, 1);
            const vw = Math.max(60, Math.round(natW * escala));
            const vh = Math.max(60, Math.round(natH * escala));
            let sel = { x: 0, y: 0, s: Math.min(vw, vh) };
            sel.x = Math.round((vw - sel.s) / 2);
            sel.y = Math.round((vh - sel.s) / 2);
            const overlay = document.createElement('div');
            overlay.className = 'recorte-overlay';
            const caja = document.createElement('div');
            caja.className = 'recorte-caja';
            const titulo = document.createElement('div');
            titulo.className = 'recorte-titulo';
            titulo.innerHTML = '<span style="font-size:16px">✂️</span> Recortar logo (cuadrado)';
            const vista = document.createElement('div');
            vista.className = 'recorte-vista';
            const canvas = document.createElement('canvas');
            canvas.width = vw; canvas.height = vh;
            const ctx = canvas.getContext('2d');
            function pintar() {
                ctx.clearRect(0, 0, vw, vh);
                ctx.drawImage(img, 0, 0, vw, vh);
                const s = sel.s;
                ctx.fillStyle = 'rgba(0,0,0,.55)';
                ctx.fillRect(0, 0, vw, sel.y);
                ctx.fillRect(0, sel.y + s, vw, vh - sel.y - s);
                ctx.fillRect(0, sel.y, sel.x, s);
                ctx.fillRect(sel.x + s, sel.y, vw - sel.x - s, s);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(sel.x + 1, sel.y + 1, s - 2, s - 2);
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(sel.x, sel.y, s, s);
                const m = 6;
                [[sel.x, sel.y], [sel.x + s, sel.y], [sel.x, sel.y + s], [sel.x + s, sel.y + s]].forEach(p => {
                    ctx.fillStyle = '#3b82f6';
                    ctx.beginPath();
                    ctx.arc(p[0], p[1], m + 2, 0, 7);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(p[0], p[1], m + 2, 0, 7);
                    ctx.stroke();
                });
            }
            function clamp() {
                const maxLado = Math.min(vw, vh);
                sel.s = Math.max(30, Math.min(maxLado, sel.s));
                sel.x = Math.max(0, Math.min(vw - sel.s, sel.x));
                sel.y = Math.max(0, Math.min(vh - sel.s, sel.y));
            }
            function esc(p) {
                const r = canvas.getBoundingClientRect();
                return { x: (p.clientX - r.left) * (vw / r.width), y: (p.clientY - r.top) * (vh / r.height) };
            }
            let arrastrando = null, iniX = 0, iniY = 0, iniSel = null;
            canvas.addEventListener('pointerdown', e => {
                e.preventDefault();
                const p = esc(e);
                const dentro = p.x >= sel.x && p.x <= sel.x + sel.s && p.y >= sel.y && p.y <= sel.y + sel.s;
                if (!dentro) return;
                arrastrando = 'mover';
                iniX = p.x; iniY = p.y; iniSel = { ...sel };
                canvas.setPointerCapture(e.pointerId);
            });
            canvas.addEventListener('pointermove', e => {
                if (!arrastrando) return;
                e.preventDefault();
                const p = esc(e);
                const dx = p.x - iniX, dy = p.y - iniY;
                sel.x = iniSel.x + dx;
                sel.y = iniSel.y + dy;
                clamp(); pintar();
            });
            const fin = () => { if (arrastrando) { arrastrando = null; try { canvas.releasePointerCapture(canvas.pointerId); } catch (e) {} } };
            canvas.addEventListener('pointerup', fin);
            canvas.addEventListener('pointercancel', fin);
            vista.appendChild(canvas);
            const pie = document.createElement('div');
            pie.className = 'recorte-pie';
            pie.innerHTML = '<span>Arrastra para mover · usa las esquinas para ajustar el tamaño</span>';
            const acciones = document.createElement('div');
            acciones.className = 'recorte-acciones';
            const btnCancelar = document.createElement('button');
            btnCancelar.className = 'recorte-boton recorte-boton-cancelar';
            btnCancelar.textContent = 'Cancelar';
            btnCancelar.onclick = () => overlay.remove();
            const btnRecortar = document.createElement('button');
            btnRecortar.className = 'recorte-boton recorte-boton-ok';
            btnRecortar.textContent = 'Recortar y usar';
            btnRecortar.onclick = () => {
                const salida = document.createElement('canvas');
                salida.width = 512; salida.height = 512;
                const sctx = salida.getContext('2d');
                const fx = natW / vw, fy = natH / vh;
                const sx = sel.x * fx, sy = sel.y * fy, sw = sel.s * fx, sh = sel.s * fy;
                sctx.drawImage(img, sx, sy, sw, sh, 0, 0, 512, 512);
                try { sctx.globalCompositeOperation = 'destination-over'; sctx.fillStyle = '#ffffff'; sctx.fillRect(0, 0, 512, 512); } catch (e) {}
                overlay.remove();
                onListo(salida.toDataURL('image/png'));
            };
            acciones.appendChild(btnCancelar);
            acciones.appendChild(btnRecortar);
            caja.appendChild(titulo);
            caja.appendChild(vista);
            caja.appendChild(pie);
            caja.appendChild(acciones);
            overlay.appendChild(caja);
            document.body.appendChild(overlay);
            pintar();
        };
        img.src = dataUrl;
    }
    
    // ==================== FUNCIÓN PARA TINTAR BARRA DE NAVEGACIÓN INFERIOR (ANDROID) ====================
    function setNavigationBarColor(color) {
        // Método nativo (WebView): pinta de verdad la barra de estado y la de navegación
        try {
            if (window.AndroidBridge && AndroidBridge.setSystemBarsColor) {
                AndroidBridge.setSystemBarsColor(color);
            }
        } catch(e) {}
        
        // Método 1: Tintar mediante theme-color (solo barra superior, pero ayuda)
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        if(metaTheme) metaTheme.setAttribute('content', color);
        
        // Método 2: Intentar usar la API experimental de Android (WebView/Chrome)
        if(window.navigator?.virtualKeyboard) {
            // No es suficiente, pero intentamos con CSS
        }
        // Método 3: La forma más efectiva es usar la siguiente línea (solo funciona si la app está instalada o en standalone)
        // No hay API directa, pero podemos forzar un cambio de color-scheme y usar env()
        document.documentElement.style.setProperty('--nav-bar-color', color);
        
        // Método 4: Para Chrome en Android (>= 2020) se puede usar 'displayCutout' y background
        // Creamos un style dinámico para forzar el color de la barra de navegación
        let style = document.getElementById('dynamic-nav-style');
        if(!style) {
            style = document.createElement('style');
            style.id = 'dynamic-nav-style';
            document.head.appendChild(style);
        }
        style.innerHTML = `
            @media (display-mode: standalone) {
                body {
                    padding-bottom: env(safe-area-inset-bottom);
                }
            }
            /* Forzar el color de fondo de la barra de navegación en Android (truco visual) */
            body::before {
                display: none;
            }
        `;
        
        // Truco: Si el modo es light, claro; si dark, negro; si gray, gris oscuro
        // Esto no es perfecto pero muchos navegadores lo respetan con theme-color
        // Además agregamos un meta para color-scheme
        let colorSchemeMeta = document.getElementById('colorSchemeMeta');
        if(colorSchemeMeta) {
            if(color === '#ffffff' || color === '#fff') colorSchemeMeta.setAttribute('content', 'light');
            else colorSchemeMeta.setAttribute('content', 'dark');
        }
        
        // Método avanzado: Forzar repintado visual
        document.body.style.transform = 'translateZ(0)';
        setTimeout(() => { document.body.style.transform = ''; }, 100);
    }
    
    // ==================== VENTANA ESCRITORIO (frameless, sin menú) ====================
    // En escritorio (Electron) la clase desktop-window activa la barra propia
    // tintada del fondo del tema. Debe reaplicarse tras cada applyTheme porque
    // ese método resetea body.className.
    function esEscritorio() {
        try { return !!(window.AndroidBridge && AndroidBridge.esEscritorio === true); } catch(e) { return false; }
    }
    function initDesktopWindow() {
        if (!esEscritorio()) return;
        document.body.classList.add('desktop-window');
        const min = document.getElementById('dbtnMin');
        const max = document.getElementById('dbtnMax');
        const close = document.getElementById('dbtnClose');
        if (min && max && close && !window.__jamBarraEscritorioOk) {
            window.__jamBarraEscritorioOk = true;
            min.addEventListener('click', (e) => { e.preventDefault(); try { AndroidBridge.minimizarVentana(); } catch(_){} });
            max.addEventListener('click', (e) => { e.preventDefault(); try { AndroidBridge.maximizarVentana(); } catch(_){} });
            close.addEventListener('click', (e) => { e.preventDefault(); try { AndroidBridge.cerrarVentana(); } catch(_){} });
            // Doble clic en la zona de arrastre: maximizar/restaurar
            const barra = document.getElementById('desktopTitlebar');
            if (barra) barra.addEventListener('dblclick', (e) => {
                if (e.target.closest && e.target.closest('#desktopTitlebarBtns')) return;
                try { AndroidBridge.maximizarVentana(); } catch(_){}
            });
        }
    }

    // ==================== STORAGE KEYS ====================
    const DATA_STORES = ['productos', 'clientes', 'proveedores', 'gastos', 'empleados', 'ventas', 'tasa_diaria', 'tickets', 'entregas'];
    const STORAGE_KEYS = {
        productos: 'jam_pos_productos',
        clientes: 'jam_pos_clientes',
        proveedores: 'jam_pos_proveedores',
        gastos: 'jam_pos_gastos',
        empleados: 'jam_pos_empleados',
        ventas: 'jam_pos_ventas',
        config: 'jam_pos_config',
        session_meta: 'jam_pos_meta',
        tasa_diaria: 'jam_pos_tasa_diaria',
        entregas: 'jam_pos_entregas',
        tickets: 'jam_pos_tickets',
        session_cart: 'jam_pos_session_cart'
    };

    let _idbAvisada = false;
    // ==================== DUAL PERSISTENCIA (IDB + Archivos JSON) ====================
    // Cada escritura a IDB también guarda un archivo JSON como respaldo físico.
    // Si IDB se borra (limpieza de caché, actualización), los datos se restauran
    // automáticamente desde los archivos.
    const DB_BACKUP_FOLDER = 'JAMPOS DB';

    async function guardarBackupArchivo(store, data) {
        if (!esAppNativa()) return;
        if (!carpetaNativa || !carpetaNativa.uri) return;
        try {
            const json = JSON.stringify(data || []);
            await puenteResultado(AndroidBridge.guardarArchivo(
                DB_BACKUP_FOLDER + '/' + store + '.json',
                'application/json',
                utf8ToBase64(json)
            ));
        } catch (e) { console.warn('[DUAL] Error guardando backup ' + store + ':', e); }
    }

    async function cargarBackupArchivo(store) {
        if (!esAppNativa()) return null;
        if (!carpetaNativa || !carpetaNativa.uri) return null;
        try {
            const contenido = await puenteResultado(AndroidBridge.leerArchivo(DB_BACKUP_FOLDER + '/' + store + '.json'));
            if (!contenido) return null;
            return JSON.parse(base64ToUtf8(contenido));
        } catch (e) { console.warn('[DUAL] Error leyendo backup ' + store + ':', e); return null; }
    }

    async function restaurarDesdeArchivos() {
        if (!esAppNativa()) return 0;
        let restaurados = 0;
        for (const store of DATA_STORES) {
            try {
                const desdeArchivo = await cargarBackupArchivo(store);
                if (desdeArchivo && desdeArchivo.length > 0) {
                    await saveToIDB(store, desdeArchivo);
                    D[store] = desdeArchivo;
                    restaurados++;
                    console.log('[DUAL] Restaurado ' + store + ': ' + desdeArchivo.length + ' registros');
                }
            } catch (e) { console.warn('[DUAL] Error restaurando ' + store, e); }
        }
        if (restaurados > 0) {
            mostrarNotificacion('✅ Base de datos restaurada desde respaldo (' + restaurados + ' tablas)', 'success');
        }
        return restaurados;
    }

    // ==================== BACKUP INTELIGENTE ====================
    const BACKUP_CONFIG = {
        UMBRALES: [5, 15, 30, 50, 100],
        CARPETA_ROOT: 'JAM POS',
        NOMBRE_BACKUP_GLOBAL: 'backup_completo.json',
        NOMBRE_META: 'meta.json'
    };

    function obtenerContadores() {
        const raw = localStorage.getItem('jampos_backup_contadores');
        return raw ? JSON.parse(raw) : { productos:0, ventas:0, clientes:0, total:0 };
    }
    function guardarContadores(c) { localStorage.setItem('jampos_backup_contadores', JSON.stringify(c)); }

    function registrarOperacion(store) {
        const c = obtenerContadores();
        if (store === 'productos' || store === 'clientes' || store === 'ventas') c[store]++;
        c.total++;
        guardarContadores(c);
        if (BACKUP_CONFIG.UMBRALES.includes(c.total) && !sessionStorage.getItem('jampos_backup_popup_mostrado')) {
            sessionStorage.setItem('jampos_backup_popup_mostrado', '1');
            setTimeout(() => mostrarPopUpBackup(c.total), 2000);
        }
        // Auto-backup inmediato: APK escribe a carpeta, PWA guarda en IDB
        if (esAppNativa()) {
            autoBackupArchivo(store).catch(() => {});
        }
        // PWA: backup a IDB ya está cubierto por saveToIDB en saveItem
    }

    function mostrarPopUpBackup(totalOps) {
        if (document.querySelector('.backup-popup-fondo')) return;
        const accent = D.config.theme || '#3b82f6';
        const esNativa = esAppNativa();
        const fondo = document.createElement('div');
        fondo.className = 'backup-popup-fondo';
        fondo.innerHTML = `
            <div class="backup-popup">
                <div class="backup-popup-icono"><i class="fas fa-floppy-disk"></i></div>
                <h3>Tus datos están creciendo</h3>
                <p>Has realizado <strong>${totalOps} operaciones</strong> importantes. Recomendamos crear un respaldo para proteger tu información.</p>
                <div class="backup-popup-opciones">
                    ${esNativa ? `<button class="backup-popup-btn backup-popup-btn-principal" style="background:${accent}" onclick="window._ejecutarBackupLocal()"><i class="fas fa-folder"></i> Guardar en este dispositivo</button>` : `<button class="backup-popup-btn backup-popup-btn-principal" style="background:${accent}" onclick="window._ejecutarBackupDescarga()"><i class="fas fa-download"></i> Descargar respaldo JSON</button>`}
                    <button class="backup-popup-btn backup-popup-btn-secundario" onclick="window._ejecutarBackupGoogleDrive()"><i class="fas fa-cloud"></i> Guardar en Google Drive</button>
                    <button class="backup-popup-btn backup-popup-btn-texto" onclick="window._cerrarPopUpBackup()">Recordar después</button>
                </div>
            </div>`;
        document.body.appendChild(fondo);
    }
    window._cerrarPopUpBackup = () => { const el = document.querySelector('.backup-popup-fondo'); if (el) el.remove(); };

    window._ejecutarBackupDescarga = () => { window._cerrarPopUpBackup(); exportarBackupJSON(); };

    window._ejecutarBackupLocal = async () => {
        window._cerrarPopUpBackup();
        if (!esAppNativa()) return;
        mostrarNotificacion('⏳ Creando respaldo...', 'info');
        try {
            const todos = await obtenerTodosLosDatos();
            AndroidBridge.guardarArchivoDirecto(
                BACKUP_CONFIG.NOMBRE_BACKUP_GLOBAL,
                utf8ToBase64(JSON.stringify(todos, null, 2))
            );
            for (const store of DATA_STORES) {
                AndroidBridge.guardarArchivoDirecto(
                    'modulos/' + store + '.json',
                    utf8ToBase64(JSON.stringify(D[store] || [], null, 2))
                );
            }
            AndroidBridge.guardarArchivoDirecto(
                BACKUP_CONFIG.NOMBRE_META,
                utf8ToBase64(JSON.stringify({
                    fecha: new Date().toISOString(), version: APP_VERSION || '0.1.3',
                    dispositivo: 'actual', operaciones: obtenerContadores()
                }, null, 2))
            );
            mostrarNotificacion('✅ Respaldo creado en /JAM POS/', 'success');
        } catch (e) { mostrarNotificacion('❌ Error al crear respaldo: ' + e.message, 'error'); }
    };

    window._ejecutarBackupGoogleDrive = () => {
        window._cerrarPopUpBackup();
        mostrarNotificacion('ℹ️ Google Drive próximamente. Usa "Descargar" y sube el archivo manualmente.', 'info');
        exportarBackupJSON();
    };

    async function autoBackupArchivo(store) {
        if (!esAppNativa()) return;
        if (!D[store] || D[store].length === 0) return;
        try {
            const ok = AndroidBridge.guardarArchivoDirecto(
                'modulos/' + store + '.json',
                utf8ToBase64(JSON.stringify(D[store], null, 2))
            );
            if (!ok || !ok.startsWith('ok')) {
                console.warn('[BACKUP] Error auto-backup ' + store + ':', ok);
            }
        } catch (e) { console.warn('[BACKUP] Error auto-backup ' + store, e); }
    }

    function mostrarPopUpRestaurar(fecha, ops) {
        if (document.querySelector('.backup-popup-fondo')) return;
        const accent = D.config.theme || '#3b82f6';
        const fechaCorta = fecha ? new Date(fecha).toLocaleDateString('es-VE') : 'desconocida';
        const fondo = document.createElement('div');
        fondo.className = 'backup-popup-fondo';
        fondo.innerHTML = `
            <div class="backup-popup">
                <div class="backup-popup-icono"><i class="fas fa-folder-open"></i></div>
                <h3>Respaldo detectado</h3>
                <p>Se encontró un respaldo en <strong>/JAM POS/</strong> del <strong>${fechaCorta}</strong> con ${ops || '?'} operaciones. ¿Deseas restaurarlo?</p>
                <div class="backup-popup-opciones">
                    <button class="backup-popup-btn backup-popup-btn-principal" style="background:${accent}" onclick="window._confirmarRestaurar(true)"><i class="fas fa-circle-check"></i> Sí, restaurar</button>
                    <button class="backup-popup-btn backup-popup-btn-secundario" onclick="window._confirmarRestaurar(false)"><i class="fas fa-circle-xmark"></i> No, empezar limpio</button>
                </div>
            </div>`;
        document.body.appendChild(fondo);
    }
    window._confirmarRestaurar = async (restaurar) => {
        window._cerrarPopUpBackup();
        if (restaurar) {
            const ok = await autoRestoreDesdeCarpeta();
            if (!ok) mostrarNotificacion('⚠️ No se pudo restaurar el respaldo', 'error');
        }
    };

    async function autoRestoreDesdeCarpeta() {
        if (!esAppNativa()) return false;
        try {
            const contenido = await puenteResultado(AndroidBridge.leerArchivo(
                BACKUP_CONFIG.CARPETA_ROOT + '/' + BACKUP_CONFIG.NOMBRE_BACKUP_GLOBAL
            ));
            if (!contenido) return false;
            const data = JSON.parse(base64ToUtf8(contenido));
            let restaurados = 0;
            for (const store of DATA_STORES) {
                if (data[store] && data[store].length > 0) {
                    D[store] = data[store];
                    try { await saveToIDB(store, data[store]); } catch(e) {}
                    restaurados++;
                }
            }
            if (data.config) { D.config = { ...D.config, ...data.config }; saveConfig(); }
            if (restaurados > 0) {
                mostrarNotificacion('✅ Respaldo restaurado desde /JAM POS/ (' + restaurados + ' tablas)', 'success');
                return true;
            }
        } catch (e) { console.warn('[BACKUP] Error auto-restore:', e); }
        return false;
    }

    function avisarIDBCaida(err){
        if (_idbAvisada) return;
        _idbAvisada = true;
        console.warn('IndexedDB no disponible:', err);
        try { mostrarNotificacion('⚠️ Base de datos local no disponible. Los datos se conservan en memoria durante esta sesión.', 'error'); } catch(e) {}
    }
    // ==================== DATOS SUCIOS / CACHÉ DE MÓDULOS ====================
    // Cada escritura de datos marca "datos sucios"; en la siguiente navegación
    // se descarta la caché visual de los módulos para que las listas se
    // reconstruyan desde la base de datos (visibilidad instantánea entre
    // módulos: cliente creado en Ventas aparece ya en Clientes y viceversa).
    let datosSucios = false;
    const MODULOS_CACHEABLES = ['ventas','inventario','clientes','proveedores','gastos','empleados','reportes','config'];
    function limpiarCacheSiDatosSucios(){
        if(!datosSucios) return;
        datosSucios = false;
        MODULOS_CACHEABLES.forEach(m => { const el = document.getElementById('_cache_' + m); if(el) el.remove(); });
    }
    function abrirBaseDatos() {
        return new Promise((resolve, reject) => {
            const configurar = req => {
                req.onupgradeneeded = e => { const db = e.target.result; DATA_STORES.forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); }); if (!db.objectStoreNames.contains('session')) db.createObjectStore('session'); };
                req.onsuccess = e => resolve(e.target.result);
            };
            const abrirSinVersion = errOriginal => {
                try { if (req1.result) req1.result.close(); } catch(e) {}
                const req2 = indexedDB.open('jampos_db');
                configurar(req2);
                req2.onerror = () => { avisarIDBCaida(req2.error || errOriginal); reject(req2.error || errOriginal); };
            };
            // Versión 5: incluye 'entregas' (v4) + 'tickets' (v5) — fallback crea stores faltantes.
            const req1 = indexedDB.open('jampos_db', 5);
            configurar(req1);
            req1.onerror = () => abrirSinVersion(req1.error);
            req1.onblocked = () => abrirSinVersion(new Error('DB bloqueada'));
        });
    }
    async function saveToIDB(store, data) {
        datosSucios = true;
        const db = await abrirBaseDatos();
        const resultado = await new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const obj = tx.objectStore(store);
            obj.clear();
            (data || []).forEach(item => {
                if (!item) return;
                if (!item.id) item.id = 'idb' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                try { obj.put(item, item.id); } catch (e) {}
            });
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = e => { db.close(); reject(e.target.error); };
        });
        guardarBackupArchivo(store, data);
        return resultado;
    }
    async function loadFromIDB(store) {
        const db = await abrirBaseDatos();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readonly');
            const obj = tx.objectStore(store);
            const req = obj.getAll();
            req.onsuccess = () => { db.close(); resolve(req.result || []); };
            req.onerror = e => { db.close(); reject(e.target.error); };
        });
    }
    async function addToIDB(store, items) {
        datosSucios = true;
        const db = await abrirBaseDatos();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const obj = tx.objectStore(store);
            (items || []).forEach(item => {
                if (!item || !item.id) return;
                try { obj.put(item, item.id); } catch (e) {}
            });
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = e => { db.close(); reject(e.target.error); };
        });
    }
    
    function loadFromStorage(key, defaultValue = []) { const data = localStorage.getItem(key); if (!data) return defaultValue; try { return JSON.parse(data); } catch(e) { return defaultValue; } }
    function saveToStorage(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
    async function saveItem(store, item) {
        const key = STORAGE_KEYS[store];
        if (DATA_STORES.includes(store)) {
            item.updatedAt = Date.now();
            D[store] = D[store] || [];
            const i = D[store].findIndex(x => x.id === item.id);
            if (i !== -1) D[store][i] = item; else D[store].push(item);
            try { await saveToIDB(store, D[store]); } catch(e) { console.warn('IDB save error', e); avisarIDBCaida(e); }
            registrarOperacion(store);
        } else {
            const items = loadFromStorage(key, []);
            const idx = items.findIndex(x => x.id === item.id);
            if (idx !== -1) items[idx] = item; else items.push(item);
            saveToStorage(key, items);
            D[store] = items;
            datosSucios = true;
        }
    }
    async function deleteItem(store, id) {
        const key = STORAGE_KEYS[store];
        if (DATA_STORES.includes(store)) {
            const tenia = (D[store] || []).some(x => x && x.id === id);
            D[store] = (D[store] || []).filter(x => x.id !== id);
            try { await saveToIDB(store, D[store]); } catch(e) { console.warn('IDB delete error', e); avisarIDBCaida(e); }
            if (tenia && window._jamSyncRegistrarBorrado) { try { window._jamSyncRegistrarBorrado(store, id); } catch(e) { console.warn('sync tombstone error', e); } }
        } else {
            const items = loadFromStorage(STORAGE_KEYS[store], []).filter(x => x.id !== id);
            saveToStorage(STORAGE_KEYS[store], items);
            D[store] = items;
            datosSucios = true;
        }
    }
    async function getAll(store) {
        if (DATA_STORES.includes(store)) {
            try { return await loadFromIDB(store); } catch(e) { console.warn('IDB load error', e); avisarIDBCaida(e); }
            // Respaldo NO destructivo: conservar lo que hay en memoria antes de
            // recurrir al espejo localStorage (que puede estar vacío).
            if (Array.isArray(D[store]) && D[store].length) return D[store];
            return loadFromStorage(STORAGE_KEYS[store] || store, []);
        }
        return loadFromStorage(STORAGE_KEYS[store], []);
    }
    
    // ==================== DATOS GLOBALES ====================
    let D = {
productos: [], clientes: [], proveedores: [], gastos: [], empleados: [], ventas: [], entregas: [], tickets: [],
        tasasVivas: {},
        config: { 
            key:'mainConfig', theme:'#3b82f6', dolarRate:0, lastUpdate:new Date().toLocaleDateString(), 
            ivaActivo:false, ivaPorcentaje:16, usarMargen:false, backgroundMode:'light', autoOscuro:false, prevenirCierre:true,
            mostrarDolar: true, tasaManual: false, tasaManualValue: 0,
            fuenteTasa: 'BCV',
            empresa: { nombre:'JAM POS', direccion:'', telefono:'', rif:'', logo:'' },
            alertaStockBajo: true, alertaTasa: true, sonidoAlertas: true,
            usarSonidoInterno: true, silenciarNotif: false,
            sonidoNotif: { nombre: '2.mp3', audio: null },
            stockMinimo: 5
        }
    };
    window.D = D;
    // Fuente de verdad SIN valor base: restituye la ultima tasa REAL guardada
    // (config -> 'tasa_diaria' en IDB/localStorage -> historial). Devuelve 0
    // si nunca hubo una tasa (instalacion nueva sin internet jamA's).
    function tasaAlmacenada(){
        if(D.config.tasaManual && D.config.tasaManualValue > 0) return D.config.tasaManualValue;
        if(D.config.dolarRate > 0) return D.config.dolarRate;
        // Ancla persistente de la ULTIMA tasa real (escribe registrarCambioTasa):
        // sobrevive el reinicio/relanzamiento aunque el resto de almacenes falle.
        try {
            const u = JSON.parse(localStorage.getItem('jam_pos_ultima_tasa') || 'null');
            if (u && typeof u.tasa === 'number' && u.tasa > 0) return u.tasa;
        } catch(e) {}
        const arr = (typeof cacheTasaDiaria !== 'undefined' && cacheTasaDiaria && cacheTasaDiaria.length) ? cacheTasaDiaria : (D.tasaDiaria && D.tasaDiaria.length ? D.tasaDiaria : null);
        if(arr && arr.length){ const u = arr[arr.length - 1]; if(u && u.tasa > 0) return u.tasa; }
        try { const h = cargarHistorialTasa(); if(h && h.length){ const u = h[h.length - 1]; if(u && u.tasa > 0) return u.tasa; } } catch(e) {}
        return 0;
    }
    // Garantiza que SIEMPRE exista tasa (la app opera en BOLIVARES): primero
    // intenta la API en vivo; si falla, restituye la ultima guardada; y si nunca
    // hubo, le pide al usuario la tasa actual una sola vez. Devuelve true si hay
    // tasa disponible al terminar.
    async function garantizarTasa(){
        if(D.config.dolarRate > 0) return true;
        try { await actualizarTasa(true); } catch(e) {}
        if(D.config.dolarRate > 0) return true;
        const t = tasaAlmacenada();
        if(t > 0){ D.config.dolarRate = t; saveConfig(); actualizarDisplayTasa(); return true; }
        let resp = null;
        try { resp = await jamPrompt('No hay tasa de cambio registrada. Ingresa la tasa actual (1 USD = ? Bs):', '', 'Ej: 813.74'); } catch(e) { return false; }
        const v = parseFloat(String(resp || '').replace(/,/g, '.').replace(/[^\d.]/g, ''));
        if(v > 0){
            D.config.dolarRate = Math.round(v * 100) / 100;
            registrarCambioTasa(D.config.dolarRate);
            saveConfig();
            actualizarDisplayTasa();
            mostrarNotificacion('Tasa guardada como referencia base', 'success');
            return true;
        }
        return false;
    }
    window.jamSaveIDB = async function(store, data) { await saveToIDB(store, data); };
    window.jamLoadIDB = async function(store) { return await loadFromIDB(store); };
    window.jamLoadAll = async function() { await loadAllData(); };
    window.jamGetAllDatos = async function() { return await obtenerTodosLosDatos(); };
    window.jamCombinarImportacion = function(dest, src, campo) { return combinarImportacion(dest, src, campo); };
    window.jamRefrescarModuloActual = function(){
        try {
            if(currentModule === 'clientes') renderCrud('clientes','Clientes',['cedula','nombre','telefono','direccion','email']);
            else if(currentModule === 'proveedores') renderCrud('proveedores','Proveedores',['rif','nombre','telefono','contacto','direccion']);
            else if(currentModule === 'gastos') renderCrud('gastos','Gastos',['concepto','montoBs','categoria','fecha']);
            else if(currentModule === 'empleados') renderCrud('empleados','Empleados',['cedula','nombre','cargo','salarioBs','diaPago','fechaPago','fechaContrato']);
            else if(currentModule === 'inventario') renderInventario();
            else if(currentModule === 'ventas') sincronizarUIVenta();
        } catch(e) { console.warn('refrescar modulo', e); }
    };
    let currentModule = 'home', currentSub = null, volverBloqueado = false, timeoutTitulo = null;
    const KIOSCO_KEY = 'jam_kiosco_ventas';
    let kioscoVentas = false;
    try { kioscoVentas = localStorage.getItem(KIOSCO_KEY) === '1'; } catch(e) {}
        
    let carrito = [], tipoPago = 'pago_movil', clienteSeleccionadoId = null, clienteInputText = '', totalVenta = 0;
    // Crédito del cliente en venta: abono inicial (pago parcial), método del abono y plazo acordado para pagar el restante.
    let creditoAbono = 0, creditoAbonoMetodo = 'efectivo_bs', creditoPlazoDias = 7;
    let productosSeleccionados = new Set(), selectAllChecked = false;
    let pagosDivididos = [{ metodo: 'efectivo_bs', monto: 0 }];
    
    // ==================== PERSISTENCIA DE SESIÓN DE VENTA ====================
    function guardarSesionVenta() {
        saveToStorage(STORAGE_KEYS.session_cart, carrito);
        saveToStorage(STORAGE_KEYS.session_meta, { tipoPago, clienteSeleccionadoId, clienteInputText, creditoAbono, creditoAbonoMetodo, creditoPlazoDias });
    }
    function cargarSesionVenta() {
        let savedCart = loadFromStorage(STORAGE_KEYS.session_cart, null);
        if(savedCart == null) { const viejo = loadFromStorage('undefined', null); if(viejo && Array.isArray(viejo)) savedCart = viejo; }
        if(savedCart && Array.isArray(savedCart)) carrito = savedCart;
        const savedMeta = loadFromStorage(STORAGE_KEYS.session_meta, null);
        if(savedMeta) {
            tipoPago = savedMeta.tipoPago || 'pago_movil';
            clienteSeleccionadoId = savedMeta.clienteSeleccionadoId || null;
            clienteInputText = savedMeta.clienteInputText || '';
            if(Number.isFinite(savedMeta.creditoAbono)) creditoAbono = savedMeta.creditoAbono;
            if(savedMeta.creditoAbonoMetodo && PAGOS_TIPO[savedMeta.creditoAbonoMetodo]) creditoAbonoMetodo = savedMeta.creditoAbonoMetodo;
            if([7,15,30].includes(Number(savedMeta.creditoPlazoDias))) creditoPlazoDias = Number(savedMeta.creditoPlazoDias);
        }
    }
    function sincronizarUIVenta() {
        if(document.getElementById('clienteIdHidden')) document.getElementById('clienteIdHidden').value = clienteSeleccionadoId || '';
        if(document.getElementById('clienteInput')) document.getElementById('clienteInput').value = clienteInputText;
        refrescarSelectorPago();
        actualizarCarritoUI();
    }
    function refrescarSelectorPago() {
        const t = document.getElementById('tipoPagoText');
        const ic = document.getElementById('tipoPagoIcon');
        if(t) t.textContent = nombreTipoPago(tipoPago);
        if(ic) ic.className = 'fas ' + iconoTipoPago(tipoPago);
    }
    function pintarTipoPagoContenedores() {
        const cc = document.getElementById('cambioContainer');
        if(cc) cc.style.display = tipoPago === 'efectivo_bs' ? 'block' : 'none';
        const pd = document.getElementById('pagoDivididoContainer');
        if(pd) pd.style.display = tipoPago === 'pago_dividido' ? 'block' : 'none';
        const cr = document.getElementById('creditoContainer');
        if(cr) cr.style.display = tipoPago === 'credito' ? 'block' : 'none';
        if(tipoPago === 'credito') actualizarResumenCredito();
    }
    // Línea de corte para el ticket a crédito (fecha y hora límite para pagar el restante).
    function textoFechaLimite(ms){
        const d = new Date(ms);
        if(isNaN(d.getTime())) return '';
        return fmtFechaDisplay(msToDateStr(ms)) + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    }
    // Resumen del crédito en Ventas: abono ahora + restante + plazo + vence (fecha y hora).
    function actualizarResumenCredito(){
        const el = document.getElementById('creditoResumen');
        if(!el) return;
        const abono = Math.max(0, Math.round((parseBs(document.getElementById('creditoAbonoInput')?.value) || 0) * 100) / 100);
        const restante = Math.max(0, Math.round((totalVenta - abono) * 100) / 100);
        const vence = new Date(Date.now() + creditoPlazoDias * 86400000);
        const venceStr = textoFechaLimite(vence.getTime());
        const nomMetodo = nombreTipoPago(creditoAbonoMetodo);
        el.innerHTML = `<div class="mb-1" style="display:flex;align-items:center;gap:4px"><span style="flex-shrink:0"><i class="fas fa-hand-holding-dollar" style="color:${D.config.theme};width:14px;text-align:center;font-size:.7rem"></i></span><span>Restante a crédito: <b>${fmtPrecio(restante)} Bs</b></span></div>
            <div class="mb-1" style="display:flex;align-items:center;gap:4px"><span style="flex-shrink:0"><i class="fas fa-calendar-day" style="color:${D.config.theme};width:14px;text-align:center;font-size:.7rem"></i></span><span>Plazo acordado: <b>${creditoPlazoDias} días</b> · Vence: <b>${venceStr}</b></span></div>
            ${abono > 0 ? `<div style="opacity:.8"><i class="fas fa-money-bill-transfer" style="width:14px;text-align:center;font-size:.7rem"></i> Abono ahora: <b>${fmtPrecio(abono)} Bs</b> por ${escapeHtml(nomMetodo)}</div>` : `<div style="opacity:.6"><i class="fas fa-info-circle" style="width:14px;text-align:center;font-size:.7rem"></i> Sin abono ahora = la venta completa queda a crédito</div>`}`;
    }
    
    async function loadAllData(){
        await leerCarpetaNativa();
        D.productos = await getAll('productos');
        D.clientes = await getAll('clientes');
        D.proveedores = await getAll('proveedores');
        D.gastos = await getAll('gastos');
        D.empleados = await getAll('empleados');
        D.ventas = await getAll('ventas');
        D.entregas = await getAll('entregas');
        D.tasaDiaria = await getAll('tasa_diaria');
        try { D.tickets = await getAll('tickets'); } catch(e) { console.warn('tickets load', e); }

        // Dual persistencia: si IDB vino vacío, restaurar desde archivos
        if (esAppNativa()) {
            let restaurado = false;
            for (const store of DATA_STORES) {
                if (D[store] && D[store].length === 0) {
                    const desdeArchivo = await cargarBackupArchivo(store);
                    if (desdeArchivo && desdeArchivo.length > 0) {
                        D[store] = desdeArchivo;
                        try { await saveToIDB(store, desdeArchivo); } catch(e) {}
                        restaurado = true;
                        console.log('[DUAL] Auto-restaurado ' + store + ': ' + desdeArchivo.length + ' registros');
                    }
                }
            }
            if (restaurado) mostrarNotificacion('✅ Base de datos restaurada automáticamente desde respaldo', 'success');
        }

        // Backup inteligente: detectar carpeta JAM POS y restaurar si existe
        if (esAppNativa()) {
            try {
                const metaRaw = await puenteResultado(AndroidBridge.leerArchivo(
                    BACKUP_CONFIG.CARPETA_ROOT + '/' + BACKUP_CONFIG.NOMBRE_META
                ));
                if (metaRaw) {
                    const meta = JSON.parse(metaRaw);
                    const totalLocal = (D.productos||[]).length + (D.clientes||[]).length + (D.ventas||[]).length;
                    if (totalLocal === 0) {
                        const restaurado = await autoRestoreDesdeCarpeta();
                        if (!restaurado) {
                            const ops = meta.operaciones ? meta.operaciones.total : '?';
                            mostrarPopUpRestaurar(meta.fecha, ops);
                        }
                    }
                }
            } catch(e) { console.log('[BACKUP] No se detectó carpeta JAM POS previa'); }
        }

        const savedConfig = localStorage.getItem(STORAGE_KEYS.config);
        if (savedConfig) try { D.config = { ...D.config, ...JSON.parse(savedConfig) }; } catch(e) {}
        if(D.config.backgroundMode !== 'dark' && D.config.backgroundMode !== 'light') D.config.backgroundMode = 'light';
        if(D.config.empresa && typeof D.config.empresa === 'object'){ D.config.empresa.nombre = D.config.empresa.nombre || 'JAM POS'; D.config.empresa.direccion = D.config.empresa.direccion || ''; D.config.empresa.telefono = D.config.empresa.telefono || ''; D.config.empresa.rif = D.config.empresa.rif || ''; D.config.empresa.logo = D.config.empresa.logo || ''; }
        else D.config.empresa = { nombre:'JAM POS', direccion:'', telefono:'', rif:'', logo:'' };
        if(D.config.mostrarDolar === undefined) D.config.mostrarDolar = true;
        if(D.config.prevenirCierre === undefined) D.config.prevenirCierre = true;
        if(D.config.tasaManual === undefined) D.config.tasaManual = false;
        if(!(D.config.tasaManualValue > 0)) D.config.tasaManualValue = 0;
        if(D.config.autoOscuro === undefined) D.config.autoOscuro = false;
        if(D.config.ivaActivo === undefined) D.config.ivaActivo = false;
        
        try { await migrarTasaDiaria(); } catch(e) { console.warn('tasa_diaria migrate', e); }
        refrescarCacheTasaDiaria();
        try{ cargarTasasVivasCache(); }catch(e){}
        if(!(D.config.dolarRate > 0)){ const __t = tasaAlmacenada(); if(__t > 0) D.config.dolarRate = __t; }
        
        aplicarModoSistema();
        applyTheme();
        saveConfig();
        cargarSesionVenta();
        setTimeout(verificarStockBajo, 1000);
    }
    
    function saveConfig(){ saveToStorage(STORAGE_KEYS.config, D.config); applyTheme(); actualizarManifestPWA(); }
    
    function actualizarManifestPWA() {
    }
    
    function esTemaOscuro(color) {
        if (typeof color !== 'string') return false;
        const hex = color.replace('#', '').trim();
        if (hex.length !== 6) return false;
        const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.3;
    }
    
    function applyTheme(){
        document.documentElement.style.setProperty('--accent', D.config.theme);
        // Modo efectivo: si el tema elegido es negro/oscuro y el fondo es oscuro,
        // el fondo se cambia automáticamente a blanco para que todo resalte.
        const temaOscuro = esTemaOscuro(D.config.theme);
        let modo = D.config.backgroundMode;
        if (temaOscuro && modo === 'dark') modo = 'light';
        document.body.className = '';
        document.body.classList.add(`${modo}-mode`);
        if (temaOscuro) document.body.classList.add('accent-oscuro');
        actualizarModoLayout();
        initDesktopWindow();
        
        const navBarColor = modo === 'dark' ? '#000000' : '#ffffff';
        
        // Actualizar theme-color para barra superior y para intentar pintar la inferior
        let themeColorMeta = document.getElementById('themeColorMeta');
        if(!themeColorMeta){
            themeColorMeta = document.createElement('meta');
            themeColorMeta.id = 'themeColorMeta';
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.setAttribute('content', navBarColor);
        
        // Forzar tintado de barra de navegación inferior mediante función especial
        setNavigationBarColor(navBarColor);
        
        // Actualizar barra de estado iOS
        let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if(!statusBarMeta){
            statusBarMeta = document.createElement('meta');
            statusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
            document.head.appendChild(statusBarMeta);
        }
        statusBarMeta.setAttribute('content', modo === 'light' ? 'default' : 'black');
        
        actualizarInfoCard();
    }
    
    function actualizarInfoCard() {
        const container = document.querySelector('.card-bcv .info-dinamica');
        if (!container) return;
        if (D.config.mostrarDolar) {
            container.innerHTML = `<span id="tasaDolarMostrar" class="text-5xl font-black" style="color:${D.config.theme}">${D.config.dolarRate > 0 ? fmtDolar(D.config.dolarRate) : '—'}</span><span class="text-2xl font-bold" style="color:${D.config.theme}">${D.config.dolarRate > 0 ? 'Bs' : ''}</span>`;
        } else {
            const ahora = new Date();
            let diaSemana = ahora.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
            const diaNumero = ahora.getDate();
            const mes = ahora.toLocaleDateString('es-ES', { month: 'long' });
            const año = ahora.getFullYear();
            container.innerHTML = `<div class="text-4xl font-black" style="color:${D.config.theme}">${diaSemana}</div><div class="text-base" style="color:${D.config.theme}">${diaNumero} de ${mes} del ${año}</div>`;
        }
    }
    
    // ==================== API TASA ====================
    // Fuente de referencia seleccionable en Configuracion > Tasa de cambio:
    //   'BCV'      -> la vigente por defecto (dolarapi primario, respaldo exchangerate-api)
    //   'ALCB-BCV' -> tasa BCV segun la API de la pagina Al Cambio (getCountryConversions VE)
    //   'ALCB-USDT'-> tasa USDT segun la web de Al Cambio (Binance P2P via getBinanceP2PAverages)
    function nombreFuenteTasa(f){
        if(f === 'ALCB-BCV') return 'Al Cambio BCV';
        if(f === 'ALCB-USDT') return 'Al Cambio USDT';
        return 'BCV';
    }
    // Lee la tasa desde la fuente elegida. Devuelve numero >0 o null si falla.
    async function obtenerTasaDesdeAPI() {
        const fuente = (D.config && D.config.fuenteTasa) || 'BCV';
        try {
            if (fuente === 'ALCB-BCV') {
                return await obtenerTasaAlCambioBcv();
            } else if (fuente === 'ALCB-USDT') {
                return await obtenerTasaAlCambioUsdt();
            }
            // fuente por defecto 'BCV' (vigente): dolarapi primario -> respaldo exchangerate-api -> VES
            return await obtenerTasaBcvVigente();
        } catch(e) { return null; }
    }

    // Tasa BCV oficial via API GraphQL de Al Cambio (getCountryConversions VE)
    async function obtenerTasaAlCambioBcv() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        try {
            const query = 'query getCountryConversions($countryCode: String!){getCountryConversions(payload:{countryCode:$countryCode}){conversionRates{official principal rateCurrency{code} baseValue}}}';
            const r = await fetch('https://api.alcambio.app/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationName: 'getCountryConversions', variables: { countryCode: 'VE' }, query: query }),
                signal: controller.signal
            });
            if (!r.ok) throw new Error();
            const d = await r.json();
            const rates = d && d.data && d.data.getCountryConversions && d.data.getCountryConversions.conversionRates;
            if (Array.isArray(rates)) {
                const usd = rates
                    .filter(x => x && x.official === true && x.rateCurrency && x.rateCurrency.code === 'USD' && x.baseValue > 0)
                    .reduce((a, b) => (a ? (b.baseValue > a.baseValue ? b : a) : b), null);
                if (usd) return parseFloat((+usd.baseValue).toFixed(2));
            }
            throw new Error();
        } catch(e) { return null; }
        finally { clearTimeout(timeoutId); }
    }

    // Tasa USDT via API GraphQL de Al Cambio (getBinanceP2PAverages)
    async function obtenerTasaAlCambioUsdt() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        try {
            const query = 'query getBinanceP2PAverages { getBinanceP2PAverages { sellAverage buyAverage asset } }';
            const r = await fetch('https://api.alcambio.app/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationName: 'getBinanceP2PAverages', variables: {}, query: query }),
                signal: controller.signal
            });
            if (!r.ok) throw new Error();
            const d = await r.json();
            const p = d && d.data && d.data.getBinanceP2PAverages;
            if (p && p.sellAverage > 0 && p.buyAverage > 0) {
                const media = (+p.sellAverage + +p.buyAverage) / 2;
                if (media > 0) return parseFloat(media.toFixed(2));
            }
            if (p && p.sellAverage > 0) return parseFloat((+p.sellAverage).toFixed(2));
            throw new Error();
        } catch(e) { return null; }
        finally { clearTimeout(timeoutId); }
    }

    // Consulta las TRES tasas en paralelo (solo para mostrar el monto en vivo
    // en el selector): BCV vigente, Al Cambio BCV y Al Cambio USDT.
    // No altera D.config.dolarRate (la fuente elegida se aplica con actualizarTasa).
    // Ademas: si es APK envia las 3 al puente nativo (widget + notificacion +
    // sonido/popup de cambio); si es web/PWA notifica + suena al cambiar.
    // ==================== TASAS VIVAS PERSISTENTES (cache offline) ====================
    // Contenido maestro: misma logica para web/PWA/APK. No cambia interfaz ni formula
    // visual: solo guarda las 3 tasas en localStorage al recibirlas y las repinta
    // al instante en el arranque offline o tras reinicio.
    const KEY_TASAS_VIVAS = 'jam_pos_tasas_vivas';
    function cargarTasasVivasCache(){
        try {
            const c = JSON.parse(localStorage.getItem(KEY_TASAS_VIVAS) || 'null');
            if(c && typeof c === 'object'){
                if(!D.tasasVivas) D.tasasVivas = {};
                let hay = false;
                ['BCV','ALCB-BCV','ALCB-USDT'].forEach(k => {
                    const v = Number(c[k]);
                    if(v > 0){ D.tasasVivas[k] = v; hay = true; }
                    else if(!(D.tasasVivas[k] > 0)){ D.tasasVivas[k] = null; }
                });
                if(hay){ try{ pintarTasasVivas(); }catch(e){} return true; }
            }
        } catch(e){}
        return false;
    }
    function guardarTasasVivasCache(){
        try{
            const v = D.tasasVivas || {};
            const b = Number(v['BCV']) > 0 ? Math.round(Number(v['BCV']) * 100) / 100 : null;
            const a = Number(v['ALCB-BCV']) > 0 ? Math.round(Number(v['ALCB-BCV']) * 100) / 100 : null;
            const u = Number(v['ALCB-USDT']) > 0 ? Math.round(Number(v['ALCB-USDT']) * 100) / 100 : null;
            if(!(b > 0 || a > 0 || u > 0)) return false;
            localStorage.setItem(KEY_TASAS_VIVAS, JSON.stringify({
                'BCV': b, 'ALCB-BCV': a, 'ALCB-USDT': u,
                fecha: new Date().toISOString().slice(0,10),
                hora: new Date().toLocaleTimeString(),
                lastUpdate: (D.config && D.config.lastUpdate) || ''
            }));
            return true;
        }catch(e){ return false; }
    }
    async function refrescarTasasVivas() {
        if(!D.tasasVivas) D.tasasVivas = {};
        try{ cargarTasasVivasCache(); }catch(e){}
        const [bcv, alcBcv, alcUsdt] = await Promise.all([
            (async () => { try { return await obtenerTasaBcvVigente(); } catch(e){ return null; } })(),
            obtenerTasaAlCambioBcv(),
            obtenerTasaAlCambioUsdt()
        ]);
        if(bcv > 0) D.tasasVivas['BCV'] = bcv;
        else if(!(D.tasasVivas['BCV'] > 0)) D.tasasVivas['BCV'] = bcv;
        if(alcBcv > 0) D.tasasVivas['ALCB-BCV'] = alcBcv;
        else if(!(D.tasasVivas['ALCB-BCV'] > 0)) D.tasasVivas['ALCB-BCV'] = alcBcv;
        if(alcUsdt > 0) D.tasasVivas['ALCB-USDT'] = alcUsdt;
        else if(!(D.tasasVivas['ALCB-USDT'] > 0)) D.tasasVivas['ALCB-USDT'] = alcUsdt;
        try{ guardarTasasVivasCache(); }catch(e){}
        pintarTasasVivas();
        // Indicar al nativo cual es la fuente REGIDORA (la visible en el home)
        // para que la barra de fondo muestre SOLO las otras dos, sin repetir.
        if (window.AndroidBridge && typeof AndroidBridge.guardarFuenteTasa === 'function') {
            try { AndroidBridge.guardarFuenteTasa(fuenteRegidoraClave()); } catch(e) {}
        }
        // Enviar al nativo (APK): mantiene widget + notificacion + avisa del cambio.
        if (window.AndroidBridge && typeof AndroidBridge.enviarTasas === 'function') {
            try {
                const nB = (bcv && bcv > 0) ? bcv : 0;
                const nA = (alcBcv && alcBcv > 0) ? alcBcv : 0;
                const nU = (alcUsdt && alcUsdt > 0) ? alcUsdt : 0;
                if (nB > 0 && nA > 0 && nU > 0) {
                    AndroidBridge.enviarTasas(nB, nA, nU);
                } else {
                    // Envio parcial: solo refresca widget (sin sonido de cambio).
                    if (nB > 0 && window.AndroidBridge && typeof AndroidBridge.guardarTasaWidget === 'function') {
                        AndroidBridge.guardarTasaWidget(fmtDolar(nB), D.config.lastUpdate || '');
                    }
                }
            } catch(e) {}
        }
        // En web/PWA/html: notificar + sonar si alguna tasa cambio.
        // Nativo real = bridge con enviarTasas (web-bridge emulado no lo tiene).
        if (!(window.AndroidBridge && typeof window.AndroidBridge.enviarTasas === 'function')) {
            avisarCambioWeb();
        }
        return D.tasasVivas;
    }
    // En web/PWA: detecta cambio y emite Web Notification + sonido del sistema.
    let __tasasPrevWeb = null;
    function avisarCambioWeb() {
        try {
            if (D.config && D.config.silenciarNotif) return;
            const cur = { BCV: D.tasasVivas['BCV'], ALCB: D.tasasVivas['ALCB-BCV'], USDT: D.tasasVivas['ALCB-USDT'] };
            const ant = __tasasPrevWeb;
            if (ant) {
                const cambios = [];
                if (ant.BCV && cur.BCV && Math.abs(cur.BCV - ant.BCV) > 0.001) cambios.push('BCV');
                if (ant.ALCB && cur.ALCB && Math.abs(cur.ALCB - ant.ALCB) > 0.001) cambios.push('Al Cambio BCV');
                if (ant.USDT && cur.USDT && Math.abs(cur.USDT - ant.USDT) > 0.001) cambios.push('Al Cambio USDT');
                if (cambios.length > 0) {
                    emitirNotificacionWeb('Tasa actualizada', 'Cambio en: ' + cambios.join(', ') + ' · JAM POS v1.1 By @felinuxs');
                    reproducirSonidoCambio();
                }
            }
            __tasasPrevWeb = cur;
        } catch(e) {}
    }
    function emitirNotificacionWeb(titulo, cuerpo) {
        try {
            if (!('Notification' in window)) return;
            if (Notification.permission === 'granted') {
                new Notification(titulo, { body: cuerpo, icon: './icon-192.png' });
            } else if (Notification.permission !== 'denied') {
                if (!D.__notifSolicitada) { D.__notifSolicitada = true; Notification.requestPermission(); }
            }
        } catch(e) {}
    }
    function reproducirSonidoCambio() {
        try {
            var elegido = D.config && D.config.sonidoNotif && D.config.sonidoNotif.audio;
            var usarInterno = !D.config || D.config.usarSonidoInterno !== false;
            var usarNuevo = elegido || usarInterno;
            if (usarNuevo) { reproducirSonidoAlerta(); return; }
            if (!D.__audioCtx) D.__audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const ctx = D.__audioCtx;
            const reanudar = (ctx.resume && ctx.resume()) || Promise.resolve();
            reanudar.then(() => {
                if (ctx.state === 'running') {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.frequency.value = 880; o.type = 'sine';
                    g.gain.setValueAtTime(0.001, ctx.currentTime);
                    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
                    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                    o.start(); o.stop(ctx.currentTime + 0.45);
                }
            }).catch(() => {});
        } catch(e) {}
    }
    // Desbloquea el audio del navegador en el primer gesto del usuario para
    // que el sonido de cambio de tasa funcione aunque el refresco ocurra
    // mucho despues sin interaccion (politica de autoplay de los navegadores).
    (function desbloquearAudio() {
        const unlock = () => {
            try {
                if (!D.__audioCtx) D.__audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (D.__audioCtx && D.__audioCtx.state === 'suspended' && D.__audioCtx.resume) {
                    D.__audioCtx.resume().catch(() => {});
                }
            } catch(e) {}
        };
        window.addEventListener('pointerdown', unlock, { once: true, passive: true });
        window.addEventListener('keydown', unlock, { once: true, passive: true });
    })();
    // Actualiza los montos en vivo en la UI del selector (si esta renderizado)
    function pintarTasasVivas() {
        ['BCV','ALCB-BCV','ALCB-USDT'].forEach(k => {
            const el = document.getElementById('tv' + k);
            if(el){
                // En el selector de Config mostramos solo el numero.
                el.innerText = tasaVivaNumero(k);
            }
            const strip = document.getElementById('strip' + k);
            if(strip){
                const v = D.tasasVivas && D.tasasVivas[k];
                strip.innerText = (v && v > 0) ? fmtDolar(v) + ' Bs' : '-- Bs';
            }
        });
    }
    // Monto en vivo para insertar por defecto en el render del selector
    function tasaVivaTexto(k){
        const v = D.tasasVivas && D.tasasVivas[k];
        return (v && v > 0) ? fmtDolar(v) + ' Bs' : '-- Bs';
    }
    // Solo el numero (sin "Bs"), para mostrar la tasa a la derecha de cada
    // boton del selector de fuente en Configuracion.
    function tasaVivaNumero(k){
        const v = D.tasasVivas && D.tasasVivas[k];
        return (v && v > 0) ? fmtDolar(v) : '--';
    }
    // Etiquetas cortas de cada API para los cuadros informativos del home.
    const __TASAS_LABEL = {
        'BCV': 'BCV',
        'ALCB-BCV': 'Al Cambio BCV',
        'ALCB-USDT': 'USDT'
    };
    // Clave (en D.tasasVivas) de la fuente elegida como REGIDORA del sistema.
    function fuenteRegidoraClave(){
        const f = (D.config && D.config.fuenteTasa) || 'BCV';
        return (f === 'ALCB-BCV' || f === 'ALCB-USDT') ? f : 'BCV';
    }
    // Devuelve las claves de las DOS tasas que NO son la regidora, en orden fijo.
    // Asi el card principal muestra la regidora y los cuadros extra las otras dos.
    function tasasExtras(){
        const reg = fuenteRegidoraClave();
        return ['BCV','ALCB-BCV','ALCB-USDT'].filter(k => k !== reg);
    }
    // HTML de los cuadros informativos extra (solo escritorio/pantalla grande).
    // Se anclan al mismo ancho que la barra buscadora y el card del dolar.
    function tasasExtrasHtml(){
        return tasasExtras().map(k => `
            <div class="tv-item tv-extra">
                <span class="tv-nombre"><img class="tv-logo" src="iconos/${k==='BCV'?'bcv':k==='ALCB-BCV'?'alcambio':'usdt'}-mini.png" alt="">${__TASAS_LABEL[k]}</span>
                <span class="tv-valor" id="strip${k}">${tasaVivaTexto(k)}</span>
            </div>`).join('');
    }
    async function obtenerTasaBcvVigente() {
        // API 1 (PRIMARIA): exchangerate-api -> rates.VES (refleja la portada BCV)
        const p1 = await (async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            try {
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: controller.signal });
                if (!response.ok) throw new Error();
                const data = await response.json();
                if (data && data.rates && data.rates.VES) return parseFloat(data.rates.VES.toFixed(2));
                throw new Error();
            } catch(e) { return null; }
            finally { clearTimeout(timeoutId); }
        })();
        if (p1 !== null) return p1;
        // API 2 (RESPALDO): ve.dolarapi.com -> fuente 'oficial' (promedio del dia)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
            const response = await fetch('https://ve.dolarapi.com/v1/dolares', { signal: controller.signal });
            if (!response.ok) throw new Error();
            const data = await response.json();
            const oficial = Array.isArray(data) ? data.find(d => d.fuente === 'oficial' && d.moneda === 'USD') : null;
            if (oficial && oficial.promedio > 0) return parseFloat(oficial.promedio.toFixed(2));
            throw new Error();
        } catch(e) { return null; }
        finally { clearTimeout(timeoutId); }
    }
    
    async function actualizarTasa(forzar = false) {
        if (D.config.tasaManual && !forzar) {
            D.config.dolarRate = D.config.tasaManualValue;
            registrarCambioTasa(D.config.dolarRate);
            saveConfig();
            actualizarDisplayTasa();
            recalcularPreciosPorTasa();
            return;
        }
        const tasaNueva = await obtenerTasaDesdeAPI();
        if (tasaNueva !== null && tasaNueva > 0) {
            const tasaPrevia = D.config.dolarRate;
            D.config.dolarRate = tasaNueva;
            D.config.lastUpdate = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
            if (forzar && D.config.tasaManual) D.config.tasaManualValue = tasaNueva;
            registrarCambioTasa(D.config.dolarRate);
            saveConfig();
            if(forzar && !(D.config && D.config.silenciarNotif)) mostrarNotificacion(`Tasa actualizada: ${fmtDolar(tasaNueva)} Bs/USD`, 'success');
            notificarTasaActualizada(tasaPrevia, tasaNueva);
        } else {
            let __c = null;
            try{
                const clave = (typeof fuenteRegidoraClave === 'function') ? fuenteRegidoraClave() : ((D.config && D.config.fuenteTasa) || 'BCV');
                const vc = D.tasasVivas && Number(D.tasasVivas[clave]);
                if(vc > 0) __c = vc;
                if(!(__c > 0)){
                    const gc = JSON.parse(localStorage.getItem(KEY_TASAS_VIVAS) || 'null');
                    const gv = gc && Number(gc[clave]);
                    if(gv > 0){ __c = gv; if(!D.tasasVivas) D.tasasVivas = {}; D.tasasVivas[clave] = gv; try{ pintarTasasVivas(); }catch(e){} }
                }
            }catch(e){}
            if(__c > 0){ D.config.dolarRate = __c; try{ saveConfig(); }catch(e){} }
            else { const __t = tasaAlmacenada(); if(__t > 0) D.config.dolarRate = __t; }
        }
        actualizarDisplayTasa();
        recalcularPreciosPorTasa();
    }
    
    function actualizarDisplayTasa() {
        if (D.config.mostrarDolar) {
            const txt = D.config.dolarRate > 0 ? fmtDolar(D.config.dolarRate) : '—';
            let span = document.getElementById('tasaDolarMostrar');
            if (span) span.innerText = txt;
            let tasaDisplay = document.getElementById('tasaActualDisplay');
            if(tasaDisplay) tasaDisplay.innerText = txt;
        }
    }
    async function recalcularPreciosPorTasa() {
        let cambios = 0, tasa = D.config.dolarRate;
        if(!(tasa > 0)) return;
        for(const p of D.productos) {
            if(p.precioVentaUsd && p.precioVentaUsd > 0) {
                const nuevoBs = Math.round(p.precioVentaUsd * tasa * 100) / 100;
                if(Math.abs(nuevoBs - p.precioVentaBs) > 0.01) { p.precioVentaBs = nuevoBs; cambios++; }
            }
            if(p.costoRealUsd && p.costoRealUsd > 0) {
                const nuevoBs = Math.round(p.costoRealUsd * tasa * 100) / 100;
                if(Math.abs(nuevoBs - p.costoRealBs) > 0.01) { p.costoRealBs = nuevoBs; cambios++; }
            }
            if(p.costoNetoUsd && p.costoNetoUsd > 0) {
                const nuevoBs = Math.round(p.costoNetoUsd * tasa * 100) / 100;
                if(Math.abs(nuevoBs - (p.costoNetoBs || 0)) > 0.01) { p.costoNetoBs = nuevoBs; cambios++; }
            }
            if(p.precioDescuentoUsd && p.precioDescuentoUsd > 0) {
                const nuevoBs = Math.round(p.precioDescuentoUsd * tasa * 100) / 100;
                if(Math.abs(nuevoBs - (p.precioDescuentoBs || 0)) > 0.01) { p.precioDescuentoBs = nuevoBs; cambios++; }
            }
        }
        if(cambios > 0) {
            try { await saveToIDB('productos', D.productos); } catch(e) {}
            saveToStorage(STORAGE_KEYS.productos, D.productos);
            mostrarNotificacion(`Precios actualizados: ${cambios} producto(s)`, 'success');
        }
    }
    
    // ==================== MODO OSCURO AUTOMÁTICO ====================
    function aplicarModoSistema() {
        // Predeterminado CLARO. Solo el usuario decide oscuro (manual en Config) o
        // auto (toggle que, si se activa, si se sincroniza con el sistema).
        if(D.config.autoOscuro) {
            const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const modoSistema = prefiereOscuro ? 'dark' : 'light';
            if(D.config.backgroundMode !== modoSistema) {
                D.config.backgroundMode = modoSistema;
                saveConfig();
            }
        }
        applyTheme();
    }
    
    // Escuchar cambios del sistema (solo si autoOscuro está activo)
    const mqModoOscuro = window.matchMedia('(prefers-color-scheme: dark)');
    mqModoOscuro.addEventListener('change', () => { if(D.config.autoOscuro) aplicarModoSistema(); });

    // Llamado desde Kotlin cuando el tema del sistema cambia (onConfigurationChanged)
    window.jamSystemThemeChanged = function(modo) {
        if(!D.config.autoOscuro) return;
        if(D.config.backgroundMode !== modo) {
            D.config.backgroundMode = modo;
            saveConfig();
        }
        applyTheme();
    };
    
    // Control de navegacion movil: el botón atrás NUNCA agota el historial (así el navegador no puede cerrar la app).
    // En móviles Chrome/Safari el navegador ignora beforeunload y cierra la pestaña en silencio cuando el historial se agota;
    // por eso aquí SIEMPRE se re-empuja una entrada al instante. El cierre real solo ocurre con el botón "Cerrar" del popup.
    function guardarYPrevenirCierre(e) {
        guardarSesionVenta();
        localStorage.setItem('jam_last_module', currentModule || '');
        if (window._permitirSalida || D.config?.prevenirCierre === false) return;
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
    window.addEventListener('beforeunload', guardarYPrevenirCierre);
    
    function cerrarAplicacion() {
        window._permitirSalida = true;
        guardarSesionVenta();
        localStorage.setItem('jam_last_module', '');
        try {
            if (window.AndroidBridge && AndroidBridge.cerrarApp) {
                AndroidBridge.cerrarApp();
                return;
            }
        } catch(e) {}
        setTimeout(() => { try { if (window.close) window.close(); } catch(e) {} }, 50);
        setTimeout(() => {
            try { if (!document.hidden) location.replace('about:blank'); } catch(e) {}
        }, 400);
    }
    
    let dialogoSalidaAbierto = false;
    function mostrarDialogoSalida() {
        dialogoSalidaAbierto = true;
        return jamDialogo({
            titulo: '¿Salir de la aplicación?',
            mensaje: 'Al cerrar la aplicación se guardará el trabajo actual. Solo podrás salir con el botón "Cerrar"; usa "Volver" para continuar.',
            tipo: 'pregunta',
            botones: [
                { texto: 'Volver', valor: false },
                { texto: 'Cerrar', valor: true, destacado: true }
            ]
        }).then(decision => {
            if (decision === true) cerrarAplicacion();
        }).finally(() => {
            dialogoSalidaAbierto = false;
        });
    }
    // Expuesto para que el WebView nativo (Kotlin) lance el popup desde el botón atrás
    window.mostrarDialogoSalida = mostrarDialogoSalida;
    
    // El listener se registra ANTES de empujar historial y el push va en try/catch,
    // para que ningún error de pushState deje a la app sin protección.
    function empujarHistorial() {
        try { history.pushState(null, null, location.href); } catch(e) {}
    }
    empujarHistorial();
    window.addEventListener('popstate', async function(e) {
        empujarHistorial();
        if (kioscoVentas) {
            if (currentModule !== 'ventas') { currentModule = 'ventas'; renderVentas(); }
            return;
        }
        if (currentModule !== 'home') {
            if (window.backToHome) window.backToHome();
            return;
        }
        if (!dialogoSalidaAbierto) await mostrarDialogoSalida();
    });
    
    // ==================== VENTAS ====================
    // --- Métodos de pago: nombres + iconos FA reales (se ven en móvil, no como el select nativo) ---
    const PAGOS_TIPO = {
        efectivo_bs:    { icono: 'fa-money-bill-wave',      nombre: 'Efectivo (Bs)' },
        dolares:        { icono: 'fa-dollar-sign',          nombre: 'Dólares (USD)' },
        tarjeta_debito: { icono: 'fa-credit-card',          nombre: 'Tarjeta Débito' },
        transferencia:  { icono: 'fa-building-columns',     nombre: 'Transferencia' },
        pago_movil:     { icono: 'fa-mobile-screen-button', nombre: 'Pago Móvil' },
        pago_dividido:  { icono: 'fa-money-bill-transfer',  nombre: 'Pago dividido' },
        credito:        { icono: 'fa-hand-holding-dollar',  nombre: 'Crédito (saldo a favor del cliente)' }
    };
    const ORDEN_PAGOS = Object.keys(PAGOS_TIPO);
    const PAGOS_SOLO_SPLIT = ['efectivo_bs','dolares','tarjeta_debito','transferencia','pago_movil'];
    const PAGOS_SOLO_ABONO = ['efectivo_bs','pago_movil','transferencia','tarjeta_debito'];
    function nombreTipoPago(v){ return (PAGOS_TIPO[v]||{}).nombre || v; }
    function iconoTipoPago(v){ return (PAGOS_TIPO[v]||{}).icono || 'fa-money-bill'; }
    function mostrarSelectorPago(actual, alElegir, solo){
        const lista = (solo && solo.length) ? solo.filter(v => PAGOS_TIPO[v]) : ORDEN_PAGOS;
        const modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:340px"><h3 class="text-xl font-bold mb-1"><i class="fas fa-money-bill-transfer" style="color:var(--accent,#3b82f6)"></i> Tipo de pago</h3>
            <p class="text-sm mb-3" style="opacity:.6">Selecciona el método de cobro</p>
            ${lista.map(v => { const sel = v === actual; return `<button type="button" data-v="${v}" class="opcion-pago-fila" style="${sel ? 'border-color:var(--accent,#3b82f6);background:var(--accent,#3b82f6)1a' : ''}"><i class="fas ${iconoTipoPago(v)} opcion-pago-ic" style="color:var(--accent,#3b82f6)"></i><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.9rem">${nombreTipoPago(v)}</span>${sel ? '<i class="fas fa-circle-check" style="color:var(--accent,#3b82f6);margin-left:auto;flex-shrink:0"></i>' : ''}</button>`; }).join('')}
            <button type="button" id="cerrarSelectorPago" class="btn-redondeado w-full py-2 bg-gray-200">Cancelar</button></div>`;
        document.body.appendChild(modal);
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
        modal.querySelectorAll('.opcion-pago-fila').forEach(b => b.onclick = () => { const v = b.dataset.v; modal.remove(); alElegir(v); });
        const cerrar = modal.querySelector('#cerrarSelectorPago'); if(cerrar) cerrar.onclick = () => modal.remove();
    }
    async function renderVentas(){
        let bloqueado = volverBloqueado, accent = D.config.theme;
        // Pantalla única de Ventas (kiosco): sin Volver; candado rojo para salir.
        const calcIcon = kioscoVentas ? `<span id="btnKioscoCalc" class="kiosco-title-calc" title="Calculadora USD/Bs"><i class="fas fa-calculator"></i></span>` : '';
        const btnHeader = kioscoVentas
            ? `<div id="btnKioscoCandado" class="kiosco-candado" title="Pantalla única activada: mantén presionado el candado 4 segundos para salir"><i class="fas fa-lock"></i></div>`
            : `<div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div>`;
        const html = `
            <div class="page-header-fixed"><div class="module-header"><div class="flex items-center" style="min-width:0"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''} ${kioscoVentas?'titulo-kiosco':''}" style="color:${accent}">Ventas${calcIcon}</h2>${kioscoVentas ? '' : `<span class="module-crumb-sep">/</span><button id="btnIrCaja" class="btn-cabezal-sub" type="button" title="Cierre de caja del día">Caja</button>`}</div>${btnHeader}</div></div>
            <div class="page-container ventas-layout">
                <div class="ventas-top">
                    <div class="cliente-search-wrap">
                        <div class="buscador">
                            <i class="fas fa-search icono-busqueda"></i>
                            <input type="text" id="clienteInput" placeholder="Buscar cliente por nombre o cédula..." class="border-2 rounded-xl p-2 w-full" style="border-color:${accent}" autocomplete="off" value="${escapeHtml(clienteInputText)}">
                            <button id="btnNuevoClienteIcon" class="btn-icon-cuadrado" title="Nuevo cliente"><i class="fas fa-plus"></i></button>
                        </div>
                        <div id="sugerenciasClientes" class="sugerencias-clientes hidden"></div>
                        <input type="hidden" id="clienteIdHidden" value="${clienteSeleccionadoId || ''}">
                    </div>
                    <div class="sugerencias-wrap" style="margin-top:14px">
                        <div class="buscador">
                            <i class="fas fa-search icono-busqueda"></i>
                            <input type="text" id="buscarProducto" placeholder="Buscar por nombre o código de barras..." class="border-2 rounded-xl p-2 w-full" style="border-color:${accent}" autocomplete="off">
                            <button id="btnScanVentas" class="btn-icon-cuadrado" title="Escanear con cámara"><i class="fas fa-camera"></i></button>
                        </div>
                        <div id="sugerencias" class="hidden"></div>
                    </div>
                </div>
                <div class="ventas-cart-scroll"><div id="carritoLista"></div></div>
                <div class="ventas-bottom">
                    <div class="p-3 rounded-xl" style="background:rgba(0,0,0,0.05)"><div class="border-b pb-2 mb-2"><div class="ticket-line"><span>SUBTOTAL</span><span id="subtotal">0,00 Bs</span></div>${D.config.ivaActivo?`<div class="ticket-line"><span>IVA (${D.config.ivaPorcentaje}%)</span><span id="iva">0,00 Bs</span></div>`:''}<div class="ticket-line font-bold"><span>TOTAL</span><span id="total">0,00 Bs</span></div></div>
                    <div class="mb-2"><label class="text-xs">Tipo de pago</label><button type="button" id="btnTipoPago" class="border rounded-xl p-2 w-full flex items-center justify-between" style="background:rgba(0,0,0,0.04);cursor:pointer;text-align:left"><span style="display:flex;align-items:center;gap:8px;min-width:0"><i id="tipoPagoIcon" class="fas ${iconoTipoPago(tipoPago)}" style="color:${accent};width:18px;text-align:center;flex-shrink:0"></i><span id="tipoPagoText" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:.9rem">${nombreTipoPago(tipoPago)}</span></span><span aria-hidden="true" style="flex-shrink:0;opacity:.55;font-size:.7rem">&#9662;</span></button></div>
                    <div id="cambioContainer" style="display:none"><div class="grid grid-cols-2 gap-2 mb-2"><input type="text" inputmode="decimal" id="montoPagado" placeholder="Monto recibido (Bs)" class="border rounded-xl p-2"><button id="calcularCambio" class="btn-azul-redondeado btn-redondeado py-2">Calcular cambio</button></div><div id="cambioMensaje" class="text-green-600 text-sm mb-2"></div></div>
                    <div id="pagoDivididoContainer" style="display:none"><div id="pagosDivididosLista"></div><button id="agregarPagoDividido" class="btn-add-split mt-1"><i class="fas fa-plus"></i> Agregar método</button><div id="splitTotalStatus" class="split-total-match mt-2"></div></div>
                    <div id="creditoContainer" style="display:none">
                        <div class="rounded-xl p-2 mb-2" style="background:rgba(0,0,0,0.04)">
                            <div class="text-xs font-bold mb-1" style="opacity:.7"><i class="fas fa-hand-holding-dollar"></i> Abono del cliente (pago parcial hoy)</div>
                            <div class="grid grid-cols-2 gap-2 mb-2">
                                <input type="text" inputmode="decimal" id="creditoAbonoInput" placeholder="Abono ahora (Bs)" class="border rounded-xl p-2" ${creditoAbono > 0 ? `value="${fmtPrecio(creditoAbono)}"` : ''}>
                                <button type="button" id="btnCreditoMetodo" class="border rounded-xl p-2 flex items-center justify-between" style="background:rgba(0,0,0,0.04);cursor:pointer;text-align:left"><span style="display:flex;align-items:center;gap:8px;min-width:0"><i id="creditoMetodoIcon" class="fas ${iconoTipoPago(creditoAbonoMetodo)}" style="color:var(--accent,#3b82f6);width:18px;text-align:center;flex-shrink:0"></i><span id="creditoMetodoText" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem;font-weight:600">${nombreTipoPago(creditoAbonoMetodo)}</span></span><span aria-hidden="true" style="flex-shrink:0;opacity:.55;font-size:.7rem">&#9662;</span></button>
                            </div>
                            <div class="text-xs font-bold mb-1" style="opacity:.7"><i class="fas fa-calendar-day"></i> Lapso para pagar el restante</div>
                            <div class="grid grid-cols-3 gap-2 mb-2" id="creditoPlazoChips">
                                ${[7,15,30].map(d => `<button type="button" data-plazo="${d}" class="credito-plazo-chip border rounded-xl py-1 text-xs font-bold" style="${creditoPlazoDias === d ? 'background:var(--accent,#3b82f6);color:#fff;border-color:var(--accent,#3b82f6)' : 'background:rgba(0,0,0,0.04);color:inherit'};cursor:pointer">${d} días</button>`).join('')}
                            </div>
                            <div id="creditoResumen" class="text-xs"></div>
                        </div>
                    </div>
                    <button id="finalizarVenta" class="btn-finalizar-venta"><i class="fas fa-circle-check"></i> Finalizar Venta</button>
                </div>
            </div>
        `;
        document.getElementById('appRoot').innerHTML = html;
        if(volverBloqueado && document.getElementById('btnVolverModule')) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        conectarGestosKiosco();
        actualizarCarritoUI();
        sincronizarUIVenta();
        
        const inputCliente = document.getElementById('clienteInput');
        const sugerenciasDiv = document.getElementById('sugerenciasClientes');
        const hiddenId = document.getElementById('clienteIdHidden');
        
        const buscarClientes = () => {
            const term = normalizeText(inputCliente.value);
            if (!term) { sugerenciasDiv.classList.add('hidden'); hiddenId.value = ''; clienteSeleccionadoId = null; clienteInputText=''; guardarSesionVenta(); return; }
            const filtrados = D.clientes.filter(c => normalizeText(c.nombre).includes(term) || (c.cedula && normalizeText(c.cedula).includes(term)));
            if (filtrados.length === 0) { sugerenciasDiv.innerHTML = '<div class="sugerencia-cliente">No se encontraron clientes</div>'; sugerenciasDiv.classList.remove('hidden'); hiddenId.value = ''; clienteSeleccionadoId = null; return; }
            sugerenciasDiv.innerHTML = filtrados.map(c => `<div class="sugerencia-cliente" data-id="${c.id}" data-nombre="${escapeHtml(c.nombre)} (${c.cedula || 'Sin cédula'})"><strong>${escapeHtml(c.nombre)}</strong> - ${escapeHtml(c.cedula || 'Sin cédula')}</div>`).join('');
            sugerenciasDiv.classList.remove('hidden');
            document.querySelectorAll('.sugerencia-cliente').forEach(el => { el.onclick = () => { hiddenId.value = el.dataset.id; clienteSeleccionadoId = el.dataset.id; clienteInputText = el.dataset.nombre; inputCliente.value = clienteInputText; sugerenciasDiv.classList.add('hidden'); guardarSesionVenta(); }; });
        };
        inputCliente.addEventListener('input', e => { clienteInputText = e.target.value; buscarClientes(); guardarSesionVenta(); });
        
        document.getElementById('btnNuevoClienteIcon').onclick = async () => { await window.mostrarFormCrud('clientes', null, ['cedula','nombre','telefono','direccion','email'], true); D.clientes = await getAll('clientes'); };
        
        document.getElementById('buscarProducto').addEventListener('input', e => buscarProductos(e.target.value));
        document.getElementById('buscarProducto').addEventListener('keydown', e => { if(e.key === 'Enter') agregarPorCodigoBarras(e.target.value.trim()); });
        if(!('ontouchstart' in window)) setTimeout(() => document.getElementById('buscarProducto')?.focus(), 300);
        document.getElementById('btnScanVentas').onclick = () => abrirEscanerCamara('buscarProducto', agregarPorCodigoBarras);
        document.getElementById('finalizarVenta').onclick = () => finalizarVenta();
        const btnCaja = document.getElementById('btnIrCaja');
        if(btnCaja) btnCaja.onclick = () => renderCaja();
        const btnTipoPago = document.getElementById('btnTipoPago');
        if(btnTipoPago) btnTipoPago.onclick = () => mostrarSelectorPago(tipoPago, v => {
            tipoPago = v;
            refrescarSelectorPago();
            pintarTipoPagoContenedores();
            guardarSesionVenta();
        });
        refrescarSelectorPago();
        pintarTipoPagoContenedores();
        if(document.getElementById('calcularCambio')) document.getElementById('calcularCambio').onclick = () => calcularCambio();
        const montoPagadoInput = document.getElementById('montoPagado');
        if(montoPagadoInput) aplicarMascaraBs(montoPagadoInput);
        renderPagosDivididosUI();
        document.getElementById('agregarPagoDividido').onclick = () => {
            pagosDivididos.push({ metodo: 'efectivo_bs', monto: 0 });
            renderPagosDivididosUI();
        };
        const credAbonoInp = document.getElementById('creditoAbonoInput');
        if(credAbonoInp){
            aplicarMascaraBs(credAbonoInp);
            credAbonoInp.addEventListener('input', () => { creditoAbono = Math.max(0, parseBs(credAbonoInp.value) || 0); actualizarResumenCredito(); guardarSesionVenta(); });
        }
        const btnCredMet = document.getElementById('btnCreditoMetodo');
        if(btnCredMet) btnCredMet.onclick = () => mostrarSelectorPago(creditoAbonoMetodo, v => {
            creditoAbonoMetodo = v;
            const icm = document.getElementById('creditoMetodoIcon');
            if(icm) icm.className = 'fas ' + iconoTipoPago(v);
            const txm = document.getElementById('creditoMetodoText');
            if(txm) txm.textContent = nombreTipoPago(v);
            actualizarResumenCredito();
            guardarSesionVenta();
        }, PAGOS_SOLO_ABONO);
        document.querySelectorAll('#creditoPlazoChips .credito-plazo-chip').forEach(ch => {
            ch.onclick = () => {
                creditoPlazoDias = parseInt(ch.dataset.plazo, 10) || 7;
                document.querySelectorAll('#creditoPlazoChips .credito-plazo-chip').forEach(c => {
                    const sel = c === ch;
                    c.style.backgroundColor = sel ? 'var(--accent,#3b82f6)' : 'rgba(0,0,0,0.04)';
                    c.style.color = sel ? '#fff' : '';
                    c.style.borderColor = sel ? 'var(--accent,#3b82f6)' : '';
                });
                actualizarResumenCredito();
                guardarSesionVenta();
            };
        });
        actualizarResumenCredito();
    }
    
    window.mostrarFormCrud = async function(store, id, campos, desdeVentas = false) {
        let items = D[store], item = id ? items.find(i => i.id === id) : null;
        let modal = document.createElement('div'); modal.className = 'modal-form';
        let nombres = { cedula:'Cédula/RIF', nombre:'Nombre', telefono:'Teléfono', direccion:'Dirección', email:'Email', rif:'RIF', contacto:'Contacto', concepto:'Concepto', montoBs:'Monto (Bs)', categoria:'Categoría', fecha:'Fecha', cargo:'Cargo', salarioBs:'Salario (Bs)', diaPago:'Día de pago (1-31)', fechaPago:'Fecha de último pago', fechaContrato:'Fecha Contrato' };
        let camposHtml = '';
        for(let i=0; i<campos.length; i++){
            let key = campos[i];
            let esFecha = (key === 'fecha' || key === 'fechaContrato' || key === 'fechaPago');
            let valor = item ? (item[key]||'') : (esFecha ? msToDateStr(Date.now()) : '');
            let tipoInput = (key === 'diaPago') ? 'number' : ((key === 'cedula' || key === 'telefono') ? 'tel' : (esFecha ? 'date' : 'text'));
            let valDisplay = (key === 'montoBs' || key === 'salarioBs') ? fmtPrecio(valor) : (esFecha ? aFechaISO(valor) : escapeHtml(valor.toString()));
            let inputmode = tipoInput === 'tel' ? 'numeric' : (key === 'montoBs' || key === 'salarioBs') ? 'decimal' : (esFecha ? 'date' : 'text');
            camposHtml += `<div class="mb-3"><label>${nombres[key]||key}</label><input type="${tipoInput}" id="field${i}" value="${valDisplay}" class="border rounded-xl p-2 w-full" inputmode="${inputmode}"></div>`;
        }
        modal.innerHTML = `<div class="modal-form-content"><h3 class="text-xl font-bold mb-4">${id ? 'Editar' : 'Nuevo'} ${store === 'clientes' ? 'Cliente' : 'Elemento'}</h3>${camposHtml}<div class="flex gap-3 mt-4"><button id="guardarCrud" class="btn-azul-redondeado btn-redondeado flex-1 py-2 font-bold">Guardar</button><button id="cancelarCrud" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        for(let i=0; i<campos.length; i++) if(campos[i] === 'montoBs' || campos[i] === 'salarioBs') aplicarMascaraBs(document.getElementById(`field${i}`));
        document.getElementById('cancelarCrud').onclick = () => modal.remove();
        document.getElementById('guardarCrud').onclick = async () => {
            const requeridos = { clientes:['nombre'], proveedores:['nombre'], gastos:['concepto'], empleados:['nombre'] };
            const titulosStore = { clientes:'Cliente', proveedores:'Proveedor', gastos:'Gasto', empleados:'Empleado' };
            let errores = [];
            for(let i=0; i<campos.length; i++){
                let val = document.getElementById(`field${i}`).value.trim();
                if((requeridos[store]||[]).includes(campos[i]) && !val) errores.push(nombres[campos[i]] || campos[i]);
                if(campos[i] === 'montoBs' && store === 'gastos' && parseBs(val) <= 0) errores.push('Monto (Bs)');
            }
            if(errores.length){
                await jamDialogo({ titulo:'Faltan datos', tipo:'error', mensaje: `No se puede guardar el ${titulosStore[store] || store}. Complete los siguientes campos:\n\n• ${errores.join('\n• ')}`, botones:[{ texto:'Entendido', valor:true, destacado:true }] });
                return;
            }
            let nuevo = { id: id || (store === 'clientes' ? 'c' : 'pr') + Date.now() + '_' + Math.random().toString(36).slice(2, 7) };
            for(let i=0; i<campos.length; i++) {
                let val = document.getElementById(`field${i}`).value.trim();
                nuevo[campos[i]] = (campos[i] === 'nombre' || campos[i] === 'concepto' || campos[i] === 'contacto' || campos[i] === 'cargo') ? capitalizeWords(val) : val;
                if(campos[i] === 'fecha' || campos[i] === 'fechaContrato' || campos[i] === 'fechaPago'){
                    let p = val.split('-').map(Number);
                    nuevo.timestamp = new Date(p[0], (p[1]||1)-1, p[2]||1).getTime();
                }
            }
            if(store === 'gastos') nuevo.montoBs = parseBs(nuevo.montoBs);
            if(store === 'empleados'){
                nuevo.salarioBs = parseBs(nuevo.salarioBs);
                const dp = parseInt(nuevo.diaPago, 10);
                nuevo.diaPago = (dp >= 1 && dp <= 31) ? dp : '';
                if(nuevo.fechaPago) { let pp = String(nuevo.fechaPago).split('-').map(Number); nuevo.fechaPagoTs = new Date(pp[0], (pp[1]||1)-1, pp[2]||1).getTime(); }
            }
            await saveItem(store, nuevo);
            modal.remove();
            if(desdeVentas && store === 'clientes') {
                D.clientes = await getAll('clientes');
                const inputCliente = document.getElementById('clienteInput');
                const hiddenId = document.getElementById('clienteIdHidden');
                if(inputCliente) {
                    inputCliente.value = `${nuevo.nombre} (${nuevo.cedula || 'Sin cédula'})`;
                    hiddenId.value = nuevo.id;
                    clienteSeleccionadoId = nuevo.id;
                    clienteInputText = inputCliente.value;
                    guardarSesionVenta();
                }
                return;
            }
            if(store === 'clientes') renderCrud('clientes','Clientes',campos);
            else if(store === 'proveedores') renderCrud('proveedores','Proveedores',campos);
            else if(store === 'gastos') renderCrud('gastos','Gastos',campos);
            else if(store === 'empleados') renderCrud('empleados','Empleados',campos);
        };
    };
    
    function buscarProductos(term){
        let sug = document.getElementById('sugerencias');
        if(term.length < 2){ sug.classList.add('hidden'); return; }
        let norm = normalizeText(term);
        let filt = D.productos.filter(p => normalizeText(p.nombre).includes(norm) || (p.marca && normalizeText(p.marca).includes(norm)) || (p.codigo && normalizeText(p.codigo).includes(norm)));
        if(!filt.length){ sug.classList.add('hidden'); return; }
        sug.innerHTML = filt.map(p => `<div class="sugerencia-item" onclick="agregarAlCarrito('${p.id}')">${escapeHtml(p.nombre)} | ${fmtPrecio(p.precioVentaBs)} Bs / $${fmtPrecio(p.precioVentaUsd)} | Stock: ${p.stock}</div>`).join('');
        sug.classList.remove('hidden');
    }
    
    function mostrarSelectorPrecio(prod, pr, cb){
        const descPct = (typeof prod.porcentajeDescuento === 'number' && prod.porcentajeDescuento > 0) ? prod.porcentajeDescuento : 0;
        let modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:340px">
            <h3 class="text-lg font-bold mb-1" style="color:var(--accent,#3b82f6)"><i class="fas fa-sack-dollar"></i> Elegir precio de venta</h3>
            <p class="text-xs mb-3 opacity-70">${escapeHtml(prod.nombre)}</p>
            <div class="flex flex-col gap-2">
                <button id="selNormal" class="btn-redondeado p-3 text-left" style="border:2px solid var(--accent,#3b82f6)">
                    <div class="font-bold">Precio normal</div>
                    <div class="text-sm">${fmtPrecio(pr.normalBs)} Bs</div>
                    <div class="text-xs opacity-60">USD $${pr.normalUsd}</div>
                </button>
                <button id="selOferta" class="btn-redondeado p-3 text-left" style="border:2px solid #10b981">
                    <div class="font-bold" style="color:#10b981"><i class="fas fa-tag"></i> Precio con descuento (-${descPct}%)</div>
                    <div class="text-sm">${fmtPrecio(pr.desc.bs)} Bs</div>
                    <div class="text-xs opacity-60">USD $${pr.desc.usd}</div>
                </button>
            </div>
            <button id="cancelarPrecio" class="w-full mt-3 py-2 rounded-xl bg-gray-200">Cancelar</button>
        </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#selNormal').onclick = () => { modal.remove(); cb({ bs: pr.normalBs, usd: pr.normalUsd }, false); };
        modal.querySelector('#selOferta').onclick = () => { modal.remove(); cb({ bs: pr.desc.bs, usd: pr.desc.usd }, true); };
        modal.querySelector('#cancelarPrecio').onclick = () => modal.remove();
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
    }
    let _ultimoToqueAdd = null;
    function proteccionDobleToque(id){ const a = Date.now(); if(_ultimoToqueAdd && _ultimoToqueAdd[0] === id && a - _ultimoToqueAdd[1] < 600) return false; _ultimoToqueAdd = [id, a]; return true; }
    function agregarProductoAlCarrito(prod){
        if(!proteccionDobleToque(prod.id)) return false;
        let ex = carrito.find(c => c.id === prod.id);
        let enCarrito = ex ? ex.cantidad : 0;
        if(prod.stock <= 0) { mostrarNotificacion(`⚠️ "${escapeHtml(prod.nombre)}" está agotado`, 'error'); return false; }
        if(enCarrito + 1 > prod.stock) { mostrarNotificacion(`⚠️ Solo hay ${prod.stock} de "${escapeHtml(prod.nombre)}" en stock`, 'error'); return false; }
        const confirmar = (precio, oferta) => {
            if(ex) ex.cantidad++;
            else {
                let item = Object.assign({}, prod, { cantidad: 1, precioUsadoBs: precio.bs, precioUsadoUsd: precio.usd, precioOferta: oferta });
                carrito.push(item);
            }
            actualizarCarritoUI();
            guardarSesionVenta();
            return true;
        };
        const pr = preciosProducto(prod);
        if(pr.tieneDesc){
            mostrarSelectorPrecio(prod, pr, confirmar);
        } else {
            return confirmar({ bs: pr.normalBs, usd: pr.normalUsd }, false);
        }
        return true;
    }
    window.agregarAlCarrito = id => {
        let prod = D.productos.find(p => p.id === id);
        if(!prod) return;
        agregarProductoAlCarrito(prod);
        let bp = document.getElementById('buscarProducto');
        if(bp){ bp.value = ''; document.getElementById('sugerencias')?.classList.add('hidden'); }
        guardarSesionVenta();
    };
    
    // ==================== CÓDIGO DE BARRAS ====================
    window.agregarPorCodigoBarras = codigo => {
        if(!codigo) return;
        let prod = D.productos.find(p => p.codigo && normalizeText(p.codigo.toString()) === normalizeText(codigo));
        if(!prod) { mostrarNotificacion(`❌ Producto con código "${escapeHtml(codigo)}" no encontrado`, 'error'); return; }
        const ok = agregarProductoAlCarrito(prod);
        document.getElementById('buscarProducto').value = '';
        let sug = document.getElementById('sugerencias'); if(sug) sug.classList.add('hidden');
        guardarSesionVenta();
        if(ok) mostrarNotificacion(`✅ Agregado: ${escapeHtml(prod.nombre)}`, 'success');
    };
    window.buscarPorCodigoInventario = codigo => {
        if(!codigo) return;
        let prod = D.productos.find(p => p.codigo && normalizeText(p.codigo.toString()) === normalizeText(codigo));
        if(!prod) { mostrarNotificacion(`❌ Producto con código "${escapeHtml(codigo)}" no encontrado`, 'error'); return; }
        document.getElementById('searchInv').value = normalizeText(prod.nombre).slice(0,30);
        renderListaProductos(normalizeText(prod.nombre).slice(0,30));
        setTimeout(() => { let cards = document.querySelectorAll('.product-card'); if(cards.length > 0) cards[0].scrollIntoView({behavior:'smooth', block:'center'}); }, 100);
    };
    function detenerScanner(escaneo, stream) {
        if(escaneo) { clearInterval(escaneo); }
        if(window.Quagga && typeof Quagga.stop === 'function') { try { Quagga.stop(); } catch(e) {} }
        if(stream) { stream.getTracks().forEach(t => t.stop()); }
    }
    window.abrirEscanerCamara = (inputId, callback) => {
        let modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:500px"><h3 class="text-xl font-bold mb-3"><i class="fas fa-camera"></i> Escanear código de barras</h3><div id="scannerContainer" style="width:100%;border-radius:12px;overflow:hidden;background:#000;max-height:300px"></div><div id="scannerResult" class="text-center mt-2 text-sm font-bold" style="color:var(--accent,#3b82f6)">Esperando código...</div><div class="flex gap-3 mt-3"><button id="btnStopScan" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        function limpiarYCerrar() { detenerScanner(escaneo, stream); modal.remove(); }
        let escaneo = null, stream = null;

        if('BarcodeDetector' in window) {
            let video = document.createElement('video');
            video.id = 'scannerVideo'; video.autoplay = true; video.playsInline = true;
            video.style.cssText = 'width:100%;border-radius:12px;background:#000;max-height:300px';
            document.getElementById('scannerContainer').appendChild(video);
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
                stream = s; video.srcObject = s;
                const detector = new BarcodeDetector({ formats: ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e','codabar','itf','data_matrix','pdf417'] });
                escaneo = setInterval(async () => {
                    try {
                        let codigos = await detector.detect(video);
                        if(codigos.length > 0){
                            clearInterval(escaneo); escaneo = null;
                            stream.getTracks().forEach(t => t.stop()); stream = null;
                            modal.remove();
                            let inp = document.getElementById(inputId); if(inp) inp.value = codigos[0].rawValue;
                            if(callback) callback(codigos[0].rawValue);
                        }
                    } catch(e) {}
                }, 500);
            }).catch(() => { mostrarNotificacion('📷 No se pudo acceder a la cámara', 'error'); modal.remove(); });
        } else if(window.Quagga) {
            Quagga.init({
                inputStream: { name: 'Live', type: 'LiveStream', target: document.querySelector('#scannerContainer'),
                    constraints: { width: 640, height: 480, facingMode: 'environment' } },
                decoder: { readers: ['ean_reader','ean_8_reader','code_128_reader','code_39_reader','upc_reader','upc_e_reader','codabar_reader','i2of5_reader','pdf417_reader'] }
            }, err => {
                if(err) { mostrarNotificacion('📷 Error al iniciar escáner: ' + (err.message||err), 'error'); modal.remove(); return; }
                Quagga.start();
                Quagga.onDetected(data => {
                    let cod = data.codeResult.code;
                    Quagga.offDetected();
                    try { Quagga.stop(); } catch(e) {}
                    modal.remove();
                    let inp = document.getElementById(inputId); if(inp) inp.value = cod;
                    if(callback) callback(cod);
                });
            });
        } else {
            mostrarNotificacion('📷 Escáner por cámara no disponible. Instale Quagga o use Chrome/Edge.', 'error');
            modal.remove(); return;
        }
        document.getElementById('btnStopScan').onclick = limpiarYCerrar;
        modal.onclick = e => { if(e.target === modal) limpiarYCerrar(); };
    };
    
    function abrirEditorCantidad(i) {
        const it = carrito[i];
        if(!it) return;
        const stock = it.stock || 999;
        let modal = document.createElement('div');
        modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:300px">
            <h3 class="text-lg font-bold mb-1" style="color:var(--accent,#3b82f6)"><i class="fas fa-boxes-stacked"></i> Cantidad</h3>
            <p class="text-sm mb-3 opacity-70">${escapeHtml(it.nombre)}</p>
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:12px">
                <button id="edQtyMinus" class="btn-redondeado" style="width:48px;height:48px;font-size:24px;display:flex;align-items:center;justify-content:center">−</button>
                <input id="edQtyInput" type="number" min="1" max="${stock}" value="${it.cantidad}" style="width:70px;text-align:center;font-size:24px;font-weight:bold;border:2px solid var(--accent,#3b82f6);border-radius:12px;padding:6px">
                <button id="edQtyPlus" class="btn-redondeado" style="width:48px;height:48px;font-size:24px;display:flex;align-items:center;justify-content:center">+</button>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:8px;justify-content:center">
                ${[1,2,3,5,10].map(n => `<button class="edQtyQuick btn-redondeado" data-val="${n}" style="padding:6px 14px;font-size:13px;${n===it.cantidad?'background:var(--accent,#3b82f6);color:#fff':''}">${n}</button>`).join('')}
            </div>
            <p class="text-xs text-center opacity-50 mb-3">Stock disponible: ${stock}</p>
            <div style="display:flex;gap:8px">
                <button id="edQtyDelete" class="btn-redondeado" style="flex:1;padding:10px;background:#ef4444;color:#fff"><i class="fas fa-trash"></i> Eliminar</button>
                <button id="edQtyConfirm" class="btn-redondeado" style="flex:1;padding:10px;background:var(--accent,#3b82f6);color:#fff">✓ Listo</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
        const inp = modal.querySelector('#edQtyInput');
        const setVal = v => { inp.value = Math.max(1, Math.min(stock, v)); modal.querySelectorAll('.edQtyQuick').forEach(b => b.style.background = parseInt(b.dataset.val)===parseInt(inp.value) ? 'var(--accent,#3b82f6)' : ''); modal.querySelectorAll('.edQtyQuick').forEach(b => b.style.color = parseInt(b.dataset.val)===parseInt(inp.value) ? '#fff' : ''); };
        modal.querySelector('#edQtyMinus').onclick = () => setVal(parseInt(inp.value) - 1);
        modal.querySelector('#edQtyPlus').onclick = () => setVal(parseInt(inp.value) + 1);
        modal.querySelectorAll('.edQtyQuick').forEach(b => b.onclick = () => setVal(parseInt(b.dataset.val)));
        inp.addEventListener('input', () => setVal(parseInt(inp.value) || 1));
        modal.querySelector('#edQtyDelete').onclick = () => { carrito.splice(i, 1); actualizarCarritoUI(); guardarSesionVenta(); modal.remove(); };
        modal.querySelector('#edQtyConfirm').onclick = () => {
            const nv = parseInt(inp.value) || 1;
            if(nv <= 0) { carrito.splice(i, 1); }
            else { it.cantidad = nv; }
            actualizarCarritoUI(); guardarSesionVenta(); modal.remove();
        };
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
    }
    window.abrirEditorCantidad = abrirEditorCantidad;
    
    function actualizarCarritoUI(){
        let cont = document.getElementById('carritoLista'), sub = document.getElementById('subtotal'), tot = document.getElementById('total'), ivaSpan = document.getElementById('iva');
        if(!cont) return;
        if(carrito.length === 0){
            cont.innerHTML = '<div class="text-center py-2">Vacío</div>';
            if(sub) sub.innerText = '0,00 Bs';
            if(tot) tot.innerText = '0,00 Bs';
            if(ivaSpan) ivaSpan.innerText = '0,00 Bs';
            totalVenta = 0;
            return;
        }
        let suma = 0, html = '';
        carrito.forEach((it,i) => {
            let precioU = (it.precioUsadoBs != null && it.precioUsadoBs > 0) ? it.precioUsadoBs : it.precioVentaBs;
            let subit = precioU * it.cantidad;
            suma += subit;
            html += `<div class="carrito-item" data-i="${i}" style="position:relative;overflow:hidden;cursor:pointer"><div style="position:absolute;left:0;top:0;bottom:0;width:0;background:var(--accent,#3b82f6);opacity:0.15;transition:width 2s linear" class="lp-bar"></div><div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:8px" class="text-sm py-1"><div style="flex:1;min-width:0;text-align:left">${escapeHtml(it.nombre)} x${it.cantidad}${it.precioOferta ? ' <span class="text-xs" style="color:#10b981">(Oferta)</span>' : ''}</div><div style="flex-shrink:0;text-align:right;white-space:nowrap">${fmtPrecio(subit)} Bs <button onclick="event.stopPropagation();eliminarDelCarrito(${i})" class="text-red-500 ml-2"><i class="fas fa-trash"></i></button></div></div></div>`;
        });
        cont.innerHTML = html;
        cont.querySelectorAll('.carrito-item').forEach(el => {
            let timer = null, idx = parseInt(el.dataset.i), bar = el.querySelector('.lp-bar');
            const start = () => { bar.style.width = '100%'; timer = setTimeout(() => { bar.style.width = '0'; abrirEditorCantidad(idx); }, 2000); };
            const cancel = () => { clearTimeout(timer); bar.style.width = '0'; };
            el.addEventListener('touchstart', start, { passive: true });
            el.addEventListener('touchend', cancel, { passive: true });
            el.addEventListener('touchmove', cancel, { passive: true });
            el.addEventListener('mousedown', start);
            el.addEventListener('mouseup', cancel);
            el.addEventListener('mouseleave', cancel);
        });
        let pctIva = D.config.ivaPorcentaje / 100;
        let iva = D.config.ivaActivo ? suma * pctIva : 0, total = suma + iva;
        sub.innerText = `${fmtPrecio(suma)} Bs`;
        if(ivaSpan) ivaSpan.innerText = `${fmtPrecio(iva)} Bs`;
            if(tot) tot.innerText = `${fmtPrecio(total)} Bs`;
        totalVenta = total;
        if(document.getElementById('creditoContainer') && document.getElementById('creditoContainer').style.display === 'block') actualizarResumenCredito();
        window.eliminarDelCarrito = i => { carrito.splice(i,1); actualizarCarritoUI(); guardarSesionVenta(); };
    }
    
    function renderPagosDivididosUI(){
        let cont = document.getElementById('pagosDivididosLista');
        if(!cont) return;
        let suma = 0;
        cont.innerHTML = pagosDivididos.map((p,i) => {
            suma += parseFloat(p.monto) || 0;
            return `<div class="split-payment-row">
                <button type="button" class="split-metodo-btn" onclick="abrirSelectorSplit(${i})"><i class="fas ${iconoTipoPago(p.metodo)} split-metodo-ic" style="color:var(--accent,#3b82f6)"></i><span class="split-metodo-txt">${nombreTipoPago(p.metodo)}</span><span class="split-metodo-caret" aria-hidden="true">&#9662;</span></button>
                <input type="text" inputmode="decimal" data-i="${i}" value="${fmtPrecio(p.monto||0)}" placeholder="Monto Bs">
                ${pagosDivididos.length > 1 ? `<button class="remove-split" onclick="eliminarSplit(${i})"><i class="fas fa-times"></i></button>` : ''}
            </div>`;
        }).join('');
        cont.querySelectorAll('input[data-i]').forEach(inp => { aplicarMascaraBs(inp); inp.addEventListener('input', () => cambiarMontoSplit(parseInt(inp.dataset.i,10), inp.dataset.bsDig || '0')); });
        let totalPagos = suma;
        actualizarSplitStatus(totalPagos);
    }
    function actualizarSplitStatus(totalPagos){
        let status = document.getElementById('splitTotalStatus');
        if(!status) return;
        let diff = totalPagos - totalVenta;
        if(Math.abs(diff) < 0.01) status.className = 'split-total-match ok';
        else status.className = 'split-total-match err';
        status.innerHTML = `Total asignado: ${fmtPrecio(totalPagos)} Bs ${Math.abs(diff) < 0.01 ? '<i class="fas fa-circle-check"></i>' : `(faltan ${fmtPrecio(Math.abs(diff))} Bs)`}`;
    }
    window.cambiarMetodoSplit = (i, v) => { pagosDivididos[i].metodo = v; actualizarSplitStatus(pagosDivididos.reduce((s,p)=>s+(parseFloat(p.monto)||0),0)); };
    window.abrirSelectorSplit = (i) => { mostrarSelectorPago(pagosDivididos[i].metodo, v => { pagosDivididos[i].metodo = v; renderPagosDivididosUI(); }, PAGOS_SOLO_SPLIT); };
    window.cambiarMontoSplit = (i, v) => { pagosDivididos[i].monto = (parseInt(String(v||'0').replace(/\D/g,''),10)||0) / 100; actualizarSplitStatus(pagosDivididos.reduce((s,p)=>s+(parseFloat(p.monto)||0),0)); };
    window.eliminarSplit = (i) => { if(pagosDivididos.length > 1) { pagosDivididos.splice(i,1); renderPagosDivididosUI(); } };
    
    function calcularCambio(){
        let pagado = parseBs(document.getElementById('montoPagado')?.value || '0');
        let cambio = document.getElementById('cambioMensaje');
        if(!isNaN(pagado) && pagado >= totalVenta) cambio.innerHTML = `Cambio: ${fmtPrecio(pagado - totalVenta)} Bs`;
        else cambio.innerHTML = 'Monto insuficiente';
    }
    
    async function finalizarVenta(){
        if(carrito.length === 0) { alert("Carrito vacío"); return; }
        let confirmMsg = `¿Desea finalizar la venta por ${fmtPrecio(totalVenta)} Bs?`;
        if(tipoPago === 'credito'){
            const abonoPb = Math.max(0, Math.round((parseBs(document.getElementById('creditoAbonoInput')?.value) || 0) * 100) / 100);
            if(abonoPb > 0 && abonoPb < totalVenta - 0.01) confirmMsg += `\nAbono ahora: ${fmtPrecio(abonoPb)} Bs · Crédito restante: ${fmtPrecio(Math.max(0, totalVenta - abonoPb))} Bs · Plazo: ${creditoPlazoDias} días`;
        }
        if(!(await jamConfirm(confirmMsg))) return;
        let pagado = totalVenta, detallePagos = null, esCredito = false, pagoUsd = 0, cambioUsd = 0;
        let creditoRestante = 0, abonoMetodoUsado = 'efectivo_bs';
        if(tipoPago === 'efectivo_bs') {
            pagado = parseBs(document.getElementById('montoPagado')?.value);
            if(isNaN(pagado) || pagado < totalVenta) { alert("Monto insuficiente"); return; }
        } else if(tipoPago === 'pago_dividido') {
            pagado = pagosDivididos.reduce((s,p) => s + (parseFloat(p.monto) || 0), 0);
            if(pagado < totalVenta - 0.01) { alert(`Monto insuficiente. Asignó ${fmtPrecio(pagado)} Bs, necesita ${fmtPrecio(totalVenta)} Bs`); return; }
            detallePagos = pagosDivididos.map(p => ({ ...p }));
        } else if(tipoPago === 'dolares') {
            const rate = parseFloat(D.config.dolarRate) || 0;
            if(!(rate > 0)) { await jamAlert('No hay tasa activa para cobrar en dólares. Usa efectivo (Bs) o actualiza la tasa.', 'error'); return; }
            const usdRaw = parseFloat((await jamPrompt(`Monto recibido en USD (1 USD = ${fmtDolar(rate)} Bs):`, '', '0.00') || '').replace(',', '.'));
            if(!(usdRaw > 0)) return;
            pagado = Math.round(Math.round(usdRaw * 100) / 100 * rate * 100) / 100;
            pagoUsd = Math.round(usdRaw * 100) / 100;
            if(pagado < totalVenta - 0.01) { await jamAlert(`El monto en USD no cubre el total (equivalen a ${fmtPrecio(pagado)} Bs).`, 'error'); return; }
            cambioUsd = Math.round(((pagado - totalVenta) / rate) * 100) / 100;
        } else if(tipoPago === 'credito') {
            const cliCred = clienteSeleccionadoId ? D.clientes.find(c => c.id === clienteSeleccionadoId) : null;
            if(!cliCred){ await jamAlert('❌ La venta a CRÉDITO no se puede hacer a "Cliente General". Debe seleccionar un cliente registrado (búscalo arriba y elígelo de la lista).', 'error'); return; }
            // Crédito: el cliente debe tener TODOS sus datos completos; si faltan, la venta no se realiza.
            const FALTAN_CREDITO = { nombre:'Nombre', cedula:'Cédula/RIF', telefono:'Teléfono', direccion:'Dirección' };
            const faltanCred = Object.keys(FALTAN_CREDITO).filter(f => !(cliCred[f] && String(cliCred[f]).trim()));
            if(faltanCred.length){
                await jamAlert(`❌ La venta a CRÉDITO requiere un cliente con todos sus datos. Faltan: ${faltanCred.map(f => FALTAN_CREDITO[f]).join(', ')}.\n\nComplete los datos de "${escapeHtml(cliCred.nombre)}" desde el módulo Clientes y vuelva a intentar.`, 'error');
                return;
            }
            abonoMetodoUsado = (PAGOS_SOLO_ABONO.includes(creditoAbonoMetodo)) ? creditoAbonoMetodo : 'efectivo_bs';
            const abonoCr = Math.max(0, Math.round((parseBs(document.getElementById('creditoAbonoInput')?.value) || 0) * 100) / 100);
            if(abonoCr > totalVenta + 0.01) { await jamAlert(`El abono (${fmtPrecio(abonoCr)} Bs) no puede superar el total (${fmtPrecio(totalVenta)} Bs)`, 'error'); return; }
            const restanteCr = Math.max(0, Math.round((totalVenta - abonoCr) * 100) / 100);
            if(restanteCr > 0){
                // Abono (pago parcial) hoy + el restante queda a crédito con plazo acordado.
                esCredito = true;
                pagado = abonoCr;
                creditoRestante = restanteCr;
                creditoAbono = abonoCr;
            } else {
                // El cliente pagó todo con el abono: venta normal con el método elegido.
                pagado = totalVenta;
                tipoPago = abonoMetodoUsado;
                esCredito = false;
            }
        }
        for(let it of carrito){
            let prod = D.productos.find(p => p.id === it.id);
            if(!prod || prod.stock < it.cantidad) { alert(`Stock insuficiente para ${it.nombre}`); return; }
        }
        for(let it of carrito){
            let prod = D.productos.find(p => p.id === it.id);
            prod.stock -= it.cantidad;
            await saveItem('productos', prod);
            let idx = D.productos.findIndex(p => p.id === it.id);
            if(idx !== -1) D.productos[idx].stock = prod.stock;
        }
        verificarStockBajo();
        let ahora = new Date();
        let codigo = `${ahora.getFullYear()}${(ahora.getMonth()+1).toString().padStart(2,'0')}${ahora.getDate().toString().padStart(2,'0')}-${ahora.getHours().toString().padStart(2,'0')}${ahora.getMinutes().toString().padStart(2,'0')}${ahora.getSeconds().toString().padStart(2,'0')}${ahora.getMilliseconds().toString().padStart(3,'0')}`;
        let clienteId = document.getElementById('clienteIdHidden')?.value || null;
        let clienteNombre = "Cliente General";
        if(clienteId) {
            let clienteEncontrado = D.clientes.find(c => c.id === clienteId);
            if(clienteEncontrado) clienteNombre = clienteEncontrado.nombre;
        } else {
            let nombreIngresado = document.getElementById('clienteInput')?.value.trim();
            if(nombreIngresado) clienteNombre = nombreIngresado;
        }
        
    let itemsVenta = carrito.map(i => {
        const precioU = (i.precioUsadoBs != null && i.precioUsadoBs > 0) ? i.precioUsadoBs : i.precioVentaBs;
        const precioUsd = (i.precioUsadoUsd != null && i.precioUsadoUsd > 0) ? i.precioUsadoUsd : i.precioVentaUsd;
        const costoUsd = parseFloat(i.costoRealUsd) || 0;
        const descProv = (typeof i.descuentoProveedor === 'number' && i.descuentoProveedor > 0) ? i.descuentoProveedor : 0;
        const costoNetoUsdCalc = (typeof i.costoNetoUsd === 'number' && i.costoNetoUsd > 0) ? i.costoNetoUsd : (descProv > 0 ? Math.round(costoUsd * (1 - descProv / 100) * 100) / 100 : costoUsd);
        const costoBsActual = (!(D.config.dolarRate > 0)) ? (i.costoNetoBs || i.costoRealBs || 0) : (costoNetoUsdCalc > 0 ? Math.round(costoNetoUsdCalc * D.config.dolarRate * 100) / 100 : (i.costoNetoBs || i.costoRealBs || 0));
        return { idProducto: i.id, nombre: i.nombre, cantidad: i.cantidad, precioUnitario: precioU, precioUsd: precioUsd, costoUnitario: costoBsActual, subtotal: precioU * i.cantidad, ganancia: (precioU - costoBsActual) * i.cantidad, precioOferta: !!i.precioOferta };
    });
        let subtotalVenta = itemsVenta.reduce((s,i) => s + i.subtotal, 0);
        let ivaVenta = D.config.ivaActivo ? subtotalVenta * (D.config.ivaPorcentaje / 100) : 0;
        let gananciaTotal = itemsVenta.reduce((s,i) => s + i.ganancia, 0);
        let nuevaVenta = { 
            id: codigo, 
            fecha: ahora.toLocaleString(), 
            timestamp: ahora.getTime(), 
            cliente: clienteNombre,
            clienteId: clienteId,
            items: itemsVenta, 
            subtotal: subtotalVenta, 
            iva: ivaVenta, 
            total: totalVenta, 
            gananciaTotal: gananciaTotal, 
            dolarRate: D.config.dolarRate || 0,
            ivaPorcentaje: D.config.ivaPorcentaje,
            pago: pagado, 
            cambio: esCredito ? 0 : pagado - totalVenta, 
            pagoUsd: pagoUsd || undefined,
            cambioUsd: esCredito ? 0 : cambioUsd || undefined,
            tipoPago: tipoPago,
            credito: esCredito,
            creditoRestante: esCredito ? creditoRestante : undefined,
            creditoPlazoDias: esCredito ? creditoPlazoDias : undefined,
            creditoFechaLimite: esCredito ? Date.now() + creditoPlazoDias * 86400000 : undefined,
            abonoMetodo: esCredito ? abonoMetodoUsado : undefined,
            detallePagos: detallePagos
        };
        await saveItem('ventas', nuevaVenta);
        if(esCredito && clienteId){
            const cli = D.clientes.find(c => c.id === clienteId);
            if(cli){
                // El restante (no el total) queda como adeudo del cliente.
                cli.adeudo = Math.round(((parseFloat(cli.adeudo) || 0) + creditoRestante) * 100) / 100;
                // El abono inicial queda registrado en la cartera del cliente (historial + cobrado).
                if(pagado > 0){
                    cli.abonos = cli.abonos || [];
                    cli.abonos.push({ fecha: msToDateStr(Date.now()), monto: Math.round(pagado * 100) / 100, metodo: abonoMetodoUsado, nota: 'Abono inicial de la venta ' + nuevaVenta.id, timestamp: Date.now() });
                }
                await saveItem('clientes', cli);
                D.clientes = await getAll('clientes');
            }
        }
        mostrarNotificacionNativa('Venta registrada', `${clienteNombre} — ${fmtPrecio(totalVenta)} Bs`, 'venta');
        mostrarTicket(nuevaVenta, true);
        carrito = [];
        clienteSeleccionadoId = null;
        clienteInputText = '';
        tipoPago = 'pago_movil';
        creditoAbono = 0;
        pagosDivididos = [{ metodo: 'efectivo_bs', monto: 0 }];
        guardarSesionVenta();
        const montoPagadoEl = document.getElementById('montoPagado');
        if(montoPagadoEl) montoPagadoEl.value = '';
        const credAbonoReset = document.getElementById('creditoAbonoInput');
        if(credAbonoReset) credAbonoReset.value = '';
        const cambioMsg = document.getElementById('cambioMensaje');
        if(cambioMsg) cambioMsg.innerHTML = '';
        if(document.getElementById('clienteInput')) document.getElementById('clienteInput').value = '';
        if(document.getElementById('clienteIdHidden')) document.getElementById('clienteIdHidden').value = '';
        sincronizarUIVenta();
        actualizarCarritoUI();
    }
    
    // ==================== TICKET ====================
    function esPagoEfectivo(venta){
        if(!venta) return false;
        if(venta.tipoPago === 'efectivo_bs' || venta.tipoPago === 'dolares') return true;
        if(venta.tipoPago === 'pago_dividido' && Array.isArray(venta.detallePagos) && venta.detallePagos.length){
            return venta.detallePagos.every(d => d.metodo === 'efectivo_bs' || d.metodo === 'dolares');
        }
        return false;
    }
    function textoFechaVenta(venta){
        if(!venta) return '';
        if(venta.timestamp && !isNaN(new Date(venta.timestamp).getTime())) return new Date(venta.timestamp).toLocaleString();
        let f = String(venta.fecha || '').trim();
        if(!f) return '';
        let iso = f.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{1,2}))?/);
        if(iso){
            let d = new Date(+iso[1], +iso[2]-1, +iso[3], +(iso[4]||0), +(iso[5]||0));
            if(!isNaN(d.getTime())) return d.toLocaleString();
        }
        let m = f.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})(?:[ ,]+(\d{1,2}):(\d{1,2}))?/);
        if(m){
            let aa = m[3].length === 2 ? '20' + m[3] : m[3];
            let d = new Date(+aa, +m[2]-1, +m[1], +(m[4]||0), +(m[5]||0));
            if(!isNaN(d.getTime())) return d.toLocaleString();
        }
        let d2 = new Date(f);
        if(!isNaN(d2.getTime())) return d2.toLocaleString();
        return f;
    }
    function imprimirTicket(venta) {
        // 42 columnas = estandar 80mm; cambiar a 32 si es ticketera 58mm
        const W = 42;
        const formasPago = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MOVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DEBITO','dolares':'DOLARES','pago_dividido':'PAGO DIVIDIDO','credito':'CREDITO' };
        const etiqMetodo = {'efectivo_bs':'Efectivo Bs','dolares':'Dolares','tarjeta_debito':'Tjta Debito','transferencia':'Transferencia','pago_movil':'Pago Movil'};
        const rep = (c, n) => { let r = ''; for (let i=0; i<n; i++) r += c; return r; };
        const padR = (s, n) => { s = String(s); return s.length >= n ? s.slice(0,n) : s + rep(' ', n - s.length); };
        const padL = (s, n) => { s = String(s); return s.length >= n ? s.slice(-n) : rep(' ', n - s.length) + s; };
        const cen = (s) => { s = String(s); let p = Math.max(0, W - s.length); return rep(' ', Math.floor(p/2)) + s + rep(' ', Math.ceil(p/2)); };
        const eq  = rep('=', W);
        const gui = rep('-', W);
        const esc = (v) => v ? String(v).replace(/[<>&"']/g, '') : '';
        let t = '';
        // Header centrado (como ticket virtual)
        t += cen(D.config.empresa.nombre.toUpperCase()) + '\n';
        if (D.config.empresa.direccion) t += cen(esc(D.config.empresa.direccion)) + '\n';
        if (D.config.empresa.telefono) t += cen('TEL: ' + esc(D.config.empresa.telefono)) + '\n';
        if (D.config.empresa.rif) t += cen('RIF: ' + esc(D.config.empresa.rif)) + '\n';
        t += eq + '\n';
        t += cen(textoFechaVenta(venta)) + '\n';
        t += cen('Ticket: ' + venta.id) + '\n';
        t += 'Cliente: ' + esc(venta.cliente) + (venta.clienteId ? (() => { const _cl = D.clientes.find(c => c.id === venta.clienteId); return _cl && _cl.cedula ? ' (' + esc(_cl.cedula) + ')' : ''; })() : '') + '\n';
        t += eq + '\n';
        // Items: nombre a izq, precio a der
        venta.items.forEach(item => {
            let nom = item.cantidad + 'x ' + esc(item.nombre) + (item.precioOferta ? ' (OFERTA)' : '');
            let pre = fmtPrecio(item.subtotal) + ' Bs';
            t += padR(nom, W - 10) + padL(pre, 10) + '\n';
        });
        t += gui + '\n';
        t += padR('SUBTOTAL', W - 10) + padL(fmtPrecio(venta.subtotal) + ' Bs', 10) + '\n';
        if (venta.iva) t += padR('IVA (' + (venta.ivaPorcentaje != null ? venta.ivaPorcentaje : D.config.ivaPorcentaje) + '%)', W - 10) + padL(fmtPrecio(venta.iva) + ' Bs', 10) + '\n';
        t += padR('TOTAL', W - 10) + padL(fmtPrecio(venta.total) + ' Bs', 10) + '\n';
        t += gui + '\n';
        if (venta.credito) {
            const crPago = venta.pago || 0;
            const crRest = (venta.creditoRestante != null) ? venta.creditoRestante : (venta.total || 0);
            if (crPago > 0) {
                t += padR('ABONO', W - 10) + padL(fmtPrecio(crPago) + ' Bs', 10) + '\n';
                t += cen('ABONADO EL: ' + textoFechaLimite(venta.timestamp || venta.fecha)) + '\n';
            }
            t += padR('PENDIENTE', W - 10) + padL(fmtPrecio(crRest) + ' Bs', 10) + '\n';
            if (venta.creditoPlazoDias) t += padR('PLAZO', W - 10) + padL(String(venta.creditoPlazoDias) + ' DIAS', 10) + '\n';
            if (venta.creditoFechaLimite) t += cen('PAGAR ANTES DEL: ' + textoFechaLimite(venta.creditoFechaLimite)) + '\n';
        } else {
            t += padR('PAGO', W - 10) + padL(fmtPrecio(venta.pago) + ' Bs', 10) + '\n';
            if (esPagoEfectivo(venta)) t += padR('CAMBIO', W - 10) + padL(fmtPrecio(venta.cambio) + ' Bs', 10) + '\n';
        }
        if (venta.detallePagos) {
            t += padR('FORMA DE PAGO:', W - 10) + padL('DIVIDIDO', 10) + '\n';
            venta.detallePagos.forEach(d => {
                t += '  ' + padR(etiqMetodo[d.metodo]||d.metodo, W - 22) + padL(fmtPrecio(d.monto)+' Bs', 10) + '\n';
            });
        } else {
            t += padR('FORMA DE PAGO:', W - 10) + padL(formasPago[venta.tipoPago]||venta.tipoPago, 10) + '\n';
        }
        t += eq + '\n';
        t += cen('Este documento no constituye') + '\n';
        t += cen('factura fiscal') + '\n';
        t += cen('GRACIAS POR SU COMPRA!') + '\n';
        t += cen(D.config.empresa.nombre) + '\n';
        // Abrir ventana para impresion con estilo minimo
        let v = window.open('', '_blank', 'width=380,height=600');
        if(!v) { mostrarNotificacion('Permite ventanas emergentes para imprimir', 'error'); return; }
        v.document.write(
            '<html><head><meta charset="UTF-8"><title>Ticket</title>' +
            '<style>' +
            'body{font-family:"Courier New",monospace;font-size:11px;line-height:1.3;margin:0;padding:8px;white-space:pre;color:#000;background:#fff}' +
            '@media print{@page{margin:0}body{padding:0}}' +
            '</style></head><body>' + t.replace(/\n/g, '<br>') +
            '</body></html>'
        );
        v.document.close();
        setTimeout(() => { try { v.focus(); v.print(); } catch(e){} }, 500);
    }
    
    function generarTicketHTML(venta, mostrarTasa = false) {
        const formasPago = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MÓVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DÉBITO','dolares':'DÓLARES','pago_dividido':'PAGO DIVIDIDO','credito':'CRÉDITO' };
        const itemsHtml = venta.items.map(item => `<div class="item"><span>${item.cantidad}x ${escapeHtml(item.nombre)}${item.precioOferta ? ' <span style="color:#10b981;font-size:9px">(OFERTA)</span>' : ''}</span><span>${fmtPrecio(item.subtotal)} Bs</span></div>`).join('');
        const logoHtml = D.config.empresa.logo ? `<div class="logo"><img src="${escapeHtml(D.config.empresa.logo)}" style="max-width:60px; max-height:60px;"></div>` : '';
        let formaPagoHtml = `<div class="ticket-line"><span>FORMA DE PAGO</span><span>${formasPago[venta.tipoPago] || venta.tipoPago}</span></div>`;
        if(venta.detallePagos){
            let etiqMetodo = {'efectivo_bs':'Efectivo Bs','dolares':'Dólares','tarjeta_debito':'Tarjeta Débito','transferencia':'Transferencia','pago_movil':'Pago Móvil'};
            let detalleHtml = venta.detallePagos.map(d => `<div class="ticket-line" style="font-size:9px"><span>${etiqMetodo[d.metodo]||d.metodo}</span><span>${fmtPrecio(d.monto)} Bs</span></div>`).join('');
            formaPagoHtml = `<div class="ticket-line" style="font-weight:bold"><span>FORMA DE PAGO</span><span>PAGO DIVIDIDO</span></div>${detalleHtml}`;
        }
        let lineaPago = '';
        if (venta.credito) {
            const crPago = venta.pago || 0;
            const crRest = (venta.creditoRestante != null) ? venta.creditoRestante : (venta.total || 0);
            if (crPago > 0) {
                lineaPago += `<div class="ticket-line"><span>ABONO</span><span>${fmtPrecio(crPago)} Bs</span></div>`;
                lineaPago += `<div class="ticket-line" style="font-size:9px"><span>ABONADO EL</span><span>${textoFechaLimite(venta.timestamp || venta.fecha)}</span></div>`;
            }
            lineaPago += `<div class="ticket-line"><span>PENDIENTE (CRÉDITO)</span><span>${fmtPrecio(crRest)} Bs</span></div>`;
            if (venta.creditoPlazoDias) lineaPago += `<div class="ticket-line"><span>PLAZO</span><span>${venta.creditoPlazoDias} días</span></div>`;
            if (venta.creditoFechaLimite) lineaPago += `<div class="ticket-line" style="font-weight:bold;color:#ef4444"><span>PAGAR ANTES DEL</span><span>${textoFechaLimite(venta.creditoFechaLimite)}</span></div>`;
        } else {
            lineaPago = `<div class="ticket-line"><span>PAGO</span><span>${fmtPrecio(venta.pago)} Bs</span></div>${esPagoEfectivo(venta) ? `<div class="ticket-line"><span>CAMBIO</span><span>${fmtPrecio(venta.cambio)} Bs</span></div>` : ''}`;
        }
        return `<div class="ticket-virtual" id="ticketParaImprimir">${logoHtml}<div class="header"><h3>${escapeHtml(D.config.empresa.nombre)}</h3>${D.config.empresa.direccion ? `<p>${escapeHtml(D.config.empresa.direccion)}</p>` : ''}${D.config.empresa.telefono ? `<p><i class="fas fa-phone"></i> ${escapeHtml(D.config.empresa.telefono)}</p>` : ''}${D.config.empresa.rif ? `<p>RIF: ${escapeHtml(D.config.empresa.rif)}</p>` : ''}<p>${textoFechaVenta(venta)}</p>${mostrarTasa && venta.dolarRate ? `<p>Tasa: 1 USD = ${fmtDolar(venta.dolarRate)} Bs</p>` : ''}<p>Ticket: ${venta.id}</p><p>Cliente: ${escapeHtml(venta.cliente)}${venta.clienteId ? (() => { const _cl = D.clientes.find(c => c.id === venta.clienteId); return _cl && _cl.cedula ? ` (${escapeHtml(_cl.cedula)})` : ''; })() : ''}</p></div><div class="items">${itemsHtml}</div><div class="ticket-line"><span>SUBTOTAL</span><span>${fmtPrecio(venta.subtotal)} Bs</span></div>${venta.iva ? `<div class="ticket-line"><span>IVA (${venta.ivaPorcentaje != null ? venta.ivaPorcentaje : D.config.ivaPorcentaje}%)</span><span>${fmtPrecio(venta.iva)} Bs</span></div>` : ''}<div class="ticket-line total"><span>TOTAL</span><span>${fmtPrecio(venta.total)} Bs</span></div>${lineaPago}${formaPagoHtml}<div class="footer"><p style="font-size:9px;opacity:0.6;margin-top:8px">Este documento no constituye factura fiscal</p><p>¡Gracias por su compra!</p><p>${D.config.empresa.nombre}</p></div></div>`;
    }
    function mostrarTicket(venta, mostrarTasa = false) {
        const modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:350px; text-align:center;">${generarTicketHTML(venta, mostrarTasa)}<div class="ticket-buttons"><button class="ticket-btn btn-print" onclick="window.imprimirTicketDirecto('${venta.id}')"><i class="fas fa-print"></i> Imprimir</button><button class="ticket-btn btn-wa" onclick="window.enviarTicketPorWhatsApp('${venta.id}')"><i class="fab fa-whatsapp"></i> WhatsApp</button><button class="ticket-btn btn-img" onclick="window.descargarTicketImagen()"><i class="fas fa-download"></i> Imagen</button><button class="ticket-btn btn-copy" onclick="window.copiarTicketTexto()"><i class="fas fa-copy"></i> Copiar</button>${!venta.anulada ? `<button class="ticket-btn btn-anular" onclick="window.anularVenta('${venta.id}')"><i class="fas fa-ban"></i> Anular</button>` : ''}<button class="ticket-btn btn-cerrar" onclick="window.cerrarTicketModalYVolverInicio()"><i class="fas fa-times"></i> Cerrar</button></div></div>`;
        document.body.appendChild(modal);
        window.ticketActual = venta;
        window.modalTicketActual = modal;
        modal.onclick = e => { if(e.target === modal) window.cerrarTicketModalYVolverInicio(); };
    }
    
    window.cerrarTicketModalYVolverInicio = () => { if(window.modalTicketActual) { window.modalTicketActual.remove(); window.modalTicketActual = null; } };
    // ==================== ANULACIÓN DE VENTA ====================
    // Repone el stock vendido, descuenta la deuda registrada (si la venta fue a
    // crédito) y elimina la venta del registro para que ya no compute en
    // reportes, ganancias ni caja.
    window.anularVenta = async (ventaId) => {
        const venta = D.ventas.find(v => v.id === ventaId);
        if(!venta) { mostrarNotificacion('Venta no encontrada', 'error'); return; }
        if(venta.anulada) { mostrarNotificacion('Esta venta ya fue anulada', 'info'); return; }
        const ok = await jamConfirm(`¿ANULAR la venta ${venta.id} por ${fmtPrecio(venta.total)} Bs?\n\nSe devolverá el stock de los artículos y la venta dejará de contar en reportes y caja.`);
        if(!ok) return;
        try {
            const productos = await getAll('productos');
            for(const it of (venta.items || [])){
                let prod = productos.find(p => p.id === it.idProducto);
                if(prod){
                    prod.stock = (parseInt(prod.stock) || 0) + (parseInt(it.cantidad) || 0);
                    await saveItem('productos', prod);
                }
            }
            if(venta.credito && venta.clienteId){
                const clientes = await getAll('clientes');
                const cli = clientes.find(c => c.id === venta.clienteId);
                if(cli){
                    const pendCredito = (D.ventas || []).filter(v => v.credito && !v.anulada && v.id !== ventaId && v.clienteId === venta.clienteId).reduce((s,v) => s + (parseFloat(v.total) || 0), 0);
                    const abonado = (cli.abonos || []).reduce((s,a) => s + (parseFloat(a.monto) || 0), 0);
                    cli.adeudo = Math.max(0, Math.round((pendCredito - abonado) * 100) / 100);
                    await saveItem('clientes', cli);
                }
            }
            venta.anulada = true;
            venta.anuladaEn = Date.now();
            D.ventas = (D.ventas || []).filter(v => v.id !== ventaId);
            await saveToIDB('ventas', D.ventas);
            if(window.modalTicketActual) { window.modalTicketActual.remove(); window.modalTicketActual = null; }
            mostrarNotificacion('🗑️ Venta anulada: stock repuesto', 'success');
        } catch(err) { console.error('ERROR ANULAR VENTA:', err); await jamAlert('Error al anular: ' + err.message, 'error'); }
    };
    
    // ==================== CIERRE DE CAJA ====================
    // Página sub-módulo (opción "Caja" en el encabezado de Ventas: Ventas / Caja). Permite
    // apertura con fondo inicial, arqueo por método de pago (efectivo/dólares/
    // tarjeta/transferencia/pago móvil) y cierre de turno. Persiste en
    // localStorage 'jam_pos_caja' (sobrevive reinicios).
    const CAJA_KEY = 'jam_pos_caja';
    const METODOS_CAJA = ['efectivo_bs','dolares','tarjeta_debito','transferencia','pago_movil'];
    const ETIQUETAS_CAJA = {'efectivo_bs':'<i class="fas fa-money-bill-wave"></i> Efectivo Bs','dolares':'<i class="fas fa-money-bill-wave"></i> Dólares (Bs)','tarjeta_debito':'<i class="fas fa-credit-card"></i> Tarjeta Débito','transferencia':'<i class="fas fa-building-columns"></i> Transferencia','pago_movil':'<i class="fas fa-mobile-screen-button"></i> Pago Móvil'};
    // Filtro ACTIVO del historial de cierres (registro diario consultable: hoy/ayer/
    // últimos 7 días/este mes/mes pasado/día exacto/todo). Persiste mientras la app está abierta.
    let filtroCaja = { modo: 'hoy', fecha: null };
    function cargarCaja(){ const d = loadFromStorage(CAJA_KEY, null); if(d && typeof d === 'object') return d; return { abierta: null, cierres: [], ultimoArqueo: null }; }
    function guardarCaja(c){ saveToStorage(CAJA_KEY, c); }
    // Suma por método de pago. Sin rango: SOLO ventas/abonos de HOY (compatibilidad).
    // Con rango [desde,hasta] en ms: suma los del TURNO (apertura → cierre), que es lo
    // coherente con el arqueo: en la caja SOLO puede haber fondo inicial + lo cobrado
    // mientras estuvo abierta (ni ventas hechas con la caja cerrada ni de otro día).
    function ventasEsperadasCaja(ventas, desde, hasta){
        const hoy = msToDateStr(Date.now());
        const enRango = typeof desde === 'number';
        const ok = ft => enRango ? (ft >= desde && ft <= hasta) : (msToDateStr(ft) === hoy);
        const out = { efectivo_bs:0, dolares:0, tarjeta_debito:0, transferencia:0, pago_movil:0 };
        ventas.forEach(x => {
            if(x.anulada) return;
            const ft = x.timestamp || new Date(x.fecha).getTime();
            if(!ok(ft)) return;
            if(x.detallePagos && x.detallePagos.length){ x.detallePagos.forEach(d => { const k = d.metodo; if(out[k] !== undefined) out[k] += Number(d.monto) || 0; }); }
            else { const k = x.tipoPago; if(out[k] !== undefined) out[k] += Number(x.total) || 0; }
        });
        (D.clientes || []).forEach(c => { (c.abonos || []).forEach(a => { const ft = a.timestamp ? a.timestamp : (a.fecha ? new Date(a.fecha).getTime() : 0); if(ft && ok(ft) && parseFloat(a.monto) > 0){ const k = a.metodo; if(out[k] !== undefined) out[k] += Number(a.monto) || 0; } }); });
        return out;
    }
    function formatoCajaContado(c){ const r = {}; METODOS_CAJA.forEach(m => { r[m] = (c && typeof c[m] === 'number') ? c[m] : 0; }); return r; }
    async function renderCaja(){
        currentSub = 'caja';
        const bloqueado = volverBloqueado, accent = D.config.theme;
        const ventas = await getAll('ventas');
        const caja = cargarCaja();
        // ---- Registro diario de cierres: filtro, tarjeta (apertura+cierre) y popup solo lectura ----
        function predicadoFiltroCaja(){
            const hoy = msToDateStr(Date.now());
            const d0 = new Date(); d0.setHours(0,0,0,0);
            const ayer = msToDateStr(d0.getTime() - 86400000);
            const d7 = msToDateStr(d0.getTime() - 6*86400000);
            const mIni = msToDateStr(new Date(d0.getFullYear(), d0.getMonth(), 1).getTime());
            const pmIni = msToDateStr(new Date(d0.getFullYear(), d0.getMonth()-1, 1).getTime());
            const pmFin = msToDateStr(new Date(d0.getFullYear(), d0.getMonth(), 0).getTime());
            const f = filtroCaja;
            return c => {
                const fc = c.fecha || '';
                if(f.modo === 'hoy') return fc === hoy;
                if(f.modo === 'ayer') return fc === ayer;
                if(f.modo === 'semana') return fc >= d7 && fc <= hoy;
                if(f.modo === 'mes') return fc >= mIni && fc <= hoy;
                if(f.modo === 'mespasado') return fc >= pmIni && fc <= pmFin;
                if(f.modo === 'dia') return !!f.fecha && fc === f.fecha;
                return true;
            };
        }
        function cierreCardHTML(c, i, accent){
            const dif = Math.round((Number(c.difTotal)||0)*100)/100;
            const difcol = Math.abs(dif) < 0.005 ? '#10b981' : (dif > 0 ? '#3b82f6' : '#ef4444');
            return `<div class="client-card" style="padding:8px 10px;margin-bottom:6px;cursor:pointer" title="Ver arqueo del cierre" onclick="verDetalleCierre(${i})">
                <div class="flex justify-between items-center gap-2"><span class="font-bold text-sm" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><i class="fas fa-lock"></i> Cierre ${escapeHtml(c.fecha||'')} ${escapeHtml(c.hora||'')}</span><span class="text-xs font-bold" style="color:${difcol};white-space:nowrap">${fmtPrecio(dif)} Bs</span></div>
                <div class="text-xs mt-1 flex flex-wrap gap-x-3 gap-y-0.5"><span><i class="fas fa-lock-open"></i> Apertura: ${c.aperturaFecha ? escapeHtml(c.aperturaFecha)+' '+escapeHtml(c.aperturaHora||'') : '—'}</span><span><i class="fas fa-lock"></i> Cierre: ${escapeHtml(c.fecha||'')} ${escapeHtml(c.hora||'')}</span></div>
                <div class="text-xs mt-1 opacity-70"><i class="fas fa-coins"></i> Fondo ${fmtPrecio(c.aperturaBs||0)} Bs · Esperado ${fmtPrecio(c.totalEsperado||0)} · Contado ${fmtPrecio(c.totalContado||0)} · ${c.nVentas||0} venta(s)</div>
                <div class="text-xs mt-1" style="color:${accent}"><i class="fas fa-eye"></i> Ver arqueo del cierre</div>
            </div>`;
        }
        function seccionHistorialCaja(accent, caja){
            const arr = caja.cierres || [];
            const pred = predicadoFiltroCaja();
            const items = arr.map((c,i)=>({c,i})).filter(o => pred(o.c)).reverse();
            const chips = [['hoy','Hoy'],['ayer','Ayer'],['semana','7 días'],['mes','Este mes'],['mespasado','Mes pasado'],['todo','Todo']].map(([m,lab]) => {
                const on = filtroCaja.modo === m;
                return `<button type="button" data-filtro="${m}" style="padding:4px 10px;border-radius:999px;border:1.5px solid ${accent};background:${on ? accent : 'transparent'};color:${on ? '#fff' : accent};font-size:.7rem;font-weight:600;cursor:pointer">${lab}</button>`;
            }).join('');
            return `<div class="config-section">
                <div class="config-section-title" style="font-size:.75rem;font-weight:700;opacity:.6;margin-bottom:8px"><i class="fas fa-clock"></i> Historial de cierres <span class="text-xs opacity-50">(${arr.length} cierre(s))</span></div>
                <p class="text-xs opacity-70 mb-2">Registro diario consultable. Toca cualquier cierre para ver su arqueo completo (solo lectura).</p>
                <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px">${chips}<input type="date" id="filtroFechaCaja" aria-label="Día exacto" style="font-size:.7rem;padding:3px 8px;border:1.5px solid ${accent};border-radius:999px;background:transparent;color:${accent}" value="${filtroCaja.modo === 'dia' ? (filtroCaja.fecha||'') : ''}"></div>
                <div id="listaCierres">${items.length ? items.map(x => cierreCardHTML(x.c, x.i, accent)).join('') : '<p class="text-xs opacity-60">Sin cierres registrados para este filtro</p>'}</div>
            </div>`;
        }
        document.getElementById('appRoot').innerHTML = `
            <div class="page-header-fixed"><div class="module-header"><div class="flex items-center" style="min-width:0"><span class="module-crumb" onclick="navigateTo('ventas')" title="Ir a Ventas">Ventas</span><span class="module-crumb-sep">/</span><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Caja')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Cierre</h2></div><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div>
            <div class="page-container">
                ${!caja.abierta ? `
                <div class="config-section" style="margin-bottom:16px">
                    <div class="config-section-title" style="font-size:.75rem;font-weight:700;opacity:.6;margin-bottom:8px"><i class="fas fa-lock-open"></i> Apertura de caja</div>
                    <p class="text-xs opacity-70 mb-2">Registra el fondo inicial en efectivo que queda en caja al iniciar el turno (puede ser 0).</p>
                    <div class="mb-2"><label class="opacity-70">Fondo inicial (Bs)</label><input type="text" id="cajaAperturaBs" inputmode="decimal" value="0" class="border rounded-xl p-2 w-full"></div>
                    <button id="btnAbrirCaja" class="btn-azul-redondeado btn-redondeado w-full py-2"><i class="fas fa-lock-open"></i> Abrir caja</button>
                </div>` : `
                <div class="config-section" style="margin-bottom:16px">
                    <div class="config-section-title" style="font-size:.75rem;font-weight:700;opacity:.6;margin-bottom:8px"><i class="fas fa-circle" style="color:#22c55e"></i> Caja abierta</div>
                    <div class="card-bcv" style="padding:10px"><div class="flex justify-between"><span class="text-xs opacity-70">Abierta desde</span><span class="text-xs font-bold">${escapeHtml(caja.abierta.fecha || '')} ${escapeHtml(caja.abierta.hora || '')}</span></div><div class="flex justify-between mt-1"><span class="text-xs opacity-70">Fondo inicial</span><span class="text-xs font-bold">${fmtPrecio(caja.abierta.aperturaBs||0)} Bs</span></div></div>
                </div>
                <div class="config-section" style="margin-bottom:16px">
                    <div class="config-section-title" style="font-size:.75rem;font-weight:700;opacity:.6;margin-bottom:8px"><i class="fas fa-chart-column"></i> Ventas del turno por forma de pago (esperado)</div>
                    <div id="esperadoCaja"></div>
                </div>
                <div class="config-section" style="margin-bottom:16px">
                    <div class="config-section-title" style="font-size:.75rem;font-weight:700;opacity:.6;margin-bottom:8px"><i class="fas fa-calculator"></i> Arqueo de caja</div>
                    <p class="text-xs opacity-70 mb-2">Escribe el monto CONTADO en cada método (en Bs). El efectivo debe incluir el fondo inicial.</p>
                    ${METODOS_CAJA.map((m,i) => `<div class="flex items-center justify-between gap-2 mb-2"><label class="text-xs opacity-80 flex-1">${ETIQUETAS_CAJA[m]}</label><input type="text" inputmode="decimal" id="contado_${m}" data-metodo="${m}" class="border rounded-xl p-2 text-right" style="width:150px"></div>`).join('')}
                    <button id="btnAutoArqueo" class="btn-redondeado py-2 px-4 w-full mb-2" style="border:1.5px solid ${accent};color:${accent}">↺ Llenar con lo esperado</button>
                    <button id="btnArqueo" class="btn-redondeado py-2 px-4 w-full mb-2" style="border:1.5px solid #3b82f6;color:#3b82f6"><i class="fas fa-floppy-disk"></i> Guardar arqueo (sin cerrar)</button>
                    <button id="btnCerrarCaja" class="btn-azul-redondeado btn-redondeado w-full py-2" style="background:#dc2626"><i class="fas fa-lock"></i> Cerrar caja</button>
                    <div id="resumenArqueo" class="text-xs mt-2"></div>
                </div>`}
                ${seccionHistorialCaja(accent, caja)}
            </div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        // ---- Filtros del historial (registro diario consultable) ----
        const pintarHistorial = () => {
            const cajaH = cargarCaja();
            const pred = predicadoFiltroCaja();
            const items = (cajaH.cierres || []).map((c,i)=>({c,i})).filter(o => pred(o.c)).reverse();
            document.querySelectorAll('#appRoot [data-filtro]').forEach(b => {
                const on = b.getAttribute('data-filtro') === filtroCaja.modo;
                b.style.background = on ? accent : 'transparent';
                b.style.color = on ? '#fff' : accent;
            });
            const fi = document.getElementById('filtroFechaCaja');
            if(fi){ if(filtroCaja.modo === 'dia') fi.value = filtroCaja.fecha || ''; else fi.value = ''; }
            const el = document.getElementById('listaCierres');
            if(el) el.innerHTML = items.length ? items.map(x => cierreCardHTML(x.c, x.i, accent)).join('') : '<p class="text-xs opacity-60">Sin cierres registrados para este filtro</p>';
        };
        document.querySelectorAll('#appRoot [data-filtro]').forEach(b => {
            b.onclick = () => { filtroCaja = { modo: b.getAttribute('data-filtro'), fecha: null }; pintarHistorial(); };
        });
        const fiC = document.getElementById('filtroFechaCaja');
        if(fiC) fiC.onchange = () => { filtroCaja = { modo: 'dia', fecha: fiC.value || null }; pintarHistorial(); };
        if(!caja.abierta){
            aplicarMascaraBs(document.getElementById('cajaAperturaBs'));
            document.getElementById('btnAbrirCaja').onclick = () => {
                const monto = parseBs(document.getElementById('cajaAperturaBs').value);
                const ahora = new Date();
                caja.abierta = { fecha: msToDateStr(ahora.getTime()), hora: ahora.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), aperturaBs: Math.round(monto*100)/100, timestamp: ahora.getTime() };
                guardarCaja(caja);
                renderCaja();
            };
            return;
        }
        // Esperado del TURNO (apertura → ahora), no "de hoy": lo único coherente con lo que
        // hay físicamente en caja = fondo inicial + lo cobrado mientras estuvo abierta.
        const desdeTurno = caja.abierta.timestamp || new Date(caja.abierta.fecha + 'T00:00:00').getTime();
        const hastaTurno = Date.now();
        const esperado = ventasEsperadasCaja(ventas, desdeTurno, hastaTurno);
        const esperadoEfect = esperado.efectivo_bs + (Number(caja.abierta.aperturaBs)||0);
        document.getElementById('esperadoCaja').innerHTML = `
            <div class="grid grid-cols-2 gap-2">
                <div class="card-bcv" style="padding:8px;text-align:center"><div class="font-black" style="color:${accent}">${fmtPrecio(esperadoEfect)}</div><div class="text-[10px] opacity-70">Efectivo Bs (+ fondo ${fmtPrecio(caja.abierta.aperturaBs||0)})</div></div>
                <div class="card-bcv" style="padding:8px;text-align:center"><div class="font-black" style="color:#f59e0b">${fmtPrecio(esperado.dolares)}</div><div class="text-[10px] opacity-70">Dólares (Bs)</div></div>
                <div class="card-bcv" style="padding:8px;text-align:center"><div class="font-black" style="color:#8b5cf6">${fmtPrecio(esperado.tarjeta_debito)}</div><div class="text-[10px] opacity-70">Tarjeta Débito</div></div>
                <div class="card-bcv" style="padding:8px;text-align:center"><div class="font-black" style="color:#0ea5e9">${fmtPrecio(esperado.transferencia)}</div><div class="text-[10px] opacity-70">Transferencia</div></div>
                <div class="card-bcv" style="padding:8px;text-align:center"><div class="font-black" style="color:#10b981">${fmtPrecio(esperado.pago_movil)}</div><div class="text-[10px] opacity-70">Pago Móvil</div></div>
            </div>`;
        const resetContado = (valores) => {
            METODOS_CAJA.forEach(m => {
                const inp = document.getElementById('contado_' + m);
                if(inp){ inp.dataset.bsDig = valores && valores[m] > 0 ? String(Math.round(valores[m]*100)).slice(0,14) : ''; inp.dataset.bsReiniciar = '1'; sincronizarBs(inp); }
            });
        };
        METODOS_CAJA.forEach(m => aplicarMascaraBs(document.getElementById('contado_' + m)));
        const leerContado = () => {
            const c = formatoCajaContado({});
            METODOS_CAJA.forEach(m => { const inp = document.getElementById('contado_' + m); c[m] = inp ? parseBs(inp.value) : 0; });
            return c;
        };
        const pintarResumen = () => {
            const contado = leerContado();
            const esperados = Object.assign({}, esperado);
            esperados.efectivo_bs = esperadoEfect;
            let totalEsperado = 0, totalContado = 0;
            const filas = METODOS_CAJA.map(m => {
                const e = esperados[m] || 0, cc = contado[m] || 0;
                totalEsperado += e; totalContado += cc;
                const dif = Math.round((cc - e)*100)/100;
                const col = Math.abs(dif) < 0.005 ? '#10b981' : (dif > 0 ? '#3b82f6' : '#ef4444');
                return `<div class="flex justify-between py-1" style="border-bottom:1px solid rgba(128,128,128,.1)"><span>${ETIQUETAS_CAJA[m]}</span><span>${fmtPrecio(e)} → ${fmtPrecio(cc)} <b style="color:${col}">(${fmtPrecio(dif)})</b></span></div>`;
            }).join('');
            const difTotal = Math.round((totalContado - totalEsperado)*100)/100;
            document.getElementById('resumenArqueo').innerHTML = filas + `<div class="flex justify-between mt-2 font-bold"><span>Esperado ${fmtPrecio(totalEsperado)} · Contado ${fmtPrecio(totalContado)}</span><span style="color:${Math.abs(difTotal)<0.005?'#10b981':(difTotal>0?'#3b82f6':'#ef4444')}">Dif ${fmtPrecio(difTotal)} Bs</span></div>`;
            return { contado, totalEsperado, totalContado, difTotal };
        };
        METODOS_CAJA.forEach(m => { const inp = document.getElementById('contado_' + m); if(inp) inp.addEventListener('input', () => pintarResumen()); });
        if(caja.ultimoArqueo) resetContado(caja.ultimoArqueo);
        pintarResumen();
        document.getElementById('btnAutoArqueo').onclick = () => { resetContado(esperadosConApertura()); pintarResumen(); };
        function esperadosConApertura(){ const e = Object.assign({}, esperado); e.efectivo_bs = esperadoEfect; return e; }
        document.getElementById('btnArqueo').onclick = () => {
            const { contado } = pintarResumen();
            caja.ultimoArqueo = contado;
            guardarCaja(caja);
            mostrarNotificacion('💾 Arqueo guardado (caja sigue abierta)', 'success');
        };
        document.getElementById('btnCerrarCaja').onclick = async () => {
            const { contado, totalEsperado, totalContado, difTotal } = pintarResumen();
            const ok = await jamConfirm(`¿CERRAR caja?\n\nApertura: ${caja.abierta.fecha} ${caja.abierta.hora}\nEsperado: ${fmtPrecio(totalEsperado)} Bs\nContado: ${fmtPrecio(totalContado)} Bs\nDiferencia: ${fmtPrecio(difTotal)} Bs\n\nEl cierre quedará en el historial (registro diario).`);
            if(!ok) return;
            const ahora = new Date();
            const desdeCierre = caja.abierta.timestamp || new Date(caja.abierta.fecha + 'T00:00:00').getTime();
            const hastaCierre = ahora.getTime();
            caja.cierres.push({
                id: 'cj_' + hastaCierre,
                fecha: msToDateStr(hastaCierre),
                hora: ahora.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
                timestamp: hastaCierre,
                aperturaFecha: caja.abierta.fecha,
                aperturaHora: caja.abierta.hora,
                aperturaTimestamp: caja.abierta.timestamp || null,
                aperturaBs: caja.abierta.aperturaBs||0,
                esperadoMetodo: esperadosConApertura(), // esperado del turno por método (con fondo en efectivo)
                porMetodo: contado,                     // contado real por método
                totalEsperado: Math.round(totalEsperado*100)/100,
                totalContado: Math.round(totalContado*100)/100,
                difTotal: Math.round(difTotal*100)/100,
                nVentas: ventas.filter(v => !v.anulada && (v.timestamp || new Date(v.fecha).getTime()) >= desdeCierre && (v.timestamp || new Date(v.fecha).getTime()) <= hastaCierre).length
            });
            caja.abierta = null;
            caja.ultimoArqueo = null;
            guardarCaja(caja);
            mostrarNotificacion('🔒 Caja cerrada correctamente', 'success');
            renderCaja();
        };
        inyectarBotonAyudaModulo();
    }
    // Popup SOLO LECTURA con el arqueo completo de un cierre guardado (registro diario).
    // No tiene ningún botón de edición: solo el ✕ para cerrar, para que jamás se modifique.
    window.verDetalleCierre = (i) => {
        const caja = cargarCaja();
        const c = (caja.cierres || [])[i];
        if(!c) { mostrarNotificacion('Registro de cierre no encontrado', 'error'); return; }
        document.querySelectorAll('.kpi-popup-overlay').forEach(e => e.remove());
        const accent = D.config.theme;
        const overlay = document.createElement('div');
        overlay.className = 'kpi-popup-overlay';
        overlay.onclick = e => { if(e.target === overlay) overlay.remove(); };
        const popup = document.createElement('div');
        popup.className = 'kpi-popup';
        popup.style.maxWidth = '430px';
        popup.style.maxHeight = '92vh';
        popup.style.overflowY = 'auto';
        const dif = Math.round((Number(c.difTotal)||0)*100)/100;
        const difcol = Math.abs(dif) < 0.005 ? '#10b981' : (dif > 0 ? '#3b82f6' : '#ef4444');
        const filas = METODOS_CAJA.map(m => {
            const e = (c.esperadoMetodo && typeof c.esperadoMetodo[m] === 'number') ? c.esperadoMetodo[m] : null;
            const cc = (c.porMetodo && typeof c.porMetodo[m] === 'number') ? c.porMetodo[m] : 0;
            const difm = e === null ? null : Math.round((cc - e)*100)/100;
            const dmcol = difm === null ? '' : (Math.abs(difm) < 0.005 ? '#10b981' : (difm > 0 ? '#3b82f6' : '#ef4444'));
            return `<div class="flex justify-between items-center py-1 gap-2" style="border-bottom:1px solid rgba(128,128,128,.12);font-size:.7rem">
                <span>${ETIQUETAS_CAJA[m]}</span>
                <span class="text-right" style="white-space:nowrap">${e === null ? `Contado <b>${fmtPrecio(cc)}</b>` : `${fmtPrecio(e)} → <b>${fmtPrecio(cc)}</b> <b style="color:${dmcol}">(${fmtPrecio(difm)})</b>`} Bs</span>
            </div>`;
        }).join('');
        popup.innerHTML = `
            <div class="kpi-popup-titulo" style="color:${accent}"><i class="fas fa-cash-register"></i> Arqueo — cierre ${escapeHtml(c.fecha||'')} ${escapeHtml(c.hora||'')} <button class="kpi-popup-cerrar" onclick="this.closest('.kpi-popup-overlay').remove()">✕</button></div>
            <div class="kpi-popup-grid">
                <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-lock-open"></i></div><div class="kpi-popup-val" style="font-size:.68rem">${escapeHtml(c.aperturaFecha||'—')} ${escapeHtml(c.aperturaHora||'')}</div><div class="kpi-popup-lbl">Apertura</div></div>
                <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-lock"></i></div><div class="kpi-popup-val" style="font-size:.68rem">${escapeHtml(c.fecha||'—')} ${escapeHtml(c.hora||'')}</div><div class="kpi-popup-lbl">Cierre</div></div>
                <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-coins"></i></div><div class="kpi-popup-val">${fmtPrecio(c.aperturaBs||0)}</div><div class="kpi-popup-lbl">Fondo Bs</div></div>
                <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-receipt"></i></div><div class="kpi-popup-val">${c.nVentas||0}</div><div class="kpi-popup-lbl">Ventas</div></div>
                <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-calculator"></i></div><div class="kpi-popup-val">${fmtPrecio(c.totalEsperado||0)}</div><div class="kpi-popup-lbl">Esperado Bs</div></div>
                <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-hand-holding-dollar"></i></div><div class="kpi-popup-val" style="color:${difcol};font-weight:700">${fmtPrecio(dif)}</div><div class="kpi-popup-lbl">Diferencia Bs</div></div>
            </div>
            <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(128,128,128,.15)">
                <div class="text-xs font-bold" style="margin-bottom:4px"><i class="fas fa-chart-column"></i> Detalle por método (esperado → contado · diferencia)</div>
                ${filas}
            </div>
            <div class="kpi-popup-totales"><span>Esperado: <b>${fmtPrecio(c.totalEsperado||0)} Bs</b></span><span>Contado: <b>${fmtPrecio(c.totalContado||0)} Bs</b></span><span>Diferencia: <b style="color:${difcol}">${fmtPrecio(dif)} Bs</b></span></div>`;
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
    };
    window.imprimirTicketDirecto = (ventaId) => {
        const venta = D.ventas.find(v => v.id === ventaId);
        if(!venta) return;
        if (window.AndroidBridge && typeof AndroidBridge.printTicket === 'function') {
            const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="style.css"><style>html,body{margin:0;padding:0;background:#fff}@media print{@page{margin:8px}body{padding:0}.ticket-buttons{display:none!important}}</style></head><body>' + generarTicketHTML(venta) + '</body></html>';
            try { AndroidBridge.printTicket(html, 'Ticket ' + venta.id); }
            catch(e) { imprimirTicket(venta); }
        } else {
            imprimirTicket(venta);
        }
    };
    window.enviarTicketPorWhatsApp = async (ventaId) => {
        const venta = D.ventas.find(v => v.id === ventaId);
        if(!venta) return;
        const formasPago = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MÓVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DÉBITO','dolares':'DÓLARES','pago_dividido':'PAGO DIVIDIDO','credito':'CRÉDITO' };
        const etiqMetodo = {'efectivo_bs':'Efectivo Bs','dolares':'Dólares','tarjeta_debito':'Tarjeta Débito','transferencia':'Transferencia','pago_movil':'Pago Móvil'};
        let mensaje = `🏪 *${D.config.empresa.nombre}* 🏪\n`;
        if(D.config.empresa.direccion) mensaje += `📍 ${D.config.empresa.direccion}\n`;
        if(D.config.empresa.telefono) mensaje += `📞 ${D.config.empresa.telefono}\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━\n📅 ${textoFechaVenta(venta)}\n🧾 *${venta.id}*\n👤 Cliente: ${venta.cliente}\n━━━━━━━━━━━━━━━━━━━━\n`;
        venta.items.forEach(item => { mensaje += `${item.cantidad}x ${item.nombre} → ${fmtPrecio(item.subtotal)} Bs\n`; });
        mensaje += `━━━━━━━━━━━━━━━━━━━━\n💰 *SUBTOTAL:* ${fmtPrecio(venta.subtotal)} Bs\n`;
        if(venta.iva) mensaje += `📊 *IVA:* ${fmtPrecio(venta.iva)} Bs\n`;
        if (venta.credito) {
            const crPago = venta.pago || 0;
            const crRest = (venta.creditoRestante != null) ? venta.creditoRestante : (venta.total || 0);
            mensaje += `💵 *TOTAL:* ${fmtPrecio(venta.total)} Bs\n`;
            if (crPago > 0) {
                mensaje += `💸 *ABONO:* ${fmtPrecio(crPago)} Bs\n`;
                mensaje += `🗓️ *ABONADO EL:* ${textoFechaLimite(venta.timestamp || venta.fecha)}\n`;
            }
            mensaje += `⏳ *PENDIENTE:* ${fmtPrecio(crRest)} Bs\n`;
            if (venta.creditoPlazoDias) mensaje += `📅 *PLAZO:* ${venta.creditoPlazoDias} días\n`;
            if (venta.creditoFechaLimite) mensaje += `⏰ *PAGAR ANTES DEL:* ${textoFechaLimite(venta.creditoFechaLimite)}\n`;
        } else {
            mensaje += `💵 *TOTAL:* ${fmtPrecio(venta.total)} Bs\n💸 *PAGO:* ${fmtPrecio(venta.pago)} Bs\n${esPagoEfectivo(venta) ? `🔄 *CAMBIO:* ${fmtPrecio(venta.cambio)} Bs\n` : ''}`;
        }
        if(venta.detallePagos) {
            venta.detallePagos.forEach(d => { mensaje += `└ ${etiqMetodo[d.metodo]||d.metodo}: ${fmtPrecio(d.monto)} Bs\n`; });
        } else {
            mensaje += `💳 *FORMA DE PAGO:* ${formasPago[venta.tipoPago] || venta.tipoPago}\n`;
        }
        mensaje += `━━━━━━━━━━━━━━━━━━━━\n🙏 ¡Gracias por su compra!\n${D.config.empresa.nombre}`;
        try { await navigator.clipboard.writeText(mensaje); mostrarNotificacion('📋 Ticket copiado al portapapeles', 'success'); } catch(e) {}
        // APK: copiar la IMAGEN del ticket al portapapeles y abrir WhatsApp,
        // para que el usuario elija el contacto y pegue la imagen. (Solo en la
        // APK; la web mantiene el flujo con número + wa.me)
        if (typeof window !== 'undefined' && window.AndroidBridge && typeof AndroidBridge.copiarImagenWhatsApp === 'function') {
            try {
                const canvas = await capturarTicketImagen();
                if (canvas) {
                    const dataUrl = canvas.toDataURL('image/png');
                    const base64 = dataUrl.split(',')[1];
                    AndroidBridge.copiarImagenWhatsApp(base64);
                } else {
                    if (typeof AndroidBridge.copiarPortapapeles === 'function') AndroidBridge.copiarPortapapeles(mensaje);
                    AndroidBridge.abrirWhatsApp();
                }
            } catch(e) { console.error('whatsapp imagen nativo', e); }
            return;
        }
        const telefono = await jamPrompt("📱 Ingrese el número de teléfono (ej: 584121234567):");
        if(telefono) {
            let numeroLimpio = telefono.replace(/[^0-9]/g, '');
            if(numeroLimpio.startsWith('0')) numeroLimpio = '58' + numeroLimpio.substring(1);
            if(!numeroLimpio.startsWith('58')) numeroLimpio = '58' + numeroLimpio;
            window.open(`https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
        }
    };
    async function capturarTicketImagen() {
        const ticket = document.getElementById('ticketParaImprimir');
        if(!ticket) return null;
        try {
            return await html2canvas(ticket, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        } catch(e) {
            const logo = ticket.querySelector('.logo');
            const oculto = logo ? logo.style.display : null;
            if (logo) logo.style.display = 'none';
            try {
                return await html2canvas(ticket, { scale: 2, backgroundColor: '#ffffff' });
            } finally {
                if (logo) logo.style.display = oculto || '';
            }
        }
    }

    function autoGuardarTicketLocal(nombre, dataUrl) {
        try {
            const venta = window.ticketActual;
            if (!venta) return;
            const registro = {
                id: venta.id || ('ticket_' + Date.now()),
                nombre: nombre,
                fecha: venta.fecha || new Date().toISOString(),
                timestamp: Date.now(),
                total: venta.total,
                cliente: venta.cliente || 'Sin cliente',
                items: (venta.items || []).length,
                dataUrl: dataUrl
            };
            D.tickets = D.tickets || [];
            D.tickets.push(registro);
            saveToIDB('tickets', D.tickets).catch(() => {});
        } catch(e) { console.warn('[TICKET] Error guardando ticket local', e); }
    }

    window.descargarTicketImagen = async () => {
        const ticket = document.getElementById('ticketParaImprimir');
        if(!ticket) return;
        try {
            const canvas = await capturarTicketImagen();
            if(!canvas) throw new Error('canvas vacío');
            const ahora = new Date();
            const pad = n => String(n).padStart(2, '0');
            const nombre = `${ahora.getFullYear()}-${pad(ahora.getMonth()+1)}-${pad(ahora.getDate())}_${pad(ahora.getHours())}-${pad(ahora.getMinutes())}-${pad(ahora.getSeconds())}.png`;
            const dataUrl = canvas.toDataURL('image/png');
            // 1) App nativa (APK): guardar directo en /JAM POS/TICKETS/
            if (window.AndroidBridge && typeof AndroidBridge.guardarArchivoDirecto === 'function') {
                try {
                    const base64 = dataUrl.split(',')[1];
                    const res = AndroidBridge.guardarArchivoDirecto('TICKETS/' + nombre, base64);
                    if (res && res.startsWith('ok')) {
                        mostrarNotificacion('✅ Ticket guardado en /JAM POS/TICKETS/' + nombre, 'success');
                        autoGuardarTicketLocal(nombre, dataUrl);
                        return;
                    }
                } catch(e) {}
            }
            // 2) Web Share API (navegador moderno)
            if (navigator.canShare && window.File && typeof canvas.toBlob === 'function') {
                try {
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                    const file = new File([blob], nombre, { type: 'image/png' });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: 'Factura JAM POS' });
                        return;
                    }
                } catch(e) {}
            }
            // 3) Fallback: descarga normal del navegador
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                const link = document.createElement('a');
                link.download = nombre;
                link.href = URL.createObjectURL(blob);
                document.body.appendChild(link);
                link.click();
                setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 5000);
                mostrarNotificacion('✅ Ticket descargado: ' + nombre, 'success');
            }
        } catch(e) { alert('Error al generar imagen: ' + (e && e.message ? e.message : e)); }
    };
    window.copiarTicketTexto = () => { const ticket = document.getElementById('ticketParaImprimir'); if(!ticket) return; const texto = ticket.innerText; navigator.clipboard.writeText(texto).then(() => alert('✓ Ticket copiado')).catch(() => alert('Error al copiar')); };
    
    // ==================== NAVEGACIÓN CON PERSISTENCIA ====================
    function cacheModuleDOM(mod) {
        if(!mod || mod === 'home') return;
        const appRoot = document.getElementById('appRoot');
        if(!appRoot || appRoot.children.length === 0) return;
        let cacheEl = document.getElementById('_cache_' + mod);
        if(!cacheEl) {
            cacheEl = document.createElement('div');
            cacheEl.id = '_cache_' + mod;
            cacheEl.style.display = 'none';
            document.body.appendChild(cacheEl);
        }
        while(appRoot.firstChild) cacheEl.appendChild(appRoot.firstChild);
    }
    function restoreModuleDOM(mod) {
        const cacheEl = document.getElementById('_cache_' + mod);
        if(!cacheEl || cacheEl.children.length === 0) return false;
        const appRoot = document.getElementById('appRoot');
        while(cacheEl.firstChild) appRoot.appendChild(cacheEl.firstChild);
        return true;
    }
    function cleanModuleCache(mod) {
        const el = document.getElementById('_cache_' + mod);
        if(el) el.remove();
    }
    
    // Atajos PWA (manifest shortcuts) -> navegar al modulo real desde ?shortcut=
    const MODULOS_VALIDOS = ['ventas','inventario','clientes','proveedores','gastos','empleados','reportes','config'];
    window.jamShortcutModule = function(){
        try {
            const m = new URLSearchParams(location.search).get('shortcut');
            if(!m) return null;
            const id = MODULOS_VALIDOS.indexOf(m) >= 0 ? m : null;
            if(id){
                localStorage.setItem('jam_last_module', id);
                // remover el parametro para no re-dirigir en recargas/back
                try {
                    const url = new URL(location.href);
                    url.searchParams.delete('shortcut');
                    history.replaceState(null, '', url.toString());
                } catch(e) {}
                return id;
            }
            return null;
        } catch(e) { return null; }
    };

    window.navigateTo = m => {
        if(kioscoVentas && m !== 'ventas') { mostrarAvisoKiosco(); return; }
        if(volverBloqueado && currentModule !== 'home') { mostrarOverlayBloqueo(); return; }
        if(currentModule === m && !currentSub) return;
        const vieneDeSub = !!currentSub;
        currentSub = null;
        if(currentModule === 'ventas') guardarSesionVenta();
        
        // Cache current module DOM (una subpágina no se guarda en la caché del módulo)
        limpiarCacheSiDatosSucios();
        if(!vieneDeSub) cacheModuleDOM(currentModule);
        currentModule = m;
        localStorage.setItem('jam_last_module', m);
        history.pushState(null, null, location.href);
        
        // Try to restore cached module DOM
        if(restoreModuleDOM(m)) {
            if(m === 'ventas') sincronizarUIVenta();
            if(esDesktop()) renderSidebar();
            inyectarBotonAyudaModulo();
            iniciarGuiaModuloSiPrimeraVez(m);
            return;
        }
        
        // Render fresh
        if(m === 'ventas') renderVentas();
        else if(m === 'inventario') renderInventario();
        else if(m === 'clientes') renderCrud('clientes', 'Clientes', ['cedula','nombre','telefono','direccion','email']);
        else if(m === 'proveedores') renderCrud('proveedores', 'Proveedores', ['rif','nombre','telefono','contacto','direccion']);
        else if(m === 'gastos') renderCrud('gastos', 'Gastos', ['concepto','montoBs','categoria','fecha']);
        else if(m === 'empleados') renderCrud('empleados', 'Empleados', ['cedula','nombre','cargo','salarioBs','diaPago','fechaPago','fechaContrato']);
        else if(m === 'reportes') renderReportes();
        else if(m === 'config') renderConfig();
        else if(m === 'sync' && window.renderSync) window.renderSync();
        inyectarBotonAyudaModulo();
        iniciarGuiaModuloSiPrimeraVez(m);
        if(esDesktop()) renderSidebar();
    };
    
    function mostrarOverlayBloqueo() {
        const overlay = document.createElement('div'); overlay.className = 'modulo-bloqueado-overlay';
        overlay.innerHTML = `<div class="modulo-bloqueado-mensaje"><i class="fas fa-lock"></i><p><strong>Módulo Bloqueado</strong></p><p>Para desbloquear, mantén presionado el título del módulo por 2 segundos.</p><small>Modo profesional activado</small></div>`;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 2000);
    }
    
    window.backToHome = () => {
        if(kioscoVentas) { mostrarAvisoKiosco(); if(currentModule !== 'ventas') { currentModule = 'ventas'; renderVentas(); } return; }
        if(volverBloqueado) { mostrarOverlayBloqueo(); return; }
        if(currentModule === 'home') { currentSub = null; return; }
        if(currentModule === 'ventas') guardarSesionVenta();
        if(!currentSub) cacheModuleDOM(currentModule);
        currentSub = null;
        currentModule = 'home'; volverBloqueado = false;
        localStorage.setItem('jam_last_module', '');
        renderHome();
    };
    
    window.iniciarBloqueo = (el, nombre) => {
        if(timeoutTitulo) clearTimeout(timeoutTitulo);
        timeoutTitulo = setTimeout(() => {
            volverBloqueado = !volverBloqueado;
            if(el) { el.classList.toggle('module-title-bloqueado', volverBloqueado); }
            let btn = document.getElementById('btnVolverModule');
            if(btn){
                if(volverBloqueado){ btn.classList.add('btn-back-bloqueado'); btn.innerHTML = '<i class="fas fa-lock"></i> Bloqueado'; btn.onclick = () => mostrarOverlayBloqueo(); }
                else{ btn.classList.remove('btn-back-bloqueado'); btn.innerHTML = '<i class="fas fa-arrow-left"></i> Volver'; btn.onclick = () => window.backToHome(); }
            }
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:50px;z-index:10000;font-size:12px;';
            if(volverBloqueado){ toast.style.background='#dc2626'; toast.style.color='white'; toast.innerHTML='<i class="fas fa-lock"></i> Módulo BLOQUEADO - Modo profesional activado'; }
            else{ toast.style.background='#10b981'; toast.style.color='white'; toast.innerHTML='<i class="fas fa-lock-open"></i> Módulo DESBLOQUEADO'; }
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
            timeoutTitulo = null;
        }, 2000);
    };
    
    window.cancelarBloqueo = () => { if(timeoutTitulo){ clearTimeout(timeoutTitulo); timeoutTitulo = null; } };

    // ==================== PANTALLA ÚNICA DE VENTAS (KIOSCO) ====================
    // Se activa manteniendo presionado el título "Ventas" 4 s: el módulo queda
    // fijado como única pantalla (sin Volver ni acceso a otros módulos).
    // Persiste en localStorage (sobrevive reinicios y segundo plano). Se
    // desactiva manteniendo presionado el candado rojo 4 s.
    // Gesto táctil robusto: Pointer Events + captura de puntero (sobrevive a
    // micro-deslizamientos), tolerancia 12 px, barra de progreso --kiosco-p,
    // sin selección de texto ni menú contextual durante la pulsación.
    function mostrarAvisoKiosco() {
        const overlay = document.createElement('div'); overlay.className = 'modulo-bloqueado-overlay';
        overlay.innerHTML = `<div class="modulo-bloqueado-mensaje"><i class="fas fa-lock" style="color:#ef4444"></i><p><strong>Pantalla única de Ventas</strong></p><p>Solo puedes usar este módulo. Mantén presionado el candado rojo por 4 segundos para salir.</p></div>`;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 2200);
    }
    function crearGestoMantener(el, ms, alCompletar, claseVisual) {
        if(!el || el.dataset.holdBound) return;
        el.dataset.holdBound = '1';
        el.style.setProperty('--kiosco-p', '0%');
        let timer = null, raf = null, x0 = 0, y0 = 0;
        const pintar = () => {
            const p = Math.min(100, ((Date.now() - el._holdInicio) / ms) * 100);
            el.style.setProperty('--kiosco-p', p + '%');
            if(p < 100) raf = requestAnimationFrame(pintar); else raf = null;
        };
        const limpiar = () => {
            if(timer){ clearTimeout(timer); timer = null; }
            if(raf){ cancelAnimationFrame(raf); raf = null; }
            el.style.setProperty('--kiosco-p', '0%');
            if(claseVisual) el.classList.remove(claseVisual);
        };
        const abajo = e => {
            if(timer) return;
            x0 = e.clientX; y0 = e.clientY; el._holdInicio = Date.now();
            if(claseVisual) el.classList.add(claseVisual);
            if(navigator.vibrate) navigator.vibrate(15);
            try { el.setPointerCapture(e.pointerId); } catch(err) {}
            if(e.pointerType !== 'mouse') e.preventDefault();
            pintar();
            timer = setTimeout(() => { limpiar(); alCompletar(); }, ms);
        };
        const mover = e => {
            if(!timer) return;
            if(Math.hypot(e.clientX - x0, e.clientY - y0) > 12) limpiar();
        };
        el.addEventListener('pointerdown', abajo);
        el.addEventListener('pointermove', mover);
        ['pointerup','pointercancel','lostpointercapture'].forEach(ev => el.addEventListener(ev, () => limpiar()));
        el.addEventListener('contextmenu', e => e.preventDefault());
    }
    window.iniciarKioscoVentas = () => {
        kioscoVentas = true;
        try { localStorage.setItem(KIOSCO_KEY, '1'); } catch(e) {}
        localStorage.setItem('jam_last_module', 'ventas');
        renderVentas();
        mostrarNotificacion('🔒 Pantalla única de Ventas ACTIVADA', 'error');
        if(navigator.vibrate) navigator.vibrate([40,60,40]);
    };
    window.desactivarKioscoVentas = () => {
        kioscoVentas = false;
        try { localStorage.setItem(KIOSCO_KEY, '0'); } catch(e) {}
        renderVentas();
        mostrarNotificacion('🔓 Pantalla única DESACTIVADA', 'success');
        if(navigator.vibrate) navigator.vibrate(30);
    };
    function conectarGestosKiosco() {
        if(kioscoVentas) {
            const c = document.getElementById('btnKioscoCandado');
            if(c) crearGestoMantener(c, 4000, () => window.desactivarKioscoVentas(), 'kiosco-sostenido');
            const calc = document.getElementById('btnKioscoCalc');
            if(calc) calc.onclick = () => window.mostrarConvertidor();
        } else {
            const t = document.getElementById('tituloModule');
            if(t) crearGestoMantener(t, 4000, () => window.iniciarKioscoVentas(), 'titulo-sostenido');
        }
    }
    
    // ==================== DETECCIÓN DE ESCRITORIO ====================
    function esDesktop() { return window.innerWidth >= 1024; }
    function actualizarModoLayout() {
        const sidebar = document.getElementById('sidebarNav');
        if(!sidebar) return;
        if(esDesktop()) {
            document.body.classList.add('has-sidebar');
            sidebar.style.display = 'flex';
            renderSidebar();
        } else {
            document.body.classList.remove('has-sidebar');
            sidebar.style.display = 'none';
        }
    }
    
    // ==================== SIDEBAR ====================
    const MODULOS_SIDEBAR = [
        {icon:"fa-shopping-cart", label:"Ventas", id:"ventas"},
        {icon:"fa-boxes", label:"Inventario", id:"inventario"},
        {icon:"fa-users", label:"Clientes", id:"clientes"},
        {icon:"fa-truck", label:"Proveedores", id:"proveedores"},
        {icon:"fa-coins", label:"Gastos", id:"gastos"},
        {icon:"fa-user-tie", label:"Empleados", id:"empleados"},
        {icon:"fa-chart-line", label:"Reportes", id:"reportes"},
        {icon:"fa-palette", label:"Configuración", id:"config"}
    ];
    
    function renderSidebar() {
        const sidebar = document.getElementById('sidebarNav');
        if(!sidebar) return;
        const accent = D.config.theme;
        const actual = currentModule || 'home';
        sidebar.innerHTML = `<div class="sidebar-brand" style="color:${accent}">JAM</div><div class="sidebar-sep"></div>${MODULOS_SIDEBAR.map(m => {
            const activo = actual === m.id ? 'filter:brightness(1.3);' : '';
            return `<button class="sidebar-item" style="${activo}color:${accent}" onclick="navigateTo('${m.id}')" title="${m.label}"><i class="fas ${m.icon}" style="color:${accent}"></i><span>${m.label}</span></button>`;
        }).join('')}<div class="sidebar-sep" style="margin-top:auto"></div><button class="sidebar-item" onclick="backToHome()" title="Inicio" style="margin-top:auto;color:${accent}"><i class="fas fa-home" style="color:${accent}"></i><span>Inicio</span></button>`;
    }
    
    // ==================== PANTALLA PRINCIPAL ====================
    function renderHome(){
        if(window.fechaHoraInterval) { clearInterval(window.fechaHoraInterval); window.fechaHoraInterval = null; }
        currentModule = 'home'; volverBloqueado = false;
        document.querySelectorAll('[id^="_cache_"]').forEach(el => el.remove());
        let accent = D.config.theme;
        let mostrarDolarHtml = D.config.mostrarDolar ? 
            `<div class="flex justify-center items-baseline gap-1 info-dinamica"><span id="tasaDolarMostrar" class="text-5xl font-black" style="color:${accent}">${D.config.dolarRate > 0 ? fmtDolar(D.config.dolarRate) : '—'}</span><span class="text-2xl font-bold" style="color:${accent}">${D.config.dolarRate > 0 ? 'Bs' : ''}</span></div>` :
            `<div class="info-dinamica" style="text-align:center"></div>`;
        const enDesktop = esDesktop();
        const homeGridHtml = enDesktop ? `<div class="home-grid sidebar-hidden">` : `<div class="home-grid">`;
        document.getElementById('appRoot').innerHTML = `
            <div class="home-container" style="padding-top:16px">
                <div class="mb-4">
                    <div class="relative">
                        <i class="fas fa-search absolute left-4 top-3.5 text-gray-400"></i>
                        <input type="text" id="searchGlobalInput" placeholder="Buscar productos, clientes..." class="w-full pl-10 pr-12 p-2 rounded-2xl border-2 shadow-sm" style="border-color:${accent}">
                        <button class="btn-ayuda-home" onclick="mostrarGuiaApp()" title="Guía de la app"><i class="fas fa-circle-question"></i></button>
                        <div id="globalResults" class="absolute z-30 w-full mt-2 rounded-2xl shadow-xl max-h-72 overflow-auto hidden" style="border:1px solid var(--accent);"></div>
                    </div>
                </div>
                <div class="card-bcv">
                    <div class="led-converter" onclick="mostrarConvertidor()"><i class="fas fa-calculator text-sm"></i></div>
                    <p class="text-xs font-bold">${D.config.mostrarDolar ? (fuenteRegidoraClave() === 'ALCB-USDT' ? 'TIPO DE CAMBIO (USDT → VES)' : 'TIPO DE CAMBIO (USD → VES)') : 'FECHA'}</p>
                    ${mostrarDolarHtml}
                    <p class="text-[11px] mt-1">${D.config.mostrarDolar ? 'Actualizado: ' + D.config.lastUpdate : ''}</p>
                    <p class="text-[9px] opacity-70 mt-0.5">Fuente: ${nombreFuenteTasa(D.config.fuenteTasa)}</p>
                </div>
                ${enDesktop && !esAppNativa() && D.config.mostrarDolar ? `<div class="tasas-extras">${tasasExtrasHtml()}</div>` : ''}
                ${homeGridHtml}
                    ${MODULOS_SIDEBAR.map(m => `<button onclick="navigateTo('${m.id}')" class="main-module-btn" style="background:${accent};"><i class="fas ${m.icon}"></i><span>${m.label}</span></button>`).join('')}
                </div>
                <div class="text-center text-xs mt-4 opacity-60">JAM POS v${APP_VERSION}<br>By @felinuxs</div>
            </div>
        `;
        actualizarModoLayout();
        const inputGlobal = document.getElementById('searchGlobalInput');
        inputGlobal.addEventListener('input', e => globalSearch(e.target.value));
        inputGlobal.addEventListener('focus', () => { document.body.classList.add('teclado-abierto'); if(window.scrollTo) window.scrollTo(0, 0); });
        inputGlobal.addEventListener('blur', () => document.body.classList.remove('teclado-abierto'));
        if(!D.config.mostrarDolar) {
            const actualizarFechaSolamente = () => {
                const infoDiv = document.querySelector('.card-bcv .info-dinamica');
                if(infoDiv) {
                    const ahora = new Date();
                    let diaSemana = ahora.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
                    const diaNumero = ahora.getDate();
                    const mes = ahora.toLocaleDateString('es-ES', { month: 'long' });
                    const año = ahora.getFullYear();
                    infoDiv.innerHTML = `<div class="text-4xl font-black" style="color:${accent}">${diaSemana}</div><div class="text-base" style="color:${accent}">${diaNumero} de ${mes} del ${año}</div>`;
                }
            };
            actualizarFechaSolamente();
            window.fechaHoraInterval = setInterval(actualizarFechaSolamente, 60000);
        }
        iniciarTutorialSiPrimeraVez();
        if(window._pruebaInfo) mostrarBannerPrueba(window._pruebaInfo);
    }
    
    async function globalSearch(term){
        let div = document.getElementById('globalResults');
        if(term.length < 2){ div.classList.add('hidden'); return; }
        let norm = normalizeText(term);
        let prod = D.productos.filter(p => normalizeText(p.nombre).includes(norm) || (p.marca && normalizeText(p.marca).includes(norm)) || (p.codigo && normalizeText(p.codigo).includes(norm)));
        let cli = D.clientes.filter(c => normalizeText(c.nombre).includes(norm));
        let html = '';
        prod.slice(0,5).forEach(p => {
            const prg = preciosProducto(p);
            const ofG = prg.tieneDesc ? `<div class="text-xs" style="color:#10b981"><i class="fas fa-tag"></i> Oferta: ${fmtPrecio(prg.desc.bs)} Bs / $${prg.desc.usd}</div>` : '';
            html += `<div class="global-result p-3 cursor-pointer border-b" style="border-bottom-color:var(--accent);">
                        <div class="font-bold">${escapeHtml(p.nombre)}</div>
                        <div class="text-sm flex justify-between flex-wrap">
                            <span><i class="fas fa-sack-dollar"></i> ${fmtPrecio(prg.normalBs)} Bs</span>
                            <span><i class="fas fa-money-bill-wave"></i> $${prg.normalUsd}</span>
                            <span><i class="fas fa-boxes-stacked"></i> Stock: ${p.stock}</span>
                        </div>
                        ${ofG}
                        <div class="card-btns">
                            <button onclick="event.stopPropagation();editarProductoDesdeBusqueda('${p.id}')" class="btn-editar-redondeado"><i class="fas fa-pen"></i> Editar</button>
                            <button onclick="event.stopPropagation();venderProductoDesdeBusqueda('${p.id}')" class="btn-verde-redondeado"><i class="fas fa-cart-shopping"></i> Vender</button>
                        </div>
                    </div>`;
        });
        cli.slice(0,3).forEach(c => html += `<div class="global-result p-3 cursor-pointer" onclick="alert('👤 ${escapeHtml(c.nombre)} - ${escapeHtml(c.cedula||'')}')"><i class="fas fa-user mr-2"></i>${escapeHtml(c.nombre)}</div>`);
        if(!html) html = '<div class="p-3 text-center">Sin resultados</div>';
        let inp = document.getElementById('searchGlobalInput');
        if(window._gsTimer) cancelAnimationFrame(window._gsTimer);
        window._gsTimer = requestAnimationFrame(() => {
            div.textContent = '';
            div.insertAdjacentHTML('beforeend', html);
            div.classList.remove('hidden');
            if(inp && document.activeElement !== inp) inp.focus();
            window._gsTimer = null;
        });
        if(window._closeGlobalSearch) { document.removeEventListener('click', window._closeGlobalSearch); }
        window._closeGlobalSearch = e => {
            let inp2 = document.getElementById('searchGlobalInput');
            if(!div.contains(e.target) && e.target !== inp2 && !inp2?.contains(e.target)){ div.classList.add('hidden'); document.removeEventListener('click', window._closeGlobalSearch); window._closeGlobalSearch = null; }
        };
        setTimeout(() => document.addEventListener('click', window._closeGlobalSearch), 100);
    }
    
    window.editarProductoDesdeBusqueda = id => mostrarFormProducto(id, true);
    window.venderProductoDesdeBusqueda = id => { navigateTo('ventas'); setTimeout(() => agregarAlCarrito(id), 100); };
    
    window.mostrarConvertidor = async () => {
        if(window.convMod) window.convMod.remove();
        if(!(D.config.dolarRate > 0)){ await garantizarTasa(); }
        const sinTasa = !(D.config.dolarRate > 0);
        let m = document.createElement('div'); m.className = 'modal-form';
        m.innerHTML = `<div class="modal-form-content"><h3 class="font-bold text-lg mb-3"><i class="fas fa-rotate"></i> Convertidor Bs ↔ USD</h3><div class="mb-3"><label>Bolívares (Bs)</label><input type="text" inputmode="decimal" id="bsInput" ${sinTasa ? 'disabled' : ''} placeholder="Bs" class="border rounded-xl p-2 w-full"></div><div class="mb-3"><label>Dólares (USD)</label><input type="text" inputmode="decimal" id="usdInput" ${sinTasa ? 'disabled' : ''} placeholder="USD" class="border rounded-xl p-2 w-full"></div>${sinTasa ? `<p class="text-sm" style="color:#ef4444;font-weight:600">Sin tasa registrada: conéctate a internet o fíjala manualmente en Configuración.</p>` : `<p class="text-sm">Tasa: 1 USD = ${fmtDolar(D.config.dolarRate)} Bs</p>`}<button id="closeConv" class="mt-3 w-full py-2 rounded-xl bg-gray-200">Cerrar</button></div>`;
        document.body.appendChild(m);
        window.convMod = m;
        let bs = document.getElementById('bsInput'), usd = document.getElementById('usdInput');
        aplicarMascaraBs(bs); aplicarMascaraBs(usd);
        function parseFmt(s) { return parseBs(s); }
        bs.oninput = () => { if(sinTasa || !(D.config.dolarRate > 0)) return; let raw = parseBs(bs.value); usd.value = raw > 0 ? fmtPrecio(raw / D.config.dolarRate) : ''; };
        usd.oninput = () => { if(sinTasa || !(D.config.dolarRate > 0)) return; let raw = parseBs(usd.value); bs.value = raw > 0 ? fmtPrecio(raw * D.config.dolarRate) : ''; };
        document.getElementById('closeConv').onclick = () => { m.remove(); window.convMod = null; };
        m.onclick = e => { if(e.target === m) { m.remove(); window.convMod = null; } };
    };
    
    // ==================== INVENTARIO ====================
    async function renderInventario(){
        let bloqueado = volverBloqueado, accent = D.config.theme;
        productosSeleccionados = new Set(); selectAllChecked = false;
        document.getElementById('appRoot').innerHTML = `<div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Inventario')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Inventario</h2><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div><div class="page-container"><div class="mb-3"><div class="buscador"><i class="fas fa-search icono-busqueda"></i><input type="text" id="searchInv" placeholder="Buscar producto o código de barras..." class="border-2 rounded-xl p-2 w-full" style="border-color:${accent}" autocomplete="off"><button id="btnScanInv" class="btn-icon-cuadrado" title="Escanear con cámara"><i class="fas fa-camera"></i></button></div></div><div class="batch-toolbar"><button id="nuevoProducto" class="btn-azul-redondeado btn-redondeado py-2 px-4">+ Nuevo</button><button id="btnEditarLote" class="btn-azul-redondeado btn-redondeado py-2 px-4" onclick="editarSeleccionLote()" style="display:none"><i class="fas fa-pen"></i> Editar selección</button><span id="batchCount" class="batch-count"></span><label class="flex items-center gap-2 text-sm">Todo<input type="checkbox" id="selectAllCheckbox" class="select-all-checkbox" onchange="toggleSelectAll(this.checked)"></label></div><div id="listaProductos" class="scroll-area"></div></div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        document.getElementById('searchInv').addEventListener('input', e => renderListaProductos(e.target.value.toLowerCase()));
        document.getElementById('searchInv').addEventListener('keydown', e => { if(e.key === 'Enter') buscarPorCodigoInventario(e.target.value.trim()); });
        if(!('ontouchstart' in window)) setTimeout(() => document.getElementById('searchInv')?.focus(), 300);
        document.getElementById('btnScanInv').onclick = () => abrirEscanerCamara('searchInv', cod => { document.getElementById('searchInv').value = cod; buscarPorCodigoInventario(cod); });
        document.getElementById('nuevoProducto').onclick = () => mostrarFormProducto(null);
        renderListaProductos('');
    }
    
    function renderListaProductos(filtro = ''){
        let norm = normalizeText(filtro);
        let filt = D.productos.filter(p => normalizeText(p.nombre).includes(norm) || (p.marca && normalizeText(p.marca).includes(norm)) || (p.codigo && normalizeText(p.codigo).includes(norm)));
        let cont = document.getElementById('listaProductos'); if(!cont) return;
        cont.innerHTML = filt.map(p => {
            let checked = productosSeleccionados.has(p.id);
            return `<div class="product-card"><div class="flex flex-wrap items-start gap-2"><div class="flex-1"><div class="flex justify-between flex-wrap"><span class="font-bold">${escapeHtml(p.nombre)}</span><span class="text-xs">${escapeHtml(p.codigo||'')}</span></div><div class="text-sm"><i class="fas fa-sack-dollar"></i> ${fmtPrecio(preciosProducto(p).normalBs)} Bs / $${preciosProducto(p).normalUsd} | <i class="fas fa-boxes-stacked"></i> Stock: ${p.stock}</div>${tieneDescuentoProducto(p) ? `<div class="text-sm" style="color:#10b981"><i class="fas fa-tag"></i> Oferta: ${fmtPrecio(preciosProducto(p).desc.bs)} Bs / $${preciosProducto(p).desc.usd} <span class="text-xs">(-${typeof p.porcentajeDescuento === 'number' ? p.porcentajeDescuento : 0}%)</span></div>` : ''}${(p.descuentoProveedor && p.descuentoProveedor > 0) ? `<div class="text-xs" style="color:#f59e0b"><i class="fas fa-boxes-stacked"></i> Costo prov: $${fmtPrecio(preciosProducto(p).costoNetoUsd)} <span style="text-decoration:line-through;opacity:0.6">$${fmtPrecio(preciosProducto(p).costoUsd)}</span> (-${p.descuentoProveedor}%)</div>` : ''}<div class="text-xs break-words">${p.marca ? `<i class="fas fa-certificate"></i> ${escapeHtml(p.marca)} · ` : ''}<i class="fas fa-tag"></i> ${escapeHtml(p.categoria||'')} | <i class="fas fa-truck"></i> ${escapeHtml(p.proveedor||'—')}</div><div class="card-btns"><button onclick="mostrarFormProducto('${p.id}')" class="btn-editar-redondeado"><i class="fas fa-pen"></i> Editar</button><button onclick="ajustarStock('${p.id}')" class="btn-redondeado" style="background:#f59e0b;color:#fff"><i class="fas fa-right-left"></i> Ajustar</button><button onclick="copiarProducto('${p.id}')" class="btn-redondeado" style="background:var(--accent,#3b82f6);color:#fff"><i class="fas fa-clipboard"></i> Copiar</button><button onclick="eliminarProducto('${p.id}')" class="btn-eliminar-redondeado"><i class="fas fa-trash"></i> Eliminar</button></div></div><input type="checkbox" class="product-checkbox mt-1" data-id="${p.id}" ${checked?'checked':''} onchange="toggleProductoSeleccionado('${p.id}',this.checked)"></div></div>`;
        }).join('');
        actualizarToolbarBatch();
    }
    window.toggleProductoSeleccionado = (id, checked) => {
        if(checked) productosSeleccionados.add(id);
        else productosSeleccionados.delete(id);
        actualizarToolbarBatch();
    };
    window.toggleSelectAll = (checked) => {
        selectAllChecked = checked;
        document.querySelectorAll('.product-checkbox').forEach(cb => { cb.checked = checked; let id = cb.dataset.id; if(checked) productosSeleccionados.add(id); else productosSeleccionados.delete(id); });
        actualizarToolbarBatch();
    };
    function actualizarToolbarBatch(){
        let btn = document.getElementById('btnEditarLote');
        let count = document.getElementById('batchCount');
        let n = productosSeleccionados.size;
        if(!btn || !count) return;
        if(n > 0) { btn.style.display = 'inline-flex'; count.innerText = `${n}`; }
        else { btn.style.display = 'none'; count.innerText = ''; }
    }
    window.editarSeleccionLote = () => {
        let ids = [...productosSeleccionados];
        if(ids.length === 0){ alert('Seleccione al menos un producto'); return; }
        let prods = ids.map(id => D.productos.find(p => p.id === id)).filter(Boolean);
        let modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content"><h3 class="text-xl font-bold mb-4"><i class="fas fa-pen"></i> Editar lote (${prods.length} productos)</h3>
            <p class="text-xs mb-3 opacity-60">Los campos vacíos no se modificarán</p>
            <div class="mb-3"><label>Precio Venta (Bs) <span class="text-xs opacity-50">(nuevo valor)</span></label><input type="text" id="lotePrecioBs" placeholder="Dejar vacío para no cambiar" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Precio Venta (USD) <span class="text-xs opacity-50">(nuevo valor)</span></label><input type="number" id="lotePrecioUsd" step="any" placeholder="Dejar vacío para no cambiar" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Categoría <span class="text-xs opacity-50">(nuevo valor)</span></label><input id="loteCategoria" placeholder="Dejar vacío para no cambiar" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Marca <span class="text-xs opacity-50">(nuevo valor)</span></label><input id="loteMarca" placeholder="Dejar vacío para no cambiar" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Proveedor <span class="text-xs opacity-50">(nuevo valor)</span></label><input id="loteProveedor" placeholder="Dejar vacío para no cambiar" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Stock <span class="text-xs opacity-50">(sumar este valor al actual)</span></label><input type="number" id="loteStock" placeholder="0 = no cambiar" class="border rounded-xl p-2 w-full"></div>
            <div class="flex gap-3 mt-4"><button id="aplicarLoteBtn" class="btn-azul-redondeado btn-redondeado flex-1 py-2 font-bold">Aplicar cambios</button><button id="cancelarLoteBtn" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('cancelarLoteBtn').onclick = () => modal.remove();
        aplicarMascaraBs(document.getElementById('lotePrecioBs'));
        document.getElementById('aplicarLoteBtn').onclick = async () => {
            let precioBsRaw = document.getElementById('lotePrecioBs').value;
            let precioUsd = document.getElementById('lotePrecioUsd').value;
            let categoria = document.getElementById('loteCategoria').value.trim();
            let marca = document.getElementById('loteMarca').value.trim();
            let proveedor = document.getElementById('loteProveedor').value.trim();
            let stockDelta = parseInt(document.getElementById('loteStock').value) || 0;
            let cambios = false;
            for(let p of prods){
                let cambiado = false;
                if(precioBsRaw !== ''){ p.precioVentaBs = parseBs(precioBsRaw); cambiado = true; }
                if(precioUsd !== ''){ p.precioVentaUsd = parseFloat(precioUsd); cambiado = true; }
                if(categoria){ p.categoria = categoria; cambiado = true; }
                if(marca){ p.marca = marca; cambiado = true; }
                if(proveedor){ p.proveedor = proveedor; cambiado = true; }
                if(stockDelta !== 0){ p.stock = (parseInt(p.stock)||0) + stockDelta; if(p.stock < 0) p.stock = 0; cambiado = true; }
                if(cambiado){ await saveItem('productos', p); cambios = true; }
            }
            modal.remove();
            if(cambios){ productosSeleccionados = new Set(); mostrarNotificacion(`✅ ${prods.length} producto(s) actualizados`, 'success'); renderInventario(); }
            else mostrarNotificacion('ℹ️ No se realizaron cambios', 'info');
        };
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
    };
    
    // ==================== PRECIOS CENTRALES DEL PRODUCTO ====================
    // Toda la matemática de precios pasa por aquí para que CUADRE en todos los
    // módulos (inventario, ventas, ticket, WhatsApp, reportes).
    // Reglas:
    //   - El costo se ingresa en USD; el costo en Bs se deriva con la tasa del día.
    //   - Si el proveedor ofrece descuento: costoNeto = costoBruto × (1 - descProv%).
    //   - Precio normal USD = costoNeto USD × (1 + ganancia%). Bs = USD × tasa.
    //   - Si hay descuento al cliente: precio oferta USD = normal USD × (1 - descuento%).
    //   - La ganancia siempre se calcula sobre el COSTO NETO (ya con descuento prov.).
    function calcGananciaProducto(p){
        if(p && typeof p.porcentajeGanancia === 'number' && p.porcentajeGanancia > 0) return p.porcentajeGanancia;
        const c = parseFloat(p && p.costoNetoUsd) || parseFloat(p && p.costoRealUsd) || 0;
        const v = parseFloat(p && p.precioVentaUsd) || 0;
        if(c > 0 && v > 0) return Math.round((v - c) / c * 100);
        return 0;
    }
    function tieneDescuentoProducto(p){
        if(!p) return false;
        if(typeof p.porcentajeDescuento === 'number' && p.porcentajeDescuento > 0) return true;
        return parseFloat(p.precioDescuentoUsd) > 0;
    }
    function precioDescuentoProducto(p, tasa){
        if(!(tasa > 0)){ const dd = D.config && D.config.dolarRate; tasa = dd > 0 ? dd : 0; }
        const usd = parseFloat(p && p.precioDescuentoUsd);
        if(usd > 0) return { usd: usd, bs: parseFloat(p.precioDescuentoBs) > 0 ? p.precioDescuentoBs : Math.round(usd * tasa * 100) / 100 };
        const normal = parseFloat(p && p.precioVentaUsd) || 0;
        const pct = parseFloat(p && p.porcentajeDescuento) || 0;
        if(normal > 0 && pct > 0){ const d = Math.round(normal * (1 - pct / 100) * 100) / 100; return { usd: d, bs: Math.round(d * tasa * 100) / 100 }; }
        return null;
    }
    function preciosProducto(p, tasa){
        if(!(tasa > 0)){ const d = D.config && D.config.dolarRate; tasa = d > 0 ? d : 0; }
        const costoUsd = parseFloat(p && p.costoRealUsd) || 0;
        const costoBs = parseFloat(p && p.costoRealBs) > 0 ? p.costoRealBs : Math.round(costoUsd * tasa * 100) / 100;
        const descProvPct = (p && typeof p.descuentoProveedor === 'number') ? p.descuentoProveedor : 0;
        const costoNetoUsd = (p && typeof p.costoNetoUsd === 'number' && p.costoNetoUsd > 0)
            ? p.costoNetoUsd : (descProvPct > 0 ? Math.round(costoUsd * (1 - descProvPct / 100) * 100) / 100 : costoUsd);
        const costoNetoBs = (p && typeof p.costoNetoBs === 'number' && p.costoNetoBs > 0)
            ? p.costoNetoBs : Math.round(costoNetoUsd * tasa * 100) / 100;
        const normalUsd = parseFloat(p && p.precioVentaUsd) || 0;
        const normalBs = parseFloat(p && p.precioVentaBs) > 0 ? p.precioVentaBs : (normalUsd > 0 ? Math.round(normalUsd * tasa * 100) / 100 : 0);
        const desc = precioDescuentoProducto(p, tasa);
        return {
            costoUsd, costoBs, costoNetoUsd, costoNetoBs,
            normalUsd, normalBs,
            ganancia: calcGananciaProducto(p),
            desc, tieneDesc: !!desc,
            descProvPct
        };
    }
    
    async function mostrarFormProducto(id, desdeBusqueda = false){
        let prod = id ? D.productos.find(p => p.id === id) : null;
        let esNuevo = !prod;
        const tasa = D.config.dolarRate;
        const prIni = prod ? preciosProducto(prod, tasa) : { costoUsd:0, costoBs:0, costoNetoUsd:0, costoNetoBs:0, normalUsd:0, normalBs:0, desc:null, descProvPct:0 };
        const ganIni = prod ? (prIni.ganancia || 30) : 30;
        const descPct = prod ? (typeof prod.porcentajeDescuento === 'number' ? prod.porcentajeDescuento : 0) : 0;
        const descUsdIni = prIni.desc ? prIni.desc.usd : 0;
        const descBsIni = prIni.desc ? prIni.desc.bs : 0;
        const descProvIni = prIni.descProvPct || 0;
        let modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:420px;padding:14px"><h3 class="text-xl font-bold mb-2">${esNuevo ? 'Nuevo Producto' : 'Editar Producto'}</h3>
            ${!(D.config.dolarRate > 0) ? `<div id="sinTasaAvisoProd" class="mb-2 p-2 rounded text-sm" style="background:#fef3c7;color:#92400e;font-weight:600"><i class="fas fa-triangle-exclamation"></i> Sin tasa de cambio registrada: los precios en Bs se activarán cuando haya tasa (conéctate a internet o fíjala manualmente en Configuración).</div>` : ''}
            <div class="mb-1"><label class="opacity-70">Nombre</label><input id="nombre" value="${escapeHtml(prod?.nombre||'')}" class="border rounded p-1 w-full"></div>
            <div class="mb-1"><label class="opacity-70"><i class="fas fa-camera"></i> Código de barras</label><div class="flex gap-2"><input id="codigo" value="${escapeHtml(prod?.codigo||'')}" class="border rounded p-1 flex-1" style="border-color:var(--accent,#3b82f6)"><button id="btnScanProducto" class="btn-icon-cuadrado" title="Escanear con cámara"><i class="fas fa-camera"></i></button></div></div>
            <div class="mb-1"><div class="grid grid-cols-3 gap-2"><div><label class="opacity-70">Marca</label><input id="marca" value="${escapeHtml(prod?.marca||'')}" placeholder="Ej: Polar" class="border rounded p-1 w-full"></div><div><label class="opacity-70">Categoría</label><input id="categoria" value="${escapeHtml(prod?.categoria||'')}" class="border rounded p-1 w-full"></div><div><label class="opacity-70">Tipo</label><input id="tipo" value="${escapeHtml(prod?.tipo||'')}" class="border rounded p-1 w-full"></div></div></div>
            <div class="mb-1"><div class="grid grid-cols-10 gap-2 relative"><div class="col-span-8 relative"><label class="opacity-70">Proveedor</label><input id="proveedor" value="${escapeHtml(prod?.proveedor||'')}" placeholder="Escriba para buscar..." class="border rounded p-1 w-full" autocomplete="off"><div id="sugProveedor" style="display:none;position:absolute;left:0;right:0;z-index:100;background:var(--bg,#fff);border:1px solid rgba(128,128,128,0.2);border-radius:12px;max-height:150px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.1)"></div></div><div class="col-span-2"><label class="opacity-70">Descuento</label><input type="number" id="descProvInput" step="any" min="0" max="99.99" value="${descProvIni || ''}" placeholder="%" class="border rounded p-1 w-full"></div></div></div>
            <div class="grid grid-cols-10 gap-2 mb-1 items-end">
                <div class="col-span-3"><label class="opacity-70"><i class="fas fa-money-bill-wave"></i> Costo (USD)</label><input type="number" id="compraUsd" step="any" min="0" value="${prod?.costoRealUsd||''}" placeholder="Ej: 3.00" class="border rounded p-1 w-full"></div>
                <div class="col-span-3"><label class="opacity-70">Costo en Bs</label><input type="text" id="compraBs" value="${fmtPrecio(prIni.costoBs)}" class="border rounded p-1 w-full"></div>
                <div class="col-span-2"><label class="opacity-70">Ganancia</label><input type="number" id="gananciaInput" step="any" min="5" max="100" value="${ganIni}" class="border rounded p-1 w-full"></div>
                <div class="col-span-2"><label class="opacity-70">Stock</label><input type="number" id="stock" value="${prod?.stock||0}" class="border rounded p-1 w-full"></div>
            </div>
            <div class="grid grid-cols-2 gap-2 mb-1 items-end">
                <div><label class="opacity-70">Venta en USD</label><input type="number" id="ventaUsd" step="any" min="0" value="${prIni.normalUsd || ''}" class="border rounded p-1 w-full"></div>
                <div><label class="opacity-70">Venta en Bs</label><input type="text" id="ventaBs" value="${fmtPrecio(prIni.normalBs)}" class="border rounded p-1 w-full"></div>
            </div>
            <div id="costoNetoInfo" class="text-xs mb-1" style="color:#f59e0b;${descProvIni > 0 ? '' : 'display:none'}"><i class="fas fa-boxes-stacked"></i> Costo neto prov: $<span id="costoNetoMostrar">${(prIni.costoNetoUsd || 0).toFixed(2)}</span> <span id="costoNetoAntes" style="text-decoration:line-through;opacity:0.6">${descProvIni > 0 ? '$' + (prIni.costoUsd || 0).toFixed(2) : ''}</span></div>
            <div class="rounded-xl p-2 mb-2" style="background:rgba(128,128,128,0.08)">
                <p class="font-bold text-sm mb-1" style="color:var(--accent)"><i class="fas fa-dollar-sign"></i> Precios calculados <span class="text-xs opacity-60">(tasa: 1 USD = ${fmtDolar(tasa)} Bs)</span></p>
                <div class="text-xs space-y-1">
                    <div class="flex items-center justify-between"><label class="font-bold text-sm"><i class="fas fa-tag"></i> Oferta del producto</label><label class="switch"><input type="checkbox" id="descOn" ${descPct > 0 ? 'checked' : ''}><span class="slider"></span></label></div>
                    <div id="descDiv" class="grid grid-cols-10 gap-2 items-end" style="${descPct > 0 ? '' : 'display:none'}">
                        <div class="col-span-4"><label class="opacity-70">Oferta en USD</label><input type="number" id="descUsd" step="any" min="0" value="${descUsdIni || ''}" class="border rounded p-1 w-full"></div>
                        <div class="col-span-4"><label class="opacity-70">Oferta en Bs</label><input type="text" id="descBs" value="${fmtPrecio(descBsIni)}" class="border rounded p-1 w-full"></div>
                        <div class="col-span-2"><label class="opacity-70">Descuento</label><input type="number" id="descuentoInput" step="any" min="0" max="99.99" value="${descPct || ''}" placeholder="Ej: 10" class="border rounded p-1 w-full"></div>
                    </div>
                    <div class="flex justify-end"><button id="recalcBtn" class="btn-redondeado py-1 px-3 text-xs" style="border:1px solid var(--accent,#3b82f6)">↺ Recalcular</button></div>
                </div>
            </div>
            <div class="flex gap-3 mt-2"><button id="guardarBtn" class="btn-azul-redondeado btn-redondeado flex-1 py-2 font-bold">Guardar</button><button id="cancelarBtn" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('cancelarBtn').onclick = () => modal.remove();
        document.getElementById('btnScanProducto').onclick = () => abrirEscanerCamara('codigo', cod => { document.getElementById('codigo').value = cod; });
        const compraUsd = document.getElementById('compraUsd'), compraBs = document.getElementById('compraBs');
        const ventaUsd = document.getElementById('ventaUsd'), ventaBs = document.getElementById('ventaBs');
        const descUsd = document.getElementById('descUsd'), descBs = document.getElementById('descBs');
        const gananciaInput = document.getElementById('gananciaInput');
        const descOn = document.getElementById('descOn'), descuentoInput = document.getElementById('descuentoInput');
        const descDiv = document.getElementById('descDiv'), recalcBtn = document.getElementById('recalcBtn');
        const descProvInput = document.getElementById('descProvInput');
        const costoNetoInfo = document.getElementById('costoNetoInfo');
        const costoNetoMostrar = document.getElementById('costoNetoMostrar'), costoNetoAntes = document.getElementById('costoNetoAntes');
        let manual = { costo:false, venta:false, desc:false };
        aplicarMascaraBs(compraBs); aplicarMascaraBs(ventaBs); aplicarMascaraBs(descBs);
        const tRedondeo = (v) => Math.round(v * 100) / 100;
        function recalcular(){
            const tasaV = D.config.dolarRate;
            const sinTasa = !(tasaV > 0);
            const avisoTasa = document.getElementById('sinTasaAvisoProd');
            if(avisoTasa) avisoTasa.style.display = sinTasa ? '' : 'none';
            const costoUsdVal = parseFloat(compraUsd.value) || 0;
            let ganVal = parseFloat(gananciaInput.value) || 0;
            if(ganVal < 0) ganVal = 0;
            let descVal = descOn.checked ? (parseFloat(descuentoInput.value) || 0) : 0;
            if(descVal < 0) descVal = 0; if(descVal >= 100) descVal = 99.99;
            let descProvVal = parseFloat(descProvInput.value) || 0;
            if(descProvVal < 0) descProvVal = 0; if(descProvVal >= 100) descProvVal = 99.99;
            const costoNetoUsd = costoUsdVal > 0 ? tRedondeo(costoUsdVal * (1 - descProvVal / 100)) : 0;
            if(!manual.costo){ compraBs.value = (costoNetoUsd > 0 && !sinTasa) ? fmtPrecio(tRedondeo(costoNetoUsd * tasaV)) : ''; sincronizarBs(compraBs); }
            const precioUsd = costoNetoUsd > 0 ? tRedondeo(costoNetoUsd * (1 + ganVal / 100)) : 0;
            if(!manual.venta){
                ventaUsd.value = precioUsd > 0 ? precioUsd.toFixed(2) : '';
                ventaBs.value = (precioUsd > 0 && !sinTasa) ? fmtPrecio(tRedondeo(precioUsd * tasaV)) : '';
                sincronizarBs(ventaBs);
            }
            if(!manual.desc){
                const dUsd = (precioUsd > 0 && descVal > 0) ? tRedondeo(precioUsd * (1 - descVal / 100)) : 0;
                descUsd.value = dUsd > 0 ? dUsd.toFixed(2) : '';
                descBs.value = (dUsd > 0 && !sinTasa) ? fmtPrecio(tRedondeo(dUsd * tasaV)) : '';
                sincronizarBs(descBs);
            }
            descDiv.style.display = descOn.checked ? '' : 'none';
            if(costoNetoInfo) costoNetoInfo.style.display = descProvVal > 0 && costoUsdVal > 0 ? '' : 'none';
            if(costoNetoMostrar) costoNetoMostrar.textContent = costoNetoUsd.toFixed(2);
            if(costoNetoAntes) costoNetoAntes.textContent = descProvVal > 0 ? '$' + costoUsdVal.toFixed(2) : '';
            const vUsd = parseFloat(ventaUsd.value) || 0;
            const dUsd2 = parseFloat(descUsd.value) || 0;
            const baseCalc = costoNetoUsd > 0 ? costoNetoUsd : costoUsdVal;
            let margenNormal = baseCalc > 0 ? Math.round((vUsd - baseCalc) / baseCalc * 100) : 0;
            let margenOferta = (baseCalc > 0 && dUsd2 > 0) ? Math.round((dUsd2 - baseCalc) / baseCalc * 100) : 0;
            const info = document.getElementById('margenInfo');
            if(info) info.innerHTML = `Ganancia normal: <b>${margenNormal}%</b>${descOn.checked && dUsd2 > 0 ? ` | Ganancia con oferta: <b>${margenOferta}%</b>` : ''}${descProvVal > 0 ? ` <span style="color:#f59e0b">| Costo neto: $${costoNetoUsd.toFixed(2)} (-${descProvVal}% prov.)</span>` : ''}`;
        }
        compraUsd.oninput = () => { manual = { costo:false, venta:false, desc:false }; try{recalcular();}catch(e){console.error('recalc compraUsd',e);} };
        gananciaInput.addEventListener('input', () => { manual.venta = false; manual.desc = false; try{recalcular();}catch(e){console.error('recalc ganancia',e);} });
        descuentoInput.oninput = () => { manual.desc = false; try{recalcular();}catch(e){console.error('recalc descuento',e);} };
        descOn.onchange = () => { manual.desc = false; if(descOn.checked && !descuentoInput.value) descuentoInput.value = 10; try{recalcular();}catch(e){console.error('recalc descOn',e);} };
        descProvInput.oninput = () => { try{recalcular();}catch(e){console.error('recalc descProvInput',e);} };
        compraBs.oninput = () => { if(!(D.config.dolarRate > 0)){ mostrarNotificacion('Sin tasa registrada: conéctate a internet o fíjala manualmente', 'error'); return; } manual.costo = true; const bs = parseBs(compraBs.value); if(bs > 0) compraUsd.value = (bs / D.config.dolarRate).toFixed(2); try{recalcular();}catch(e){console.error('recalc compraBs',e);} };
        ventaBs.oninput = () => { if(!(D.config.dolarRate > 0)){ mostrarNotificacion('Sin tasa registrada: conéctate a internet o fíjala manualmente', 'error'); return; } manual.venta = true; const bs = parseBs(ventaBs.value); if(bs > 0) ventaUsd.value = (bs / D.config.dolarRate).toFixed(2); try{recalcular();}catch(e){console.error('recalc ventaBs',e);} };
        ventaUsd.oninput = () => { if(!(D.config.dolarRate > 0)){ mostrarNotificacion('Sin tasa registrada: conéctate a internet o fíjala manualmente', 'error'); return; } manual.venta = true; const usd = parseFloat(ventaUsd.value); if(!isNaN(usd) && usd > 0) { ventaBs.value = fmtPrecio(tRedondeo(usd * D.config.dolarRate)); sincronizarBs(ventaBs); } try{recalcular();}catch(e){console.error('recalc ventaUsd',e);} };
        descBs.oninput = () => { if(!(D.config.dolarRate > 0)){ mostrarNotificacion('Sin tasa registrada: conéctate a internet o fíjala manualmente', 'error'); return; } manual.desc = true; const bs = parseBs(descBs.value); if(bs > 0) descUsd.value = (bs / D.config.dolarRate).toFixed(2); try{recalcular();}catch(e){console.error('recalc descBs',e);} };
        descUsd.oninput = () => { if(!(D.config.dolarRate > 0)){ mostrarNotificacion('Sin tasa registrada: conéctate a internet o fíjala manualmente', 'error'); return; } manual.desc = true; const usd = parseFloat(descUsd.value); if(!isNaN(usd) && usd > 0) { descBs.value = fmtPrecio(tRedondeo(usd * D.config.dolarRate)); sincronizarBs(descBs); } try{recalcular();}catch(e){console.error('recalc descUsd',e);} };
        recalcBtn.onclick = () => { manual = { costo:false, venta:false, desc:false }; try{recalcular();}catch(e){console.error('recalc error',e);} };
        const proveedorInput = document.getElementById('proveedor'), sugProvDiv = document.getElementById('sugProveedor');
        if(proveedorInput && sugProvDiv) {
            proveedorInput.addEventListener('input', () => {
                const term = normalizeText(proveedorInput.value.trim());
                if(term.length < 1) { sugProvDiv.style.display = 'none'; return; }
                D.proveedores = D.proveedores || [];
                const matches = D.proveedores.filter(p => normalizeText(p.nombre).includes(term));
                if(matches.length === 0) { sugProvDiv.style.display = 'none'; return; }
                sugProvDiv.innerHTML = matches.slice(0,5).map(p => `<div class="sugerencia-item" style="cursor:pointer;padding:6px 10px;border-bottom:1px solid rgba(128,128,128,0.1)" data-nombre="${escapeHtml(p.nombre)}">${escapeHtml(p.nombre)}${p.contacto ? ' · '+escapeHtml(p.contacto) : ''}${p.telefono ? ' · '+escapeHtml(p.telefono) : ''}</div>`).join('');
                sugProvDiv.style.display = 'block';
            });
            proveedorInput.addEventListener('blur', () => { setTimeout(() => { sugProvDiv.style.display = 'none'; }, 200); });
            sugProvDiv.addEventListener('mousedown', (e) => {
                const item = e.target.closest('[data-nombre]');
                if(item) { proveedorInput.value = item.dataset.nombre; sugProvDiv.style.display = 'none'; proveedorInput.dispatchEvent(new Event('input')); }
            });
        }
        try{recalcular();}catch(e){console.error('recalc init error',e);}
        document.getElementById('guardarBtn').onclick = async () => {
            try {
            let tasaV = D.config.dolarRate;
            if(!(tasaV > 0)){ if(!(await garantizarTasa())) return; tasaV = D.config.dolarRate; }
            let costoRealUsd = parseFloat(compraUsd.value) || 0;
            let costoRealBs = parseBs(compraBs.value);
            let descProveedor = parseFloat(descProvInput.value) || 0;
            if(descProveedor >= 100) descProveedor = 99.99; if(descProveedor < 0) descProveedor = 0;
            let costoNetoUsd = tRedondeo(costoRealUsd * (1 - descProveedor / 100));
            let costoNetoBs = tRedondeo(costoNetoUsd * tasaV);
            if(costoRealBs <= 0 && costoRealUsd > 0){ costoRealBs = tRedondeo(costoRealUsd * tasaV); costoNetoUsd = tRedondeo(costoRealUsd * (1 - descProveedor / 100)); costoNetoBs = tRedondeo(costoNetoUsd * tasaV); }
            else if(costoRealUsd <= 0 && costoRealBs > 0){ costoRealUsd = tRedondeo(costoRealBs / tasaV); costoNetoUsd = tRedondeo(costoRealUsd * (1 - descProveedor / 100)); costoNetoBs = tRedondeo(costoNetoUsd * tasaV); }
            let precioVentaUsd = parseFloat(ventaUsd.value) || 0;
            let precioVentaBs = parseBs(ventaBs.value);
            if(precioVentaBs <= 0 && precioVentaUsd > 0) precioVentaBs = tRedondeo(precioVentaUsd * tasaV);
            else if(precioVentaUsd <= 0 && precioVentaBs > 0) precioVentaUsd = tRedondeo(precioVentaBs / tasaV);
            let porcentajeGanancia = parseFloat(gananciaInput.value) || 0;
            let porcentajeDescuento = descOn.checked ? (parseFloat(descuentoInput.value) || 0) : 0;
            if(porcentajeDescuento >= 100) porcentajeDescuento = 99.99; if(porcentajeDescuento < 0) porcentajeDescuento = 0;
            let precioDescuentoUsd = parseFloat(descUsd.value) || 0;
            let precioDescuentoBs = parseBs(descBs.value);
            if(precioDescuentoUsd <= 0 && porcentajeDescuento > 0 && precioVentaUsd > 0) precioDescuentoUsd = tRedondeo(precioVentaUsd * (1 - porcentajeDescuento / 100));
            if(precioDescuentoBs <= 0 && precioDescuentoUsd > 0) precioDescuentoBs = tRedondeo(precioDescuentoUsd * tasaV);
            precioVentaUsd = tRedondeo(precioVentaUsd); costoRealUsd = tRedondeo(costoRealUsd); precioDescuentoUsd = tRedondeo(precioDescuentoUsd);
            if(!document.getElementById('nombre').value.trim()) { await jamAlert('El nombre del producto es obligatorio', 'error'); return; }
            if(precioVentaBs <= 0) { await jamAlert('El precio de venta debe ser mayor a 0', 'error'); return; }
            let nombre = capitalizeWords(document.getElementById('nombre').value.trim());
            let nuevo = { id: esNuevo ? 'p'+Date.now()+'_'+Math.random().toString(36).slice(2,7) : prod.id, nombre, marca: document.getElementById('marca').value, codigo: document.getElementById('codigo').value, categoria: document.getElementById('categoria').value, tipo: document.getElementById('tipo').value, proveedor: document.getElementById('proveedor').value, stock: parseInt(document.getElementById('stock').value) || 0, precioVentaBs, precioVentaUsd, costoRealBs, costoRealUsd, descuentoProveedor: descProveedor, costoNetoUsd, costoNetoBs, porcentajeGanancia, porcentajeDescuento, precioDescuentoUsd, precioDescuentoBs, tasaRegistro: tasaV };
            await saveItem('productos', nuevo);
            const provNombre = document.getElementById('proveedor').value.trim();
            if(provNombre) {
                D.proveedores = D.proveedores || [];
                const yaExiste = D.proveedores.some(p => normalizeText(p.nombre) === normalizeText(provNombre));
                if(!yaExiste) {
                    const nuevoProv = { id: 'prov'+Date.now()+'_'+Math.random().toString(36).slice(2,7), nombre: capitalizeWords(provNombre), telefono: '', email: '', contacto: '', direccion: '' };
                    await saveItem('proveedores', nuevoProv);
                }
            }
            modal.remove();
            if(desdeBusqueda) renderHome(); else renderInventario();
            } catch(err) { console.error('ERROR GUARDAR PRODUCTO:', err); await jamAlert('Error al guardar: ' + err.message, 'error'); }
        };
    }
    
    window.eliminarProducto = async id => { const prod = D.productos.find(p => p.id === id); const aviso = prod && (parseInt(prod.stock)||0) > 0 ? `\n\n⚠️ Este producto tiene ${parseInt(prod.stock)} unidades en stock que se descargarán del conteo.` : ''; if(await jamConfirm('¿Eliminar producto?' + aviso)){ await deleteItem('productos', id); D.productos = D.productos.filter(p => p.id !== id); renderInventario(); } };
    
    // ==================== AJUSTE MANUAL DE STOCK ====================
    // Permite sumar/restar existencias de un producto con un motivo (merma,
    // ajuste de inventario, sobrante...). Cada ajuste queda registrado en el
    // propio producto (campo 'ajustes') para auditoría.
    window.ajustarStock = (id) => {
        const p = D.productos.find(x => x.id === id);
        if(!p) return;
        const modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:400px"><h3 class="text-xl font-bold mb-2"><i class="fas fa-right-left"></i> Ajustar stock</h3>
            <div class="text-sm mb-3" style="opacity:.7"><i class="fas fa-boxes-stacked"></i> <b>${escapeHtml(p.nombre)}</b> — stock actual: <b>${parseInt(p.stock)||0} u.</b></div>
            <div class="mb-3"><label>Unidades a sumar (+) o restar (−)</label><input type="number" id="ajusteDelta" value="0" step="1" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Motivo (obligatorio)</label><input type="text" id="ajusteMotivo" placeholder="Ej: merma, ajuste de inventario, devolución..." class="border rounded-xl p-2 w-full"></div>
            <div class="flex gap-3 mt-4"><button id="aplicarAjuste" class="btn-azul-redondeado btn-redondeado flex-1 py-2 font-bold">Aplicar</button><button id="cancelarAjuste" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('cancelarAjuste').onclick = () => modal.remove();
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
        document.getElementById('aplicarAjuste').onclick = async () => {
            const delta = parseInt(document.getElementById('ajusteDelta').value, 10) || 0;
            const motivo = document.getElementById('ajusteMotivo').value.trim();
            if(delta === 0){ await jamAlert('Indica una cantidad distinta de 0', 'error'); return; }
            if(!motivo){ await jamAlert('El motivo es obligatorio para auditar el ajuste', 'error'); return; }
            const nuevo = Math.max(0, (parseInt(p.stock)||0) + delta);
            p.stock = nuevo;
            p.ajustes = p.ajustes || [];
            p.ajustes.push({ fecha: new Date().toISOString(), delta, motivo });
            await saveItem('productos', p);
            modal.remove();
            renderInventario();
            mostrarNotificacion(delta > 0 ? `✅ Stock sumado (+${delta})` : `ℹ️ Stock restado (${delta})`, delta > 0 ? 'success' : 'info');
            setTimeout(verificarStockBajo, 400);
        };
    };
    
    window.copiarProducto = (id) => {
        let p = D.productos.find(x => x.id === id);
        if (!p) return;
        let h = new Date().getHours();
        let hoy = new Date().toLocaleDateString();
        let saludo = h < 12 ? '¡Buenos días' : h < 18 ? '¡Buenas tardes' : '¡Buenas noches';
        let hayStock = p.stock > 0;
        const pr = preciosProducto(p);
        let bsPrecio = fmtPrecio(pr.normalBs);
        let usdPrecio = pr.normalUsd ? '$' + pr.normalUsd + ' USD' : '';
        let msg = `${saludo}, estimado cliente! 🌟\n\n${hayStock ? '📦 SÍ tenemos en existencia:' : '❌ Por ahora NO tenemos en stock este producto. Le avisaremos cuando se reponga.'}\n\n📌 *${p.nombre.toUpperCase()}*\n${p.codigo ? '🔖 Código: ' + p.codigo + '\n' : ''}${p.marca ? '🏷️ Marca: ' + p.marca + '\n' : ''}${hayStock ? '💰 *Precio por unidad:*' : '💰 *Precio de referencia:*'} ${bsPrecio} Bs  |  ${usdPrecio}\n${pr.tieneDesc ? `🏷️ *OFERTA:* ${fmtPrecio(pr.desc.bs)} Bs | $${pr.desc.usd} USD (-${typeof p.porcentajeDescuento === 'number' ? p.porcentajeDescuento : 0}%)\n` : ''}📅 Precio en Bs válido solo para el ${hoy} (sujeto a cambios tasa BCV).\n💵 El precio en USD se mantiene fijo.\n\n${hayStock ? '✅ Por favor confirme su pedido para gestionarlo con anticipación. Le enviaremos confirmación una vez verificado el pago. 🙏' : ''}`;
        navigator.clipboard.writeText(msg).then(() => mostrarNotificacion('✅ Copiado al portapapeles', 'success')).catch(() => {});
    };
    
    // ==================== CRUD GENÉRICO ====================
    async function renderCrud(store, titulo, campos){
        let bloqueado = volverBloqueado, accent = D.config.theme;
        let items = await getAll(store); D[store] = items;
        document.getElementById('appRoot').innerHTML = `<div class="page-header-fixed"><div class="module-header"><div class="flex items-center" style="min-width:0"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'${titulo}')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">${titulo}</h2>${store === 'proveedores' ? `<span class="module-crumb-sep">/</span><button id="btnIrEntregas" class="btn-cabezal-sub" type="button" title="Entregas de proveedores">Entregas</button>` : ''}${store === 'clientes' ? `<span class="module-crumb-sep">/</span><button id="btnIrCartera" class="btn-cabezal-sub" type="button" title="Cartera por cobrar (créditos de clientes)">Cartera</button>` : ''}</div><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div><div class="page-container"><div class="mb-3 relative"><i class="fas fa-search absolute left-3 top-3 text-gray-400"></i><input type="text" id="searchCrud" placeholder="Buscar..." class="pl-9 pr-3 py-2 border-2 rounded-xl w-full" style="border-color:${accent}"></div><div class="flex gap-2 mb-4 items-center"><button id="agregarBtn" class="btn-azul-redondeado btn-redondeado py-2 px-4">+ Agregar ${titulo}</button></div><div id="listaCrud" class="scroll-area"></div></div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        let search = document.getElementById('searchCrud'), agregar = document.getElementById('agregarBtn');
        const btnEntregas = document.getElementById('btnIrEntregas');
        if(btnEntregas) btnEntregas.onclick = () => renderEntregas();
        const btnCartera = document.getElementById('btnIrCartera');
        if(btnCartera) btnCartera.onclick = () => renderCartera();
        let renderLista = filtro => {
            let norm = normalizeText(filtro);
            let filt = items.filter(i => { let texto = campos.map(c => (i[c]!==undefined && i[c]!==null ? String(i[c]) : '')).join(' '); return normalizeText(texto).includes(norm); });
            let cont = document.getElementById('listaCrud'); if(!cont) return;
            if(!filt.length){ cont.innerHTML = '<div class="text-center py-4 text-gray-500">No hay registros</div>'; return; }
            cont.innerHTML = filt.map(i => {
                let detalles = '';
                if(store === 'clientes') detalles = `<div class="text-xs text-gray-500 mt-1"><i class="fas fa-phone"></i> ${escapeHtml(i.telefono||'')} | <i class="fas fa-envelope"></i> ${escapeHtml(i.email||'')}</div>${(parseFloat(i.adeudo)||0) > 0 ? `<div class="text-xs font-bold mt-1" style="color:#ef4444"><i class="fas fa-credit-card"></i> Adeuda: ${fmtPrecio(i.adeudo)} Bs</div>` : `<div class="text-xs mt-1" style="color:#10b981"><i class="fas fa-credit-card"></i> Sin deudas</div>`}`;
                else if(store === 'proveedores') detalles = `<div class="text-xs text-gray-500 mt-1"><i class="fas fa-phone"></i> ${escapeHtml(i.telefono||'')} | <i class="fas fa-user"></i> ${escapeHtml(i.contacto||'')}</div>`;
                else if(store === 'gastos') detalles = `<div class="text-xs text-gray-500 mt-1"><i class="fas fa-sack-dollar"></i> ${fmtPrecio(i.montoBs||0)} Bs | <i class="fas fa-calendar-days"></i> ${escapeHtml(fmtFechaDisplay(i.fecha)||'')}</div>`;
                else if(store === 'empleados') detalles = `<div class="text-xs text-gray-500 mt-1"><i class="fas fa-briefcase"></i> ${escapeHtml(i.cargo||'')} | <i class="fas fa-money-bill-wave"></i> ${fmtPrecio(i.salarioBs||0)} Bs${i.diaPago ? ` | <i class="fas fa-calendar-days"></i> Día de pago: ${escapeHtml(i.diaPago)}` : ''}${i.fechaPago ? ` | <i class="fas fa-circle-check"></i> Pagado: ${escapeHtml(fmtFechaDisplay(i.fechaPago)||'')}` : ''}</div>`;
                let nombreTarjeta = (i.nombre && String(i.nombre).trim()) ? i.nombre : (i[campos[0]] || 'Sin nombre');
                return `<div class="client-card" data-id="${i.id}"><div class="font-bold break-words">${escapeHtml(String(nombreTarjeta))}</div>${detalles}<div class="card-btns"><button class="btn-editar-item btn-editar-redondeado"><i class="fas fa-pen"></i> Editar</button>${store === 'empleados' ? `<button class="btn-pagar-empleado btn-verde-redondeado"><i class="fas fa-sack-dollar"></i> Pagar</button>` : ''}${store === 'clientes' ? `<button class="btn-abono-cliente btn-verde-redondeado"><i class="fas fa-money-bill-wave"></i> Abono</button>` : ''}<button class="btn-eliminar-item btn-eliminar-redondeado"><i class="fas fa-trash"></i> Eliminar</button></div></div>`;
            }).join('');
            document.querySelectorAll('.btn-editar-item').forEach((btn, idx) => { let it = filt[idx]; btn.onclick = () => window.mostrarFormCrud(store, it.id, campos, false); });
            document.querySelectorAll('.btn-eliminar-item').forEach((btn, idx) => { let it = filt[idx]; btn.onclick = () => eliminarItemCrud(store, it.id); });
            document.querySelectorAll('.btn-pagar-empleado').forEach((btn, idx) => { let it = filt[idx]; btn.onclick = () => pagarEmpleado(it.id); });
            document.querySelectorAll('.btn-abono-cliente').forEach((btn, idx) => { let it = filt[idx]; btn.onclick = () => registrarAbono(it.id); });
        };
        search.oninput = e => renderLista(e.target.value.toLowerCase());
        agregar.onclick = () => window.mostrarFormCrud(store, null, campos, false);
        renderLista('');
    }
    
    async function eliminarItemCrud(store, id){
        if(store === 'clientes'){
            const cli = (D.clientes || []).find(c => c.id === id);
            if(cli && (parseFloat(cli.adeudo) || 0) > 0){ await jamAlert(`No se puede eliminar: ${cli.nombre} tiene un adeudo pendiente de ${fmtPrecio(cli.adeudo)} Bs. Registra un abono antes.`, 'error'); return; }
        }
        if(await jamConfirm('¿Eliminar este elemento?')){
            await deleteItem(store, id);
            D[store] = D[store].filter(i => i.id !== id);
            if(store === 'clientes') renderCrud('clientes','Clientes',['cedula','nombre','telefono','direccion','email']);
            else if(store === 'proveedores') renderCrud('proveedores','Proveedores',['rif','nombre','telefono','contacto','direccion']);
            else if(store === 'gastos') renderCrud('gastos','Gastos',['concepto','montoBs','categoria','fecha']);
            else if(store === 'empleados') renderCrud('empleados','Empleados',['cedula','nombre','cargo','salarioBs','diaPago','fechaPago','fechaContrato']);
        }
    }
    
    // ==================== NÓMINA ====================
    window.pagarEmpleado = async (id) => {
        const emp = (D.empleados || []).find(e => e.id === id);
        if(!emp) return;
        const monto = parseFloat(emp.salarioBs) || 0;
        if(!(monto > 0)){ await jamAlert('Este empleado no tiene salario registrado (Salario Bs). Edítelo primero.', 'error'); return; }
        const ok = await jamConfirm(`¿Registrar pago de nómina de ${emp.nombre} por ${fmtPrecio(monto)} Bs?`);
        if(!ok) return;
        const hoy = msToDateStr(Date.now());
        const gasto = { id:'g'+Date.now()+'_'+Math.random().toString(36).slice(2,7), concepto:'Nómina: '+emp.nombre+' (pago)', montoBs: monto, categoria:'Nómina', fecha: hoy, timestamp: Date.now() };
        await saveItem('gastos', gasto);
        emp.fechaPago = hoy; emp.fechaPagoTs = Date.now();
        await saveItem('empleados', emp);
        D.empleados = await getAll('empleados');
        mostrarNotificacion('Pago de nómina registrado y descontado', 'success');
        renderCrud('empleados','Empleados',['cedula','nombre','cargo','salarioBs','diaPago','fechaPago','fechaContrato']);
    };
    function nóminaPendienteMes(ms){
        let total = 0; const hoy = new Date(ms);
        (D.empleados || []).forEach(e => {
            const sal = parseFloat(e.salarioBs) || 0; if(!(sal > 0)) return;
            const pagado = e.fechaPagoTs || (e.fechaPago ? tsFechaISO(e.fechaPago) : 0);
            const pagadoEnMes = pagado && new Date(pagado).getFullYear() === hoy.getFullYear() && new Date(pagado).getMonth() === hoy.getMonth();
            if(!pagadoEnMes) total += sal;
        });
        return total;
    }
    function nóminaPendienteHTML(){
        const emp = (D.empleados || []).filter(e => (parseFloat(e.salarioBs)||0) > 0);
        if(!emp.length) return '<div class="text-xs" style="opacity:.5;text-align:center;padding:8px">Sin empleados con salario registrado</div>';
        let html = ''; const base = Date.now();
        emp.forEach(e => {
            const pagado = e.fechaPagoTs || (e.fechaPago ? tsFechaISO(e.fechaPago) : 0);
            const pagadoEnMes = pagado && new Date(pagado).getFullYear() === new Date(base).getFullYear() && new Date(pagado).getMonth() === new Date(base).getMonth();
            html += `<div class="flex justify-between items-center" style="padding:5px 0;border-bottom:1px solid rgba(128,128,128,.1)"><span class="text-xs" style="opacity:.7"><i class="fas fa-user-tie"></i> ${escapeHtml(e.nombre)}</span><span class="text-xs font-bold" style="color:${pagadoEnMes ? '#10b981' : '#f59e0b'}">${pagadoEnMes ? 'Pagado ✓' : fmtPrecio(e.salarioBs) + ' Bs'}</span></div>`;
        });
        return html;
    }
    
    // ==================== ENTREGAS PROVEEDORES ====================
    async function renderEntregas(){
        currentSub = 'entregas';
        let bloqueado = volverBloqueado, accent = D.config.theme;
        D.entregas = await getAll('entregas');
        document.getElementById('appRoot').innerHTML = `<div class="page-header-fixed"><div class="module-header"><div class="flex items-center" style="min-width:0"><span class="module-crumb" onclick="navigateTo('proveedores')" title="Ir a Proveedores">Proveedores</span><span class="module-crumb-sep">/</span><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Entregas')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Entregas</h2></div><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div><div class="page-container">
            <div class="flex gap-2 mb-4 items-center"><button id="btnNuevaEntrega" class="btn-azul-redondeado btn-redondeado py-2 px-4">+ Nueva entrega</button><button id="btnCalendarioEntregas" class="btn-redondeado py-2 px-4" style="border:1.5px solid ${accent};color:${accent}"><i class="fas fa-calendar-days"></i> Calendario</button></div>
            <div class="config-section" style="margin-bottom:16px"><div class="config-section-title" style="font-size:.75rem;font-weight:700;opacity:.6;margin-bottom:8px">Estado de entregas</div><div id="resumenEntregas"></div></div>
            <h3 class="font-bold mb-2">Registro de entregas</h3>
            <div id="listaEntregas" class="scroll-area"></div>
        </div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        document.getElementById('btnNuevaEntrega').onclick = () => mostrarFormEntrega(null);
        document.getElementById('btnCalendarioEntregas').onclick = () => mostrarCalendarioEntregas();
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const aFechaT = (f) => { const p = String(f||'').split('-').map(Number); return p.length === 3 ? new Date(p[0], (p[1]||1)-1, p[2]||1) : hoy; };
        D.entregas.forEach(e => { e._fechaDT = aFechaT(e.fecha); e._vencDT = aFechaT(e.fechaVencimiento); });
        const pendientes = D.entregas.filter(e => !e.estado || e.estado === 'pendiente');
        const vencidas = pendientes.filter(e => e._vencDT.getTime() < hoy.getTime());
        const hoyMismo = D.entregas.filter(e => e._fechaDT.getTime() === hoy.getTime());
        document.getElementById('resumenEntregas').innerHTML = `
            <div class="grid grid-cols-3 gap-2">
                <div class="card-bcv" style="padding:10px;text-align:center"><div class="font-black text-lg" style="color:${accent}">${pendientes.length}</div><div class="text-xs opacity-70">Pendientes</div></div>
                <div class="card-bcv" style="padding:10px;text-align:center"><div class="font-black text-lg" style="color:#ef4444">${vencidas.length}</div><div class="text-xs opacity-70">Vencidas</div></div>
                <div class="card-bcv" style="padding:10px;text-align:center"><div class="font-black text-lg" style="color:#10b981">${hoyMismo.length}</div><div class="text-xs opacity-70">Hoy</div></div>
            </div>`;
        renderListaEntregas('');
        inyectarBotonAyudaModulo();
    }
    function estadoEntregaBadge(e){
        const st = e.estado || 'pendiente';
        const col = st === 'recibido' ? '#10b981' : st === 'salida' ? '#f59e0b' : '#ef4444';
        const lbl = st === 'recibido' ? 'Recibida' : st === 'salida' ? 'Salida' : 'Pendiente';
        return `<span class="text-[10px] font-bold" style="color:${col};border:1px solid ${col};border-radius:999px;padding:1px 8px">${lbl}</span>`;
    }
    // Una entrega puede tener UNO o VARIOS productos (renglones producto+cantidad).
    // 'items' es el formato nuevo; las entregas antiguas solo tienen
    // producto/cantidad → se tratan como un único renglón (retrocompatible).
    function itemsEntrega(e){
        if(!e) return [];
        if(Array.isArray(e.items) && e.items.length){
            return e.items.map(it => ({ producto: (it && it.producto) ? String(it.producto) : '', cantidad: parseInt(it && it.cantidad) || 0 }));
        }
        return [{ producto: e.producto || '', cantidad: parseInt(e.cantidad) || 0 }];
    }
    function totalUnidadesEntrega(e){ return itemsEntrega(e).reduce((s, it) => s + it.cantidad, 0); }
    function esEntregaVarios(e){ return itemsEntrega(e).length > 1; }
    function tituloProductoEntrega(e){ const its = itemsEntrega(e); return esEntregaVarios(e) ? 'Productos varios' : (its[0] ? its[0].producto : ''); }
    function renderListaEntregas(norm){
        let filtro = (D.entregas || []).filter(e => {
            let texto = [e.proveedor||'', e.producto||'', ...((e.items||[]).map(i => i.producto)), e.notas||'', e.estado||''].join(' ');
            return normalizeText(texto).includes(norm);
        }).sort((a,b) => (a._fechaDT||0) - (b._fechaDT||0));
        let cont = document.getElementById('listaEntregas'); if(!cont) return;
        if(!filtro.length){ cont.innerHTML = '<div class="text-center py-4 text-gray-500">No hay entregas registradas</div>'; return; }
        cont.innerHTML = filtro.map(e => {
            const varios = esEntregaVarios(e), totalU = totalUnidadesEntrega(e), prim = itemsEntrega(e)[0] || {};
            return `
            <div class="client-card" data-id="${e.id}" style="cursor:pointer" onclick="window.mostrarTicketEntrega('${e.id}')" title="Ver pedido">
                <div class="flex justify-between items-start"><div class="font-bold break-words">${escapeHtml(e.proveedor||'Proveedor')} — ${varios ? '<i class="fas fa-boxes-stacked" style="opacity:.7"></i> Productos varios' : escapeHtml(prim.producto||'')}</div>${estadoEntregaBadge(e)}</div>
                <div class="text-xs text-gray-500 mt-1"><i class="fas fa-calendar-days"></i> Entrega: ${escapeHtml(fmtFechaDisplay(e.fecha)||'')}${e.hora ? ' ' + escapeHtml(e.hora) : ''} | <i class="fas fa-stopwatch"></i> Lapso: ${e.lapsoDias ? escapeHtml(e.lapsoDias) + ' día(s)' : '—'} | <i class="fas fa-calendar-days"></i> Vence: ${escapeHtml(fmtFechaDisplay(e.fechaVencimiento)||'—')} | <i class="fas fa-boxes-stacked"></i> ${varios ? 'Total: ' : ''}${totalU} u.</div>
                ${e.notas ? `<div class="text-xs mt-1" style="color:#f59e0b"><i class="fas fa-pen"></i> ${escapeHtml(e.notas)}</div>` : ''}
                <div class="card-btns"><button class="btn-editar-entrega btn-editar-redondeado"><i class="fas fa-pen"></i> Editar</button><button class="btn-estado-entrega btn-verde-redondeado"><i class="fas fa-rotate"></i> Estado</button><button class="btn-eliminar-entrega btn-eliminar-redondeado"><i class="fas fa-trash"></i> Eliminar</button></div>
            </div>`; }).join('');
        document.querySelectorAll('.btn-editar-entrega').forEach((btn, idx) => { btn.onclick = (ev) => { ev.stopPropagation(); mostrarFormEntrega(filtro[idx].id); }; });
        document.querySelectorAll('.btn-estado-entrega').forEach((btn, idx) => { const e = filtro[idx]; btn.onclick = (ev) => { ev.stopPropagation(); cicloEstadoEntrega(e); }; });
        document.querySelectorAll('.btn-eliminar-entrega').forEach((btn, idx) => {
            btn.onclick = async (ev) => { ev.stopPropagation(); const e = filtro[idx]; if(await jamConfirm('¿Eliminar esta entrega?')){ await deleteItem('entregas', e.id); renderEntregas(); } };
        });
    }
    // ==================== ENTREGAS → STOCK ====================
    // Al marcar una entrega como "Recibida", el stock del/los producto(s) cuyo
    // nombre coincide se incrementa. 'stockAplicado' evita contar dos veces.
    function productosEntrega(nombreProducto){
        if(!nombreProducto) return [];
        const nom = normalizeText(nombreProducto);
        return (D.productos || []).filter(p => normalizeText(p.nombre) === nom);
    }
    function ajustarStockEntregaProductos(nombreProducto, delta){
        if(!delta) return 0;
        const found = productosEntrega(nombreProducto);
        if(found.length === 0){ mostrarNotificacion('⚠️ Ningún producto coincide exactamente con "' + nombreProducto + '": el stock no se ajustó', 'error'); return 0; }
        found.forEach(p => { p.stock = Math.max(0, (parseInt(p.stock)||0) + delta); saveItem('productos', p); });
        return found.length;
    }
    function aplicarEntregaStock(e){
        if(!e || e.stockAplicado) return 0;
        const items = itemsEntrega(e);
        let ok = 0;
        items.forEach(it => {
            if(!(parseInt(it.cantidad) > 0) || !it.producto) return;
            const found = productosEntrega(it.producto);
            if(found.length === 0){ mostrarNotificacion('⚠️ Ningún producto coincide exactamente con "' + it.producto + '": el stock no se ajustó', 'error'); return; }
            found.forEach(p => { p.stock = (parseInt(p.stock)||0) + it.cantidad; saveItem('productos', p); });
            ok++;
        });
        if(ok > 0) e.stockAplicado = true;
        return ok;
    }
    function cicloEstadoEntrega(e){
        const orden = ['pendiente','salida','recibido'];
        const i = orden.indexOf(e.estado || 'pendiente');
        const estadoPrevio = e.estado || 'pendiente';
        e.estado = orden[(i + 1) % 3];
        if(e.estado === 'recibido' && estadoPrevio !== 'recibido') aplicarEntregaStock(e);
        else if(estadoPrevio === 'recibido' && e.estado !== 'recibido'){ itemsEntrega(e).forEach(it => ajustarStockEntregaProductos(it.producto, -it.cantidad)); e.stockAplicado = false; }
        saveItem('entregas', e).then(() => renderEntregas());
    }
    async function mostrarFormEntrega(id){
        const e = id ? (D.entregas || []).find(x => x.id === id) : null;
        await cargarProveedoresSiNo();
        const listProv = (D.proveedores || []).map(p => p.nombre).join('|');
        const accent = D.config.theme;
        let modal = document.createElement('div'); modal.className = 'modal-form';
        // Renglones de productos: cada fila = [producto | cantidad | (+)]
        // El (+) agrega otra fila idéntica debajo (variante o producto nuevo).
        let currentItems = e ? itemsEntrega(e) : [{ producto: '', cantidad: 1 }];
        modal.innerHTML = `<div class="modal-form-content" style="max-width:460px"><h3 class="text-xl font-bold mb-3">${e ? 'Editar entrega' : 'Nueva entrega'}</h3>
            <div class="mb-2"><label class="opacity-70">Proveedor</label><input id="entProv" list="listProvEnt" value="${escapeHtml(e?.proveedor||'')}" placeholder="Nombre del proveedor..." class="border rounded p-1 w-full" autocomplete="off"><datalist id="listProvEnt">${listProv ? listProv.split('|').map(n => `<option value="${escapeHtml(n)}">`).join('') : ''}</datalist></div>
            <div class="mb-2"><label class="opacity-70"><i class="fas fa-boxes-stacked"></i> Productos del pedido</label><div id="entItems"></div><div class="text-xs mt-1" style="opacity:.6"><i class="fas fa-calculator"></i> Total del pedido: <b id="entTotalUnid">—</b><span style="opacity:.55"> · toca (+) para añadir otro producto</span></div></div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 46px minmax(0,1fr);gap:6px;align-items:end;margin-bottom:8px">
                <div><label class="opacity-70" style="font-size:10px">Fech/entreg</label><input type="date" id="entFecha" value="${e?.fecha || msToDateStr(Date.now())}" class="border rounded p-1 w-full" style="min-width:0;font-size:12px"></div>
                <div><label class="opacity-70" style="font-size:10px">Hora</label><input type="time" id="entHora" value="${e?.hora || ''}" class="border rounded p-1 w-full" style="min-width:0;font-size:12px"></div>
                <div><label class="opacity-70" style="font-size:10px;display:block">Días</label><input type="number" id="entLapso" value="${e?.lapsoDias || 1}" min="0" class="border rounded p-1" style="min-width:0;font-size:12px;width:46px;text-align:center" title="Lapso de entrega en días (ej: 99 ≈ 3 meses)"></div>
                <div><label class="opacity-70" style="font-size:10px">Vence</label><input type="date" id="entVenc" value="${e?.fechaVencimiento || ''}" class="border rounded p-1 w-full" style="min-width:0;font-size:12px"></div>
            </div>
            <div class="mb-2"><label class="opacity-70">Estado</label><select id="entEstado" class="border rounded p-1 w-full"><option value="pendiente" ${(!e || e.estado==='pendiente')?'selected':''}>Pendiente</option><option value="salida" ${e?.estado==='salida'?'selected':''}>En salida</option><option value="recibido" ${e?.estado==='recibido'?'selected':''}>Recibida</option></select></div>
            <div class="mb-2"><label class="opacity-70"><i class="fas fa-pen"></i> Notas (problemas / enmiendas)</label><textarea id="entNotas" rows="2" class="border rounded p-1 w-full" placeholder="Notas, incidencias, enmiendas...">${escapeHtml(e?.notas||'')}</textarea></div>
            <div class="flex gap-3 mt-4"><button id="guardarEnt" class="btn-azul-redondeado btn-redondeado flex-1 py-2 font-bold">Guardar</button><button id="cancelarEnt" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('cancelarEnt').onclick = () => modal.remove();
        const itemsCont = document.getElementById('entItems');
        const syncFromDOM = () => {
            itemsCont.querySelectorAll('.ent-ip').forEach(inp => { const i = Number(inp.dataset.idx); currentItems[i] = currentItems[i] || {}; currentItems[i].producto = inp.value; });
            itemsCont.querySelectorAll('.ent-ic').forEach(inp => { const i = Number(inp.dataset.idx); currentItems[i] = currentItems[i] || {}; currentItems[i].cantidad = parseFloat(inp.value) || 0; });
            const totEl = document.getElementById('entTotalUnid');
            if(totEl) totEl.textContent = currentItems.reduce((s, it) => s + (it.cantidad||0), 0) + ' u.';
        };
        const pintarItems = () => {
            itemsCont.innerHTML = currentItems.map((it, idx) => `
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
                    <input class="ent-ip border rounded p-1" data-idx="${idx}" value="${escapeHtml(it.producto||'')}" placeholder="Producto / descripción" style="flex:1;min-width:0;font-size:13px">
                    <input type="number" class="ent-ic border rounded p-1" data-idx="${idx}" value="${it.cantidad||''}" min="0" style="width:62px;min-width:0;font-size:13px" title="Cantidad" placeholder="Cant.">
                    <button type="button" class="ent-ia" data-idx="${idx}" title="Agregar otro producto" style="flex:0 0 auto;width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid ${accent};color:${accent};background:transparent;border-radius:50%;cursor:pointer"><i class="fas fa-plus" style="font-size:11px"></i></button>
                    <button type="button" class="ent-ix" data-idx="${idx}" title="Quitar renglón" style="${idx > 0 ? 'flex:0 0 auto;width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid #ef4444;color:#ef4444;background:transparent;border-radius:50%;cursor:pointer' : 'display:none'}"><i class="fas fa-times" style="font-size:11px"></i></button>
                </div>`).join('');
            syncFromDOM();
        };
        itemsCont.oninput = () => syncFromDOM();
        itemsCont.onclick = (ev) => {
            const btnAdd = ev.target.closest('.ent-ia');
            const btnDel = ev.target.closest('.ent-ix');
            if(btnAdd){ syncFromDOM(); currentItems.push({ producto: '', cantidad: 1 }); pintarItems(); ev.preventDefault(); }
            if(btnDel){ syncFromDOM(); const i = Number(btnDel.dataset.idx); if(currentItems.length > 1){ currentItems.splice(i, 1); pintarItems(); } }
        };
        pintarItems();
        const fechaEl = document.getElementById('entFecha'), lapsoEl = document.getElementById('entLapso'), vencEl = document.getElementById('entVenc');
        const calcVenc = () => {
            const fs = fechaEl.value, lap = parseInt(lapsoEl.value) || 0;
            if(fs && lap > 0){ const p = fs.split('-').map(Number); const d = new Date(p[0], (p[1]||1)-1, (p[2]||1) + lap); vencEl.value = msToDateStr(d.getTime()); }
        };
        fechaEl.onchange = () => calcVenc(); lapsoEl.oninput = () => calcVenc();
        document.getElementById('guardarEnt').onclick = async () => {
            syncFromDOM();
            const prov = document.getElementById('entProv').value.trim();
            const items = currentItems.filter(it => (it.producto||'').trim() !== '' && (it.cantidad||0) > 0).map(it => ({ producto: String(it.producto).trim(), cantidad: it.cantidad }));
            if(!prov){ await jamAlert('El proveedor es obligatorio', 'error'); return; }
            if(!items.length){ await jamAlert('Agrega al menos un producto con su cantidad', 'error'); return; }
            const fecha = document.getElementById('entFecha').value;
            const fechaVencimiento = vencEl.value || fecha;
            const primero = items[0];
            let nueva = { id: e ? e.id : 'en'+Date.now()+'_'+Math.random().toString(36).slice(2,7), proveedor: prov, items, producto: primero.producto, cantidad: primero.cantidad, fecha, hora: document.getElementById('entHora').value || '', lapsoDias: parseInt(lapsoEl.value) || 0, fechaVencimiento, estado: document.getElementById('entEstado').value, notas: document.getElementById('entNotas').value.trim(), timestamp: Date.now() };
            // Stock: si la entrega ya estaba aplicada, revierte TODOS los renglones
            // anteriores y aplica los nuevos (o ninguno si dejó de ser "recibida").
            if(e && e.stockAplicado && nueva.estado === 'recibido'){
                itemsEntrega(e).forEach(it => ajustarStockEntregaProductos(it.producto, -it.cantidad));
                aplicarEntregaStock(nueva);
            } else if(e && e.stockAplicado && nueva.estado !== 'recibido'){
                itemsEntrega(e).forEach(it => ajustarStockEntregaProductos(it.producto, -it.cantidad));
                nueva.stockAplicado = false;
            } else if(nueva.estado === 'recibido' && !nueva.stockAplicado){
                aplicarEntregaStock(nueva);
            }
            await saveItem('entregas', nueva);
            modal.remove();
            renderEntregas();
        };
    }
    // ==================== PEDIDO (TICKET VIRTUAL) ====================
    // Al tocar una tarjeta de entrega se despliega un tiket de PEDIDO con el
    // detalle completo: encabezado, proveedor, fecha del pedido, cada producto
    // con su cantidad, el total de unidades y las fechas del pedido. Lleva los
    // mismos botones del ticket de ventas (imprimir / WhatsApp / imagen / copiar)
    // salvo el de anular, que es exclusivo de ventas.
    function generarPedidoTicketHTML(e){
        const items = itemsEntrega(e);
        const totalU = items.reduce((s, it) => s + it.cantidad, 0);
        const logoHtml = D.config.logoDataUrl ? `<div class="logo"><img src="${D.config.logoDataUrl}" alt="logo" style="max-height:56px;margin:0 auto 4px;display:block"></div>` : '';
        const itemsHtml = items.map(it => `<div class="item"><span>${escapeHtml(it.cantidad)} x ${escapeHtml(it.producto)}</span><span></span></div>`).join('');
        const estEtq = e.estado === 'recibido' ? 'Recibida' : e.estado === 'salida' ? 'En salida' : 'Pendiente';
        const estadoCol = e.estado === 'recibido' ? '#10b981' : e.estado === 'salida' ? '#f59e0b' : '#ef4444';
        return `<div class="ticket-virtual" id="ticketParaImprimir">${logoHtml}<div class="header"><h3>${escapeHtml(D.config.empresa.nombre)}</h3>${D.config.empresa.direccion ? `<p>${escapeHtml(D.config.empresa.direccion)}</p>` : ''}${D.config.empresa.telefono ? `<p><i class="fas fa-phone"></i> ${escapeHtml(D.config.empresa.telefono)}</p>` : ''}${D.config.empresa.rif ? `<p>RIF: ${escapeHtml(D.config.empresa.rif)}</p>` : ''}</div><div style="text-align:center;font-weight:800;letter-spacing:2px;margin:6px 0 4px;font-size:13px">PEDIDO VIRTUAL</div><div class="ticket-line"><span>Pedido N°</span><span>${escapeHtml(e.id||'')}</span></div><div class="ticket-line"><span>Proveedor</span><span>${escapeHtml(e.proveedor||'')}</span></div><div class="ticket-line"><span>Fecha del pedido</span><span>${escapeHtml(fmtFechaDisplay(e.fecha)||'')}${e.hora ? ' ' + escapeHtml(e.hora) : ''}</span></div><div class="items">${itemsHtml}</div><div class="ticket-line total"><span>TOTAL</span><span>${totalU} u.</span></div><div class="ticket-line"><span>Entregar</span><span>${escapeHtml(fmtFechaDisplay(e.fecha)||'—')}${e.hora ? ' '+escapeHtml(e.hora) : ''}</span></div><div class="ticket-line"><span>Lapso</span><span>${e.lapsoDias ? escapeHtml(e.lapsoDias)+' día(s)' : '—'}</span></div><div class="ticket-line"><span>Vence</span><span>${escapeHtml(fmtFechaDisplay(e.fechaVencimiento)||'—')}</span></div><div class="ticket-line"><span>Estado</span><span style="color:${estadoCol};font-weight:700">${estEtq}</span></div>${e.notas ? `<div class="ticket-line"><span style="color:#b45309"><i class="fas fa-pen"></i> Notas</span><span style="color:#b45309">${escapeHtml(e.notas)}</span></div>` : ''}<div class="footer"><p style="font-size:9px;opacity:0.6;margin-top:8px">Pedido de compra al proveedor</p><p>${escapeHtml(D.config.empresa.nombre)}</p></div></div>`;
    }
    function mostrarTicketEntrega(id){
        const e = (D.entregas || []).find(x => x.id === id); if(!e) return;
        const modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:350px;text-align:center">${generarPedidoTicketHTML(e)}<div class="ticket-buttons"><button class="ticket-btn btn-print" onclick="window.imprimirPedidoEntrega('${e.id}')"><i class="fas fa-print"></i> Imprimir</button><button class="ticket-btn btn-wa" onclick="window.enviarPedidoEntregaWhatsApp('${e.id}')"><i class="fab fa-whatsapp"></i> WhatsApp</button><button class="ticket-btn btn-img" onclick="window.descargarTicketImagen()"><i class="fas fa-download"></i> Imagen</button><button class="ticket-btn btn-copy" onclick="window.copiarTicketTexto()"><i class="fas fa-copy"></i> Copiar</button><button class="ticket-btn btn-cerrar" onclick="window.cerrarTicketModalYVolverInicio()"><i class="fas fa-times"></i> Cerrar</button></div></div>`;
        document.body.appendChild(modal);
        window.modalTicketActual = modal;
        modal.onclick = ev => { if(ev.target === modal) window.cerrarTicketModalYVolverInicio(); };
    }
    window.mostrarTicketEntrega = mostrarTicketEntrega;
    window.imprimirPedidoEntrega = (id) => {
        const e = (D.entregas || []).find(x => x.id === id); if(!e) return;
        if (window.AndroidBridge && typeof AndroidBridge.printTicket === 'function') {
            const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="style.css"><style>html,body{margin:0;padding:0;background:#fff}@media print{@page{margin:8px}body{padding:0}.ticket-buttons{display:none!important}}</style></head><body>' + generarPedidoTicketHTML(e) + '</body></html>';
            try { AndroidBridge.printTicket(html, 'Pedido ' + e.id); }
            catch(err) { imprimirPedidoTexto(e); }
        } else {
            imprimirPedidoTexto(e);
        }
    };
    function imprimirPedidoTexto(e){
        // Impresión 42 columnas (80mm) tipo ticketera: mismo estilo que la venta
        const W = 42;
        const rep = (c, n) => { let r = ''; for (let i=0; i<n; i++) r += c; return r; };
        const padR = (s, n) => { s = String(s); return s.length >= n ? s.slice(0,n) : s + rep(' ', n - s.length); };
        const padL = (s, n) => { s = String(s); return s.length >= n ? s.slice(-n) : rep(' ', n - s.length) + s; };
        const cen = (s) => { s = String(s); let p = Math.max(0, W - s.length); return rep(' ', Math.floor(p/2)) + s + rep(' ', Math.ceil(p/2)); };
        const eq  = rep('=', W), gui = rep('-', W);
        const esc = (v) => v ? String(v).replace(/[<>&"']/g, '') : '';
        const items = itemsEntrega(e);
        const totalU = items.reduce((s, it) => s + it.cantidad, 0);
        const estEtq = e.estado === 'recibido' ? 'RECIBIDA' : e.estado === 'salida' ? 'EN SALIDA' : 'PENDIENTE';
        let t = '';
        t += cen(D.config.empresa.nombre.toUpperCase()) + '\n';
        if (D.config.empresa.direccion) t += cen(esc(D.config.empresa.direccion)) + '\n';
        if (D.config.empresa.telefono) t += cen('TEL: ' + esc(D.config.empresa.telefono)) + '\n';
        t += eq + '\n';
        t += cen('PEDIDO VIRTUAL') + '\n';
        t += 'Pedido: ' + esc(e.id) + '\n';
        t += 'Proveedor: ' + esc(e.proveedor) + '\n';
        t += 'Fecha pedido: ' + esc(fmtFechaDisplay(e.fecha)||'') + (e.hora ? ' ' + esc(e.hora) : '') + '\n';
        t += eq + '\n';
        items.forEach(it => { t += padR(esc(it.producto), W - 12) + padL(String(it.cantidad) + ' u', 12) + '\n'; });
        t += gui + '\n';
        t += padR('TOTAL', W - 12) + padL(String(totalU) + ' u', 12) + '\n';
        t += gui + '\n';
        t += 'Entregar: ' + esc(fmtFechaDisplay(e.fecha)||'---') + (e.hora ? ' ' + esc(e.hora) : '') + '\n';
        t += 'Lapso: ' + (e.lapsoDias ? esc(String(e.lapsoDias)) + ' dia(s)' : '---') + '\n';
        t += 'Vence: ' + esc(fmtFechaDisplay(e.fechaVencimiento)||'---') + '\n';
        t += 'Estado: ' + estEtq + '\n';
        if (e.notas) t += 'Notas: ' + esc(e.notas) + '\n';
        t += eq + '\n';
        t += cen('Pedido de compra al proveedor') + '\n';
        t += cen(D.config.empresa.nombre) + '\n';
        let v = window.open('', '_blank', 'width=380,height=600');
        if(!v) { mostrarNotificacion('Permite ventanas emergentes para imprimir', 'error'); return; }
        v.document.write(
            '<html><head><meta charset="UTF-8"><title>Pedido</title>' +
            '<style>' +
            'body{font-family:"Courier New",monospace;font-size:11px;line-height:1.3;margin:0;padding:8px;white-space:pre;color:#000;background:#fff}' +
            '@media print{@page{margin:0}body{padding:0}}' +
            '</style></head><body>' + t.replace(/\n/g, '<br>') +
            '</body></html>'
        );
        v.document.close();
        setTimeout(() => { try { v.focus(); v.print(); } catch(e){} }, 500);
    }
    window.enviarPedidoEntregaWhatsApp = async (id) => {
        const e = (D.entregas || []).find(x => x.id === id); if(!e) return;
        const items = itemsEntrega(e);
        const totalU = items.reduce((s, it) => s + it.cantidad, 0);
        const estEtq = e.estado === 'recibido' ? 'Recibida' : e.estado === 'salida' ? 'En salida' : 'Pendiente';
        let mensaje = `🏪 *${D.config.empresa.nombre}*\n━━━━━━━━━━━━━━━━━━━━\n📦 *PEDIDO VIRTUAL*\n🧾 *${e.id}*\n👤 *Proveedor:* ${e.proveedor}\n📅 *Fecha del pedido:* ${fmtFechaDisplay(e.fecha)||''}${e.hora ? ' ' + e.hora : ''}\n━━━━━━━━━━━━━━━━━━━━\n`;
        items.forEach(it => { mensaje += `${it.cantidad}x ${it.producto}\n`; });
        mensaje += `━━━━━━━━━━━━━━━━━━━━\n📦 *TOTAL:* ${totalU} u.\n📅 *Entregar:* ${fmtFechaDisplay(e.fecha)||'—'}${e.hora ? ' '+e.hora : ''}\n⏳ *Lapso:* ${e.lapsoDias ? e.lapsoDias + ' día(s)' : '—'}\n⌛ *Vence:* ${fmtFechaDisplay(e.fechaVencimiento)||'—'}\n📋 *Estado:* ${estEtq}`;
        if(e.notas) mensaje += `\n✏️ *Notas:* ${e.notas}`;
        try { await navigator.clipboard.writeText(mensaje); mostrarNotificacion('📋 Pedido copiado al portapapeles', 'success'); } catch(err) {}
        if (typeof window !== 'undefined' && window.AndroidBridge && typeof AndroidBridge.copiarImagenWhatsApp === 'function') {
            try {
                const canvas = await capturarTicketImagen();
                if (canvas) {
                    const dataUrl = canvas.toDataURL('image/png');
                    AndroidBridge.copiarImagenWhatsApp(dataUrl.split(',')[1]);
                } else {
                    if (typeof AndroidBridge.copiarPortapapeles === 'function') AndroidBridge.copiarPortapapeles(mensaje);
                    AndroidBridge.abrirWhatsApp();
                }
            } catch(err) { console.error('whatsapp pedido nativo', err); }
            return;
        }
        const telefono = await jamPrompt("📱 Ingrese el número de teléfono (ej: 584121234567):");
        if(telefono) {
            let numeroLimpio = telefono.replace(/[^0-9]/g, '');
            if(numeroLimpio.startsWith('0')) numeroLimpio = '58' + numeroLimpio.substring(1);
            if(!numeroLimpio.startsWith('58')) numeroLimpio = '58' + numeroLimpio;
            window.open(`https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
        }
    };
    async function cargarProveedoresSiNo(){ if(!D.proveedores || D.proveedores.length === 0){ try { D.proveedores = await getAll('proveedores'); } catch(e){} } }
    async function mostrarCalendarioEntregas(){
        D.entregas = await getAll('entregas');
        const accent = D.config.theme;
        const overlay = document.createElement('div'); overlay.className = 'kpi-popup-overlay';
        overlay.onclick = e => { if(e.target === overlay) overlay.remove(); };
        const popup = document.createElement('div'); popup.className = 'kpi-popup kpi-popup-cal';
        let anio = new Date().getFullYear(), mes = new Date().getMonth(), diaSel = null;
        const aDia = (f) => { const p = String(f||'').split('-').map(Number); return p.length === 3 ? new Date(p[0], (p[1]||1)-1, p[2]||1) : null; };
        const fmtCorta = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        function pintar(){
            const hoy = new Date(); hoy.setHours(0,0,0,0);
            const primerDia = new Date(anio, mes, 1);
            const offset = (primerDia.getDay() + 6) % 7;
            const diasMes = new Date(anio, mes + 1, 0).getDate();
            const nomMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][mes];
            document.getElementById('calTitulo').innerHTML = `${nomMes} <span style="opacity:.6">${anio}</span>`;
            let celdas = '';
            ['L','M','X','J','V','S','D'].forEach(d => celdas += `<div class="cal-cabecera">${d}</div>`);
            for(let i=0; i<offset; i++) celdas += `<div class="cal-vacio"></div>`;
            for(let d=1; d<=diasMes; d++){
                const f = fmtCorta(new Date(anio, mes, d));
                const badges = (D.entregas||[]).filter(e => e.fecha === f).map(e => e.estado === 'recibido' ? '<i class="fas fa-circle" style="color:#22c55e"></i>' : e.estado === 'salida' ? '<i class="fas fa-circle" style="color:#eab308"></i>' : '<i class="fas fa-circle" style="color:#ef4444"></i>').join('');
                const vence = (D.entregas||[]).some(e => e.fechaVencimiento === f && (!e.estado || e.estado !== 'recibido')) ? '<i class="fas fa-triangle-exclamation"></i>' : '';
                const hoyF = fmtCorta(hoy); const esHoy = f === hoyF;
                celdas += `<div class="cal-dia ${esHoy?'cal-dia-hoy':''} ${diaSel === f?'cal-sel':''}" data-f="${f}"><div class="cal-dia-num">${d}</div>${(badges||vence) ? `<div class="cal-badge">${badges}${vence}</div>` : ''}</div>`;
            }
            document.getElementById('calGrid').innerHTML = celdas;
            document.querySelectorAll('.cal-dia').forEach(el => {
                el.onclick = () => { diaSel = el.dataset.f; pintar(); };
            });
            const delDia = diaSel || fmtCorta(hoy);
            const evts = (D.entregas||[]).filter(e => e.fecha === delDia || e.fechaVencimiento === delDia);
            const fechaTxt = fmtFechaDisplay(delDia);
            document.getElementById('calDetalle').innerHTML = `<div class="text-xs font-bold" style="color:${accent};margin-bottom:6px"><i class="fas fa-calendar-days"></i> ${diaSel ? fechaTxt : 'Hoy: ' + fechaTxt}</div>` + (evts.length ? evts.map(e => `
                <div class="flex justify-between items-center" style="padding:6px 0;border-bottom:1px solid rgba(128,128,128,.12)"><div><div class="text-xs font-bold">${escapeHtml(tituloProductoEntrega(e))} — ${escapeHtml(e.proveedor||'')}</div><div class="text-[10px]" style="opacity:.6">${escapeHtml(fmtFechaDisplay(e.fecha)||'')}${e.hora ? ' '+escapeHtml(e.hora) : ''} · Vence: ${escapeHtml(fmtFechaDisplay(e.fechaVencimiento)||'—')}</div>${e.notas ? `<div class="text-[10px]" style="color:#f59e0b"><i class="fas fa-pen"></i> ${escapeHtml(e.notas)}</div>` : ''}</div>${estadoEntregaBadge(e)}</div>`).join('') : '<div class="text-xs" style="opacity:.5;text-align:center;padding:10px">Sin entregas este día</div>');
        }
        popup.innerHTML = `<div class="kpi-popup-titulo" style="color:${accent}"><i class="fas fa-calendar-days"></i> Calendario de entregas <button class="kpi-popup-cerrar" onclick="this.closest('.kpi-popup-overlay').remove()">✕</button></div>
            <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;margin-bottom:8px">
                <button id="calPrev" class="btn-redondeado py-1 px-3 text-xs" style="border:1px solid ${accent};color:${accent}">‹</button>
                <div id="calTitulo" class="font-bold text-sm"></div>
                <button id="calNext" class="btn-redondeado py-1 px-3 text-xs" style="border:1px solid ${accent};color:${accent}">›</button>
            </div>
            <div id="calGrid" class="cal-grid"></div>
            <div id="calDetalle" class="cal-detalle"></div>
            <div class="text-[10px]" style="opacity:.55;margin-top:8px;text-align:center"><i class="fas fa-circle" style="color:#22c55e"></i> Recibida · <i class="fas fa-circle" style="color:#eab308"></i> En salida · <i class="fas fa-circle" style="color:#ef4444"></i> Pendiente · <i class="fas fa-triangle-exclamation"></i> Vence</div>`;
        overlay.appendChild(popup); document.body.appendChild(overlay);
        document.getElementById('calPrev').onclick = () => { mes--; if(mes < 0){ mes = 11; anio--; } pintar(); };
        document.getElementById('calNext').onclick = () => { mes++; if(mes > 11){ mes = 0; anio++; } pintar(); };
        pintar();
    }
    
    // ==================== REPORTES (Dashboard KPIs) ====================
    function msToDateStr(ms){ let d = new Date(ms); return d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0')+'-'+d.getDate().toString().padStart(2,'0'); }
    function tsFechaISO(f){ const p = String(f||'').split('-').map(Number); return (p.length >= 3 && p[0] > 0) ? new Date(p[0], (p[1]||1)-1, p[2]||1, 12).getTime() : 0; }
    const KEY_HISTORIAL_TASA = 'jam_pos_historial_tasa';
    function cargarHistorialTasa(){ try { return JSON.parse(localStorage.getItem(KEY_HISTORIAL_TASA)) || []; } catch(e) { return []; } }
    function guardarHistorialTasa(arr){ try { localStorage.setItem(KEY_HISTORIAL_TASA, JSON.stringify(arr)); } catch(e) {} }
    function horaActual(){ return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
    function registrarCambioTasa(tasa){
        if(!(tasa > 0)) return false;
        try {
            localStorage.setItem('jam_pos_ultima_tasa', JSON.stringify({
                tasa: Math.round(tasa * 100) / 100,
                fecha: msToDateStr(Date.now()),
                hora: horaActual()
            }));
        } catch (e) {}
        let arr = cargarHistorialTasa();
        let ultimo = arr.length ? arr[arr.length - 1] : null;
        const hoy = msToDateStr(Date.now());
        let nuevo = false;
        if(ultimo && Math.abs(tasa - ultimo.tasa) < 0.01){
            if(ultimo.fecha === hoy){
                ultimo.hora = horaActual();
                guardarHistorialTasa(arr);
            }
        } else {
            arr.push({ fecha: hoy, hora: horaActual(), tasa: tasa });
            guardarHistorialTasa(arr);
            nuevo = true;
        }
        if(tasa > 0) registrarTasaDia(tasa, hoy, horaActual()).catch(() => {});
        // Mantener el widget de la tasa al día (solo en el APK; en web no existe el bridge).
        if (window.AndroidBridge && typeof AndroidBridge.guardarTasaWidget === 'function') {
            try { AndroidBridge.guardarTasaWidget(String(tasa), D.config.lastUpdate || ''); } catch(e) {}
        }
        return nuevo;
    }
    
    // ==================== TASA DIARIA (calendario inmutable) ====================
    // Cada día tiene UN valor de tasa. El del día de HOY se puede ajustar durante
    // la jornada; en cuanto el día se completa (o se fija manualmente) queda
    // INMUTABLE para siempre en el calendario.
    const KEY_TASA_DIARIA = 'jam_pos_tasa_diaria';
    let cacheTasaDiaria = [];
    function hoyISO(){ return msToDateStr(Date.now()); }
    async function cargarTasaDiaria(){
        try { const arr = await loadFromIDB('tasa_diaria'); if(Array.isArray(arr) && arr.length) return arr; } catch(e) {}
        return loadFromStorage(KEY_TASA_DIARIA, []);
    }
    async function guardarTasaDiaria(arr){
        try { await saveToIDB('tasa_diaria', arr); } catch(e) {}
        try { saveToStorage(KEY_TASA_DIARIA, arr); } catch(e) {}
        cacheTasaDiaria = arr.slice();
    }
    function refrescarCacheTasaDiaria(){ cacheTasaDiaria = D.tasaDiaria || []; }
    // Rellena cada día sin registro desde la primera tasa hasta HOY con el
    // último valor conocido (registro diario completo). Los días impresos
    // quedan fijada:true; solo HOY puede quedar editable.
    function completarRegistroDiario(arr, hoy){
        if(!Array.isArray(arr) || !arr.length) return arr;
        hoy = hoy || hoyISO();
        const porFecha = {};
        arr.forEach(r => { porFecha[r.fecha] = r; });
        const fechas = Object.keys(porFecha).sort();
        const primero = fechas[0];
        const cursor = new Date(primero + 'T00:00:00');
        const fin = new Date(hoy + 'T00:00:00');
        if(cursor.getTime() > fin.getTime()) return arr;
        let ultimoValor = 0;
        let ultimaHora = '';
        let cambio = false;
        const nuevos = [];
        while(cursor.getTime() <= fin.getTime()){
            const iso = msToDateStr(cursor.getTime());
            const existente = porFecha[iso];
            if(existente){
                if(existente.tasa > 0){ ultimoValor = existente.tasa; ultimaHora = existente.hora || ''; }
            } else if(ultimoValor > 0){
                nuevos.push({ id: iso, fecha: iso, tasa: ultimoValor, hora: ultimaHora, fijada: iso !== hoy });
                cambio = true;
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        if(cambio) arr = arr.concat(nuevos).sort((a,b) => a.fecha < b.fecha ? -1 : 1);
        return arr;
    }
    async function migrarTasaDiaria(){
        let arr = await cargarTasaDiaria();
        let cambio = false;
        if(!arr.length){
            let hist = cargarHistorialTasa();
            let porDia = {};
            hist.forEach(h => { if(h && h.fecha && h.tasa > 0) porDia[h.fecha] = { fecha: h.fecha, tasa: h.tasa, hora: h.hora || '' }; });
            Object.keys(porDia).sort().forEach(f => { arr.push({ id: f, fecha: f, tasa: Math.round(porDia[f].tasa * 100) / 100, hora: porDia[f].hora, fijada: true }); });
            cambio = true;
        }
        const hoy = hoyISO();
        if(!arr.find(x => x.fecha === hoy)){
            let tasaHoy = (D.config && D.config.dolarRate > 0) ? D.config.dolarRate : 0;
            if(tasaHoy <= 0 && arr.length){
                const ultimo = arr[arr.length - 1];
                if(ultimo && ultimo.tasa > 0) tasaHoy = ultimo.tasa;
            }
            if(tasaHoy > 0){ arr.push({ id: hoy, fecha: hoy, tasa: Math.round(tasaHoy * 100) / 100, hora: horaActual(), fijada: false }); cambio = true; }
        }
        const antes = arr.length;
        arr = completarRegistroDiario(arr, hoy);
        if(arr.length !== antes) cambio = true;
        arr.forEach(r => { if(r.fecha < hoy && !r.fijada){ r.fijada = true; cambio = true; } });
        if(cambio) await guardarTasaDiaria(arr);
        D.tasaDiaria = arr;
        return arr;
    }
    async function registrarTasaDia(tasa, fechaISO, hora){
        if(!(tasa > 0)) return false;
        fechaISO = fechaISO || hoyISO();
        let arr = await cargarTasaDiaria();
        let existente = arr.find(x => x.fecha === fechaISO);
        const val = Math.round(tasa * 100) / 100;
        if(existente){
            if(existente.fijada) return false;
            if(existente.tasa > 0 && Math.abs(existente.tasa - val) < 0.001){ existente.hora = hora || existente.hora; await guardarTasaDiaria(arr); return false; }
            existente.tasa = val;
            existente.hora = hora || existente.hora;
            existente.fijada = false;
            await guardarTasaDiaria(arr);
            return true;
        }
        arr.push({ id: fechaISO, fecha: fechaISO, tasa: val, hora: hora || '', fijada: false });
        arr.sort((a,b) => a.fecha < b.fecha ? -1 : 1);
        await guardarTasaDiaria(arr);
        return true;
    }
    async function fijarTasaDia(fechaISO){
        fechaISO = fechaISO || hoyISO();
        let arr = await cargarTasaDiaria();
        let existente = arr.find(x => x.fecha === fechaISO);
        if(existente){
            if(existente.fijada) return false;
            existente.fijada = true;
            await guardarTasaDiaria(arr);
            return true;
        }
        if(fechaISO === hoyISO() && D.config.dolarRate > 0){
            arr.push({ id: fechaISO, fecha: fechaISO, tasa: Math.round(D.config.dolarRate * 100) / 100, hora: horaActual(), fijada: true });
            arr.sort((a,b) => a.fecha < b.fecha ? -1 : 1);
            await guardarTasaDiaria(arr);
            return true;
        }
        return false;
    }
    function tasaParaFecha(fechaISO){
        let r = cacheTasaDiaria.find(x => x.fecha === fechaISO);
        if(r) return { tasa: r.tasa, fijada: r.fijada, hora: r.hora, directo: true };
        return { tasa: 0, fijada: false, hora: '', directo: false };
    }
    async function importarTasaDiariaDesde(lista){
        let arr = await cargarTasaDiaria();
        let cont = 0;
        (lista || []).forEach(r => {
            if(!r || !r.fecha) return;
            const fecha = aFechaISO(r.fecha) || String(r.fecha);
            const tasa = parseFloat(r.tasa);
            if(!(tasa > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
            const ex = arr.find(x => x.fecha === fecha);
            if(!ex){
                arr.push({ id: fecha, fecha, tasa: Math.round(tasa * 100) / 100, hora: r.hora || '', fijada: !!r.fijada || fecha < hoyISO() });
                cont++;
            }
        });
        arr.sort((a,b) => a.fecha < b.fecha ? -1 : 1);
        const antes = arr.length;
        arr = completarRegistroDiario(arr, hoyISO());
        if(cont > 0 || arr.length !== antes) await guardarTasaDiaria(arr);
        D.tasaDiaria = arr;
        return cont;
    }
    function agregarTasaHistorial(tasa, fechaISO, hora){
        if(!(tasa > 0)) return false;
        if(!fechaISO) return false;
        let arr = cargarHistorialTasa();
        let duplicado = arr.some(h => h.fecha === fechaISO && Math.abs(Number(h.tasa) - tasa) < 0.01);
        if(duplicado) return false;
        arr.push({ fecha: fechaISO, hora: hora || '--:--', tasa: tasa });
        arr.sort((a,b) => a.fecha === b.fecha ? 0 : (a.fecha < b.fecha ? -1 : 1));
        guardarHistorialTasa(arr);
        return true;
    }
    function importarHistorialTasaDesde(historial){
        let cont = 0;
        (historial || []).forEach(h => {
            if(!h) return;
            let tasa = parseFloat(h.tasa);
            let fecha = aFechaISO(h.fecha);
            if(!fecha && String(h.fecha||'').match(/^\d{4}-\d{2}-\d{2}/)) fecha = h.fecha;
            if(tasa > 0 && fecha){
                if(agregarTasaHistorial(tasa, fecha, h.hora || '')) cont++;
            }
        });
        return cont;
    }
    function aplicarConfigInteligente(configBackup, timestampBackup){
        const prev = Object.assign({}, D.config);
        const tasaVigente = parseFloat(prev.dolarRate);
        const tasaBackup = parseFloat(configBackup && configBackup.dolarRate);
        const fechaVigente = aFechaISO(prev.lastUpdate) || msToDateStr(Date.now());
        const fechaBackup = aFechaISO(configBackup && configBackup.lastUpdate) || aFechaISO(timestampBackup) || '';
        if(tasaBackup > 0 && fechaBackup) agregarTasaHistorial(tasaBackup, fechaBackup, configBackup.lastUpdate);
        D.config = Object.assign({}, prev, configBackup || {});
        const backupEsMasNueva = !!(tasaBackup > 0 && fechaBackup && fechaBackup > fechaVigente);
        let estado = '';
        if(backupEsMasNueva){
            if(tasaVigente > 0) agregarTasaHistorial(tasaVigente, fechaVigente, prev.lastUpdate);
            D.config.dolarRate = tasaBackup;
            if(!(configBackup.tasaManualValue > 0)) D.config.tasaManualValue = tasaBackup;
            estado = `💱 Tasa: se aplicó la del archivo (${fmtDolar(tasaBackup)}, más nueva que la vigente ${fmtDolar(tasaVigente)})`;
        } else {
            D.config.dolarRate = tasaVigente > 0 ? tasaVigente : (tasaBackup > 0 ? tasaBackup : D.config.dolarRate);
            D.config.tasaManualValue = prev.tasaManualValue > 0 ? prev.tasaManualValue : D.config.dolarRate;
            D.config.tasaManual = prev.tasaManual;
            D.config.lastUpdate = prev.lastUpdate;
            estado = `💱 Tasa: se conservó la vigente (${fmtDolar(D.config.dolarRate)}); la del archivo (${fmtDolar(tasaBackup > 0 ? tasaBackup : D.config.dolarRate)}) quedó en el historial`;
        }
        saveToStorage(STORAGE_KEYS.config, D.config);
        return estado;
    }
    function aFechaISO(v){
        if(!v) return '';
        let s = String(v);
        let lim = s.indexOf('T'); if(lim !== -1) s = s.slice(0, lim);
        if(/^\d{4}-\d{1,2}-\d{1,2}/.test(s)){ let p = s.split(/[-\/]/); return p[0] + '-' + String(p[1]).padStart(2,'0') + '-' + String(p[2]).padStart(2,'0'); }
        let m = s.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
        if(m){ let aa = m[3].length === 2 ? '20' + m[3] : m[3]; return aa + '-' + String(m[2]).padStart(2,'0') + '-' + String(m[1]).padStart(2,'0'); }
        let t = new Date(s).getTime();
        return isNaN(t) ? '' : msToDateStr(t);
    }
    function fmtFechaDisplay(v){
        if(!v) return '';
        let s = String(v);
        if(/^\d{4}-\d{2}-\d{2}$/.test(s)){ let p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
        return s;
    }
    // Etiqueta de dia en la tarjeta de tasa del dolar (ultimos 7 dias):
    // "Miercoles 02/09/2026 Hora 8:13 am"
    function fmtTasaSemanaEtiqueta(h){
        let s = String(h.fecha || '');
        let dia = '', fecha = fmtFechaDisplay(h.fecha);
        if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
            let p = s.split('-');
            let d = new Date(+p[0], +p[1] - 1, +p[2]);
            let dnombre = d.toLocaleDateString('es-ES', { weekday: 'long' });
            dia = dnombre ? dnombre.charAt(0).toUpperCase() + dnombre.slice(1) + ' ' : '';
        }
        let hora = '';
        let hh = h && h.hora ? String(h.hora) : '';
        if(hh){
            let partes = hh.split(':');
            let hr = parseInt(partes[0], 10), mn = parseInt(partes[1], 10);
            if(!isNaN(hr) && !isNaN(mn)){
                let ampm = hr >= 12 ? 'pm' : 'am';
                let hr12 = hr % 12 === 0 ? 12 : hr % 12;
                hora = ' Hora ' + hr12 + ':' + (mn < 10 ? '0' + mn : mn) + ' ' + ampm;
            }
        }
        return (dia + fecha + hora).trim();
    }
    function generarDiasSemana(){
        let dias = [];
        for(let i=6; i>=0; i--){
            let d = new Date(); d.setDate(d.getDate()-i);
            dias.push({ fecha: msToDateStr(d.getTime()), label: d.toLocaleDateString('es-ES',{weekday:'short'}), ventas: [] });
        }
        return dias;
    }
    let _barsInfo = [];
    function renderGraficoVentas(ventas){
        let dias = generarDiasSemana();
        ventas.forEach(v => {
            let ts = v.timestamp || new Date(v.fecha).getTime();
            let idx = dias.findIndex(d => d.fecha === msToDateStr(ts));
            if(idx !== -1) dias[idx].ventas.push(v.total||0);
        });
        setTimeout(() => {
            let canvas = document.getElementById('chartVentas');
            if(!canvas) return;
            let ctx = canvas.getContext('2d');
            let W = canvas.parentElement.clientWidth - 24;
            let H = 180;
            canvas.width = W * 2; canvas.height = H * 2;
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            ctx.scale(2,2);
            let accent = D.config.theme;
            let maxVal = Math.max(...dias.map(d => d.ventas.reduce((a,b)=>a+b,0)), 1);
            let barW = Math.max(16, (W - 40) / dias.length - 8);
            let gap = 8;
            ctx.clearRect(0,0,W,H);
            _barsInfo = [];
            dias.forEach((d,i) => {
                let val = d.ventas.reduce((a,b)=>a+b,0);
                let barH = Math.max(4, (val / maxVal) * (H - 36));
                let x = 20 + i * (barW + gap) + (W - 40 - dias.length*(barW+gap) + gap)/2;
                let y = H - 16 - barH;
                _barsInfo.push({x, y, w: barW, h: barH, fecha: d.fecha, label: d.label, val});
                ctx.fillStyle = accent;
                ctx.globalAlpha = 0.85;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, y, barW, barH, [4,4,0,0]);
                else ctx.rect(x, y, barW, barH);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.fillStyle = getComputedStyle(document.body).color;
                ctx.font = '9px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(d.label, x + barW/2, H - 3);
                if(val > 0){
                    ctx.fillStyle = accent;
                    ctx.font = 'bold 8px sans-serif';
                    ctx.fillText(fmtPrecio(val), x + barW/2, y - 3);
                }
            });
        }, 50);
    }

    function mostrarKPIsDelDia(fecha, label){
        document.querySelectorAll('.kpi-popup').forEach(e => e.remove());
        let ventasAll = D.ventas || [];
        let ventasDia = ventasAll.filter(v => msToDateStr(v.timestamp || new Date(v.fecha).getTime()) === fecha);
        let totalVentasAll = ventasAll.reduce((a,b)=>a+(b.total||0),0);
        let totalGananciaAll = ventasAll.filter(v => !v.credito).reduce((a,b)=>a+(b.gananciaTotal||0),0);
        let totalGastosAll = D.gastos.reduce((a,b)=>a+(b.montoBs||0),0);
        let utilidadAll = totalGananciaAll - totalGastosAll;
        let cnt = ventasDia.length;
        let total = ventasDia.reduce((a,b)=>a+(b.total||0),0);
        let ganancia = ventasDia.filter(v => !v.credito).reduce((a,b)=>a+(b.gananciaTotal||0),0);
        let gastos = D.gastos.filter(g => msToDateStr(g.timestamp || new Date(g.fecha).getTime()) === fecha).reduce((a,b)=>a+(b.montoBs||0),0);
        let utilidad = ganancia - gastos;
        let accent = D.config.theme;
        let overlay = document.createElement('div');
        overlay.className = 'kpi-popup-overlay';
        overlay.onclick = e => { if(e.target === overlay) overlay.remove(); };
        let popup = document.createElement('div');
        popup.className = 'kpi-popup';
        const nombreDia = (() => { const d = new Date(fecha + 'T12:00:00'); const n = d.toLocaleDateString('es-ES',{weekday:'long'}) || ''; return n ? n.charAt(0).toUpperCase() + n.slice(1) : (label || ''); })();
        popup.innerHTML = `<div class="kpi-popup-titulo" style="color:${accent}"><i class="fas fa-chart-bar"></i> ${nombreDia} <button class="kpi-popup-cerrar" onclick="this.closest('.kpi-popup-overlay').remove()">✕</button></div>
        <div class="kpi-popup-grid">
            <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-sack-dollar"></i></div><div class="kpi-popup-val">${fmtPrecio(total)} Bs</div><div class="kpi-popup-lbl">Ventas</div></div>
            <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-receipt"></i></div><div class="kpi-popup-val">${cnt}</div><div class="kpi-popup-lbl">Ticket(s)</div></div>
            <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-chart-line"></i></div><div class="kpi-popup-val">${fmtPrecio(ganancia)} Bs</div><div class="kpi-popup-lbl">Ganancia cobrada</div></div>
            <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-money-bill-wave"></i></div><div class="kpi-popup-val">${fmtPrecio(gastos)} Bs</div><div class="kpi-popup-lbl">Gastos</div></div>
            <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-chart-column"></i></div><div class="kpi-popup-val" style="color:${utilidad >= 0 ? '#10b981' : '#ef4444'}">${fmtPrecio(utilidad)} Bs</div><div class="kpi-popup-lbl">Utilidad</div></div>
            <div class="kpi-popup-card"><div class="kpi-popup-icon"><i class="fas fa-users"></i></div><div class="kpi-popup-val">${new Set(ventasDia.map(v => v.clienteId)).size}</div><div class="kpi-popup-lbl">Clientes</div></div>
        </div>
        <div class="kpi-popup-totales"><span>Acumulado: ${fmtPrecio(totalVentasAll)} Bs</span><span>Ganancia cobrada: ${fmtPrecio(totalGananciaAll)} Bs</span><span>Gastos: ${fmtPrecio(totalGastosAll)} Bs</span><span>Utilidad: <b style="color:${utilidadAll >= 0 ? '#10b981' : '#ef4444'}">${fmtPrecio(utilidadAll)} Bs</b></span></div>`;
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
    }
    let _periodoReporte = 'mes';
    function rangoPeriodo(per){
        const now = new Date(); let ini;
        if(per === 'hoy') ini = msToDateStr(now.getTime());
        else if(per === 'semana'){ const d = new Date(); d.setDate(d.getDate() - 6); ini = msToDateStr(d.getTime()); }
        else if(per === 'mes') ini = msToDateStr(new Date(now.getFullYear(), now.getMonth(), 1).getTime());
        else ini = msToDateStr(new Date(now.getFullYear(), 0, 1).getTime());
        return { ini, fin: msToDateStr(now.getTime()) };
    }
    function labelPeriodo(p){ return p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Últimos 7 días' : p === 'mes' ? 'Mes actual' : 'Año actual'; }
    function periodoNominaInfo(per, empleados, gastos){
        let nominaUso = 0, nominaLbl = 'No aplica';
        if(per === 'mes' || per === 'anio'){
            if(per === 'mes'){ nominaUso = nóminaPendienteMes(Date.now()); nominaLbl = 'Nómina pendiente del mes'; }
            else {
                const ahora = new Date(), mesActual = ahora.getMonth() + 1;
                // Evita el doble conteo: si el gasto "Nómina" ya está registrado en
                // Gastos (se deduce vía totGastos), aquí solo se imputa lo AÚN NO
                // pagado (meses posteriores a la última fecha de pago de cada uno).
                const hayGastosNomina = (gastos||[]).some(g => /n[oó]mina|sueldo|salario|pago de personal/i.test(String(g.categoria||'') + ' ' + String(g.concepto||'')));
                let total = 0;
                (empleados||[]).forEach(e => {
                    const sal = parseFloat(e.salarioBs) || 0;
                    if(sal <= 0) return;
                    if(hayGastosNomina){
                        const pag = e.fechaPago ? tsFechaISO(e.fechaPago) : 0;
                        const pagadoEsteMes = !!(pag && !isNaN(new Date(pag).getTime()) && new Date(pag).getFullYear() === ahora.getFullYear() && new Date(pag).getMonth() === ahora.getMonth());
                        const mesPagado = (pag && new Date(pag).getFullYear() === ahora.getFullYear()) ? (new Date(pag).getMonth() + 1) : 0;
                        const pend = Math.max(0, mesActual - mesPagado - (pagadoEsteMes ? 1 : 0));
                        total += sal * pend;
                    } else {
                        total += sal * mesActual;
                    }
                });
                nominaUso = Math.round(total * 100) / 100;
                nominaLbl = hayGastosNomina ? 'Nómina restante del año' : 'Nómina estimada del año';
            }
        }
        return { nominaUso, nominaLbl };
    }
    let _xlsxCrcTbl = null;
    function xlsxCrc32(bin){
        if(!_xlsxCrcTbl){
            _xlsxCrcTbl = [];
            for(let n=0;n<256;n++){
                let c = n;
                for(let k=0;k<8;k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                _xlsxCrcTbl.push(c >>> 0);
            }
        }
        let crc = 0xFFFFFFFF;
        for(let i=0;i<bin.length;i++) crc = (_xlsxCrcTbl[(crc ^ bin[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }
    function xlsxStr(s){
        return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function xlsxCol(n){ let s=''; n++; while(n>0){ const m = (n-1) % 26; s = String.fromCharCode(65+m) + s; n = Math.floor((n-1)/26); } return s; }
    function xlsxZip(files){
        const enc = new TextEncoder();
        const parts = [], centrals = [];
        let offset = 0;
        const now = new Date();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
        const dosDate = ((now.getFullYear()-1980) << 9) | ((now.getMonth()+1) << 5) | now.getDate();
        for(const f of files){
            const nbU8 = enc.encode(f.nombre);
            const crc = xlsxCrc32(f.data);
            const lh = new DataView(new ArrayBuffer(30 + nbU8.length));
            lh.setUint32(0, 0x04034b50, true);
            lh.setUint16(4, 20, true);
            lh.setUint16(6, 0x0800, true);
            lh.setUint16(8, 0, true);
            lh.setUint16(10, dosTime, true);
            lh.setUint16(12, dosDate, true);
            lh.setUint32(14, crc, true);
            lh.setUint32(18, f.data.length, true);
            lh.setUint32(22, f.data.length, true);
            lh.setUint16(26, nbU8.length, true);
            lh.setUint16(28, 0, true);
            nbU8.forEach((b,i) => lh.setUint8(30+i, b));
            const lhArr = new Uint8Array(lh.buffer);
            parts.push(lhArr, f.data);
            const ch = new DataView(new ArrayBuffer(46 + nbU8.length));
            ch.setUint32(0, 0x02014b50, true);
            ch.setUint16(4, 20, true);
            ch.setUint16(6, 20, true);
            ch.setUint16(8, 0x0800, true);
            ch.setUint16(10, 0, true);
            ch.setUint16(12, dosTime, true);
            ch.setUint16(14, dosDate, true);
            ch.setUint32(16, crc, true);
            ch.setUint32(20, f.data.length, true);
            ch.setUint32(24, f.data.length, true);
            ch.setUint16(28, nbU8.length, true);
            ch.setUint16(30, 0, true);
            ch.setUint16(32, 0, true);
            ch.setUint16(34, 0, true);
            ch.setUint16(36, 0, true);
            ch.setUint32(38, 0, true);
            ch.setUint32(42, offset, true);
            nbU8.forEach((b,i) => ch.setUint8(46+i, b));
            centrals.push(new Uint8Array(ch.buffer));
            offset += lhArr.length + f.data.length;
        }
        const cdLen = centrals.reduce((a,c) => a + c.length, 0);
        const eocd = new DataView(new ArrayBuffer(22));
        eocd.setUint32(0, 0x06054b50, true);
        eocd.setUint16(4, 0, true);
        eocd.setUint16(6, 0, true);
        eocd.setUint16(8, files.length, true);
        eocd.setUint16(10, files.length, true);
        eocd.setUint32(12, cdLen, true);
        eocd.setUint32(16, offset, true);
        eocd.setUint16(20, 0, true);
        const out = new Uint8Array(offset + cdLen + 22);
        let p = 0;
        for(const x of parts){ out.set(x, p); p += x.length; }
        for(const c of centrals){ out.set(c, p); p += c.length; }
        out.set(new Uint8Array(eocd.buffer), p);
        return out;
    }
    function xlsxHoja(nombre, filas){
        const body = [];
        let maxC = 0, widths = {};
        for(let r=1;r<filas.length;r++){
            const fila = filas[r] || [];
            if(fila.length > maxC) maxC = fila.length;
            let cells = '';
            for(let c=0;c<fila.length;c++){
                const v = fila[c];
                if(v === null || v === undefined) continue;
                const ref = xlsxCol(c) + (r+1);
                if(typeof v === 'number' && isFinite(v)){
                    cells += '<c r="'+ref+'" s="1"><v>'+v+'</v></c>';
                    if(!widths[c] || widths[c] < 12) widths[c] = 12;
                } else {
                    const t = xlsxStr(v);
                    cells += '<c r="'+ref+'" t="inlineStr"><is><t>'+t+'</t></is></c>';
                    const l = String(v).length;
                    widths[c] = Math.max(widths[c] || 10, l > 40 ? 40 : l + 2);
                }
            }
            body.push('<row r="'+(r+1)+'">'+cells+'</row>');
        }
        let hdr = '';
        const hf = filas[0] || [];
        for(let c=0;c<hf.length;c++){
            const v = hf[c];
            if(v === null || v === undefined) continue;
            hdr += '<c r="'+xlsxCol(c)+'1" t="inlineStr" s="2"><is><t>'+xlsxStr(v)+'</t></is></c>';
        }
        if(hf.length > maxC) maxC = hf.length;
        let cols = '';
        if(maxC > 0){
            cols = '<cols>';
            for(let i=0;i<maxC;i++){ const w = widths[i] || 12; cols += '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>'; }
            cols += '</cols>';
        }
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
            '<sheetFormatPr defaultRowHeight="15"/>' + cols + '<sheetData><row r="1">'+hdr+'</row>' + body.join('') + '</sheetData></worksheet>';
    }
    function construirXlsx(hojas){
        const enc = s => new TextEncoder().encode(s);
        const files = [];
        let types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>';
        let wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
        let wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
        hojas.forEach((h, i) => {
            const n = 'sheet' + (i+1);
            types += '<Override PartName="/xl/worksheets/'+n+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
            wbRels += '<Relationship Id="rId'+i+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/'+n+'.xml"/>';
            wb += '<sheet name="'+xlsxStr(h.nombre)+'" sheetId="'+(i+1)+'" r:id="rId'+i+'"/>';
            files.push({ nombre: 'xl/worksheets/'+n+'.xml', data: enc(xlsxHoja(h.nombre, h.filas)) });
        });
        types += '</Types>';
        wbRels += '<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
        wb += '</sheets></workbook>';
        files.unshift(
            { nombre: '[Content_Types].xml', data: enc(types) },
            { nombre: '_rels/.rels', data: enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
            { nombre: 'xl/workbook.xml', data: enc(wb) },
            { nombre: 'xl/_rels/workbook.xml.rels', data: enc(wbRels) },
            { nombre: 'xl/styles.xml', data: enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')}
        );
        return xlsxZip(files);
    }
    function bytesToBase64Xlsx(bytes){
        let bin = '';
        for(let i=0;i<bytes.length;i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i+0x8000));
        return btoa(bin);
    }
    async function descargarXlsx(nombre, hojas){
        const bytes = construirXlsx(hojas);
        if (esAppNativa()) {
            asegurarCarpetaNativa(async () => {
                try {
                    const res = await puenteResultado(AndroidBridge.guardarArchivo(nombre, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytesToBase64Xlsx(bytes)));
                    if (res && res.startsWith('ok')) mostrarNotificacion('✅ Excel guardado en ' + (carpetaNativa ? carpetaNativa.nombre : 'carpeta') + '/JAMPOS/' + nombre, 'success');
                    else mostrarNotificacion('❌ No se pudo guardar el Excel: ' + (res || 'error desconocido'), 'error');
                } catch (e) { mostrarNotificacion('❌ Error al guardar el Excel: ' + e.message, 'error'); }
            });
            return;
        }
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = nombre;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        mostrarNotificacion('✅ Reporte Excel generado', 'success');
    }
    async function generarReporteDocumento(per, modo){
        try {
            const ventas = await getAll('ventas');
            const gastos = await getAll('gastos');
            const empleados = await getAll('empleados');
            const entregas = await getAll('entregas');
            const clientesCxC = await getAll('clientes');
            const conDeudaCxc = clientesCxC.filter(c => (parseFloat(c.adeudo)||0) > 0).sort((a,b) => (parseFloat(b.adeudo)||0) - (parseFloat(a.adeudo)||0));
            const totalCxc = conDeudaCxc.reduce((a,c) => a + (parseFloat(c.adeudo)||0), 0);
            const histTasa = cargarHistorialTasa();
            const rp = rangoPeriodo(per);
            const enR = (ts) => { const t = msToDateStr(ts); return t >= rp.ini && t <= rp.fin; };
            const ventasPer = ventas.filter(v => enR(v.timestamp || new Date(v.fecha).getTime()));
            const gastosPer = gastos.filter(g => enR(g.timestamp || new Date(g.fecha).getTime()));
            const totVentas = ventasPer.reduce((a,v)=>a+(v.total||0),0);
const totGan = ventasPer.filter(v => !v.credito).reduce((a,v)=>a+(v.gananciaTotal||0),0);
            const totGanCredito = ventasPer.filter(v => v.credito && !v.anulada).reduce((a,v)=>a+(v.gananciaTotal||0),0);
            const totGastos = gastosPer.reduce((a,g)=>a+(g.montoBs||0),0);
            const { nominaUso, nominaLbl } = periodoNominaInfo(per, empleados, gastos);
            const utilNeta = totGan - totGastos - nominaUso;
            const tasaHoy = (Array.isArray(D.config) ? '' : D.config.dolarRate) || 0;
            const empresa = (D.config.empresa && D.config.empresa.nombre) || 'JAM POS';
            const empDir = (D.config.empresa && D.config.empresa.direccion) || '';
            const empTel = (D.config.empresa && D.config.empresa.telefono) || '';
            const formas = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MÓVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DÉBITO','dolares':'DÓLARES','pago_dividido':'PAGO DIVIDIDO','credito':'CRÉDITO' };
            const filasVentas = ventasPer.length ? ventasPer.slice().reverse().map(v => { const esCrV = v.credito && !v.anulada; const pendV = esCrV ? (v.creditoRestante != null ? v.creditoRestante : v.total) : '—'; const abonoV = esCrV && Number(v.pago) > 0 ? v.pago : '—'; const vencV = esCrV && v.creditoFechaLimite ? escapeHtml(textoFechaLimite(v.creditoFechaLimite)) : '—'; return `<tr><td>${escapeHtml(v.id)}</td><td>${escapeHtml(fmtFechaDisplay(v.fecha)||'')}</td><td>${escapeHtml(v.hora || '')}</td><td>${escapeHtml(v.cliente || 'General')}</td><td style="text-align:right">${escapeHtml((v.items||[]).map(i=>i.nombre + (i.cantidad>1?' x'+i.cantidad:'')).join(', '))}</td><td style="text-align:right">${fmtPrecio(v.total)}</td><td style="text-align:right">${abonoV === '—' ? '—' : fmtPrecio(abonoV)}</td><td style="text-align:right">${pendV === '—' ? '—' : fmtPrecio(pendV)}</td><td style="text-align:right">${vencV}</td><td style="text-align:right">${fmtDolar(v.dolarRate||0)}</td><td style="text-align:right">${fmtPrecio(v.gananciaTotal||0)}</td><td>${formas[v.tipoPago] || escapeHtml(v.tipoPago||'')}</td></tr>`; }).join('') : '<tr><td colspan="12" style="text-align:center;opacity:.6">Sin ventas en el período</td></tr>';
            const filasGastos = gastosPer.length ? gastosPer.slice().reverse().map(g => `<tr><td>${escapeHtml(fmtFechaDisplay(g.fecha)||'')}</td><td>${escapeHtml(g.concepto||'')}</td><td>${escapeHtml(g.categoria||'')}</td><td style="text-align:right">${fmtPrecio(g.montoBs||0)}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;opacity:.6">Sin gastos en el período</td></tr>';
            const filasNomina = empleados.filter(e => (parseFloat(e.salarioBs)||0) > 0).length ? empleados.filter(e => (parseFloat(e.salarioBs)||0) > 0).map(e => { const pag = e.fechaPagoTs || (e.fechaPago ? tsFechaISO(e.fechaPago) : 0); const pm = pag && new Date(pag).getFullYear() === new Date().getFullYear() && new Date(pag).getMonth() === new Date().getMonth(); return `<tr><td>${escapeHtml(e.nombre)}</td><td>${escapeHtml(e.cargo||'')}</td><td>${e.diaPago ? 'Día ' + escapeHtml(e.diaPago) : '—'}</td><td style="text-align:right">${fmtPrecio(e.salarioBs)}</td><td style="text-align:center">${pm ? '<i class="fas fa-circle-check"></i> Pagado' : '⏳ Pendiente'}</td></tr>`; }).join('') : '<tr><td colspan="5" style="text-align:center;opacity:.6">Sin empleados con salario registrado</td></tr>';
            const filasEntregas = entregas.length ? entregas.slice().sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha))).map(e => `<tr><td>${escapeHtml(fmtFechaDisplay(e.fecha)||'')}</td><td>${escapeHtml(e.hora||'')}</td><td>${escapeHtml(e.proveedor||'')}</td><td>${escapeHtml(e.producto||'')}</td><td style="text-align:right">${parseInt(e.cantidad)||0}</td><td style="text-align:right">${e.lapsoDias||0}</td><td>${escapeHtml(fmtFechaDisplay(e.fechaVencimiento)||'')}</td><td style="text-align:center">${e.estado==='recibido'?'Recibida':e.estado==='salida'?'Salida':'Pendiente'}</td><td>${escapeHtml(e.notas||'')}</td></tr>`).join('') : '<tr><td colspan="9" style="text-align:center;opacity:.6">Sin entregas registradas</td></tr>';
            const filasTasa = histTasa.filter(h => h && h.fecha && !isNaN(new Date(h.fecha).getTime())).filter(h => enR(new Date(h.fecha).getTime())).map(h => `<tr><td>${escapeHtml(h.fecha)}</td><td>${escapeHtml(h.hora||'')}</td><td style="text-align:right">${escapeHtml(h.tasa)}</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center;opacity:.6">Sin historial</td></tr>';
            const porForma = {};
            ventasPer.forEach(v => {
                if(v.detallePagos && Array.isArray(v.detallePagos) && v.detallePagos.length){ v.detallePagos.forEach(p => { const k = p.metodo || v.tipoPago || 'efectivo_bs'; porForma[k] = (porForma[k]||0) + (parseFloat(p.monto)||0); }); }
                else { const k = v.tipoPago || 'efectivo_bs'; porForma[k] = (porForma[k]||0) + (v.total||0); }
            });
            const filasFormas = Object.keys(porForma).length ? Object.keys(porForma).map(k => { const pct = totVentas > 0 ? (porForma[k] / totVentas * 100) : 0; return `<tr><td>${formas[k] || escapeHtml(k)}</td><td style="text-align:right">${fmtPrecio(porForma[k])}</td><td style="text-align:right">${pct.toFixed(1)}%</td></tr>`; }).join('') : '<tr><td colspan="3" style="text-align:center;opacity:.6">Sin ventas en el período</td></tr>';
            const filasCartera = conDeudaCxc.length ? conDeudaCxc.map(c => `<tr><td>${escapeHtml(c.nombre||'')}</td><td>${escapeHtml(c.cedula||'')}</td><td>${escapeHtml(c.telefono||'')}</td><td style="text-align:right">${fmtPrecio(c.adeudo)}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;opacity:.6">Sin deudas pendientes <i class="fas fa-heart"></i></td></tr>';
            const colorNet = utilNeta >= 0 ? '#10b981' : '#ef4444';
            const fechaGen = new Date().toLocaleString('es-ES');
            const css = `
                @page { size: letter landscape; margin: 10mm; }
                body{font-family:Calibri,Arial,sans-serif;color:#222;margin:0;padding:16px;font-size:11px}
                *{box-sizing:border-box}
                h1{margin:0;font-size:20px;color:#1a56db}
                h2{font-size:13px;color:#1a56db;border-left:4px solid #1a56db;padding-left:8px;margin:18px 0 6px}
                .hdr{text-align:center;border-bottom:2px solid #1a56db;padding-bottom:8px;margin-bottom:12px}
                .hdr .sub{font-size:10px;color:#555}
                table{width:100%;border-collapse:collapse;margin-bottom:10px}
                th{background:#1a56db;color:#fff;padding:5px 8px;font-size:10px;text-align:left;white-space:nowrap}
                td{border:1px solid #d1d5db;padding:4px 8px;font-size:10px;vertical-align:middle}
                tr:nth-child(even) td{background:#f3f4f6}
                .tot{display:inline-block;border:1px solid #d1d5db;border-radius:6px;padding:6px 12px;margin:3px;text-align:center;min-width:120px;background:#f9fafb}
                .tot .v{font-size:16px;font-weight:800}
                .tot .l{font-size:9px;color:#6b7280;text-transform:uppercase}
                .foot{text-align:center;font-size:9px;color:#999;margin-top:16px;border-top:1px solid #d1d5db;padding-top:6px}
                .tot-row{text-align:center;margin-bottom:12px}
                td.r{text-align:right} td.c{text-align:center}
                @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
            `;
            const resRows = [
                ['Ventas del período', fmtPrecio(totVentas) + ' Bs', '#1a56db'],
                ['Ganancia cobrada', fmtPrecio(totGan) + ' Bs', '#10b981'],
                ['Gastos', fmtPrecio(totGastos) + ' Bs', '#ef4444'],
                [nominaLbl, nominaUso > 0 ? fmtPrecio(nominaUso) + ' Bs' : '—', '#f59e0b'],
                ['Utilidad neta', fmtPrecio(utilNeta) + ' Bs', colorNet],
                ['Por cobrar (CxC)', fmtPrecio(totalCxc) + ' Bs', '#ef4444'],
                ['Ventas a crédito', fmtPrecio(ventasPer.filter(v => v.credito && !v.anulada).reduce((a,v) => a + (parseFloat(v.total) || 0), 0)) + ' Bs', '#f59e0b'],
                ['Ganancia a crédito', fmtPrecio(totGanCredito) + ' Bs', '#f59e0b']
            ];
            const resTbl = '<table style="width:auto;margin:0 auto;border-collapse:separate;border-spacing:4px"><tr>' +
                resRows.map(r => '<td style="border:none;padding:4px 10px;text-align:center;background:#f9fafb;border-radius:6px;min-width:110px"><div style="font-size:9px;color:#6b7280;text-transform:uppercase">' + r[0] + '</div><div style="font-size:15px;font-weight:800;color:' + r[2] + '">' + r[1] + '</div></td>').join('') +
                '</tr></table>';
            const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reporte ' + labelPeriodo(per) + ' - ' + escapeHtml(empresa) + '</title><style>' + css + '</style></head><body>' +
                '<div class="hdr"><h1>' + escapeHtml(empresa) + '</h1>' +
                '<div class="sub">' + (empDir ? escapeHtml(empDir) + ' · ' : '') + (empTel ? escapeHtml(empTel) + ' · ' : '') + 'REPORTE ' + labelPeriodo(per).toUpperCase() + '</div>' +
                '<div class="sub">Período: ' + rp.ini + ' a ' + rp.fin + ' · Generado: ' + escapeHtml(fechaGen) + ' · Tasa: 1 USD = ' + fmtDolar(tasaHoy) + ' Bs</div></div>' +
                resTbl +
                '<h2>Ventas del período (' + ventasPer.length + ')</h2>' +
                '<table><thead><tr><th>Ticket</th><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Artículos</th><th class="r">Total Bs</th><th class="r">Abono</th><th class="r">Pendiente</th><th class="r">Vence</th><th class="r">Tasa</th><th class="r">Ganancia</th><th>Forma de pago</th></tr></thead><tbody>' + filasVentas + '</tbody></table>' +
                '<h2>Ventas por forma de pago</h2>' +
                '<table><thead><tr><th>Forma</th><th class="r">Total Bs</th><th class="r">% del período</th></tr></thead><tbody>' + filasFormas + '</tbody></table>' +
                '<h2>Gastos del período</h2>' +
                '<table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th class="r">Monto Bs</th></tr></thead><tbody>' + filasGastos + '</tbody></table>' +
                '<h2>Nómina de empleados</h2>' +
                '<table><thead><tr><th>Empleado</th><th>Cargo</th><th>Día de pago</th><th class="r">Salario Bs</th><th class="c">Estado</th></tr></thead><tbody>' + filasNomina + '</tbody></table>' +
                '<h2>Entregas de proveedores</h2>' +
                '<table><thead><tr><th>Fecha</th><th>Hora</th><th>Proveedor</th><th>Producto</th><th class="r">Cant.</th><th class="r">Lapso</th><th>Vence</th><th class="c">Estado</th><th>Notas</th></tr></thead><tbody>' + filasEntregas + '</tbody></table>' +
                '<h2>Cartera por cobrar (' + conDeudaCxc.length + ') · Total: ' + fmtPrecio(totalCxc) + ' Bs</h2>' +
                '<table><thead><tr><th>Cliente</th><th>Cédula</th><th>Teléfono</th><th class="r">Saldo Bs</th></tr></thead><tbody>' + filasCartera + '</tbody></table>' +
                '<h2>Historial de tasas del período</h2>' +
                '<table><thead><tr><th>Fecha</th><th>Hora</th><th class="r">Tasa Bs</th></tr></thead><tbody>' + filasTasa + '</tbody></table>' +
                '<div class="foot">Documento generado automáticamente por JAM POS · ' + escapeHtml(fechaGen) + '</div>' +
                '</body></html>';
            if(modo === 'excel'){
                const nombre = `JAM_POS_Reporte_${per}_${msToDateStr(Date.now())}.xlsx`;
                const formasLabel = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MÓVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DÉBITO','dolares':'DÓLARES','pago_dividido':'PAGO DIVIDIDO','credito':'CRÉDITO' };
                const ventasCreditoTot = ventasPer.filter(v => v.credito && !v.anulada).reduce((a,v) => a + (parseFloat(v.total)||0), 0);
                let filasNominaX = empleados.filter(e => (parseFloat(e.salarioBs)||0) > 0).map(e => {
                    const pag = e.fechaPagoTs || (e.fechaPago ? tsFechaISO(e.fechaPago) : 0);
                    const pm = pag && new Date(pag).getFullYear() === new Date().getFullYear() && new Date(pag).getMonth() === new Date().getMonth();
                    return [e.nombre || '', e.cargo || '', e.diaPago ? 'Día ' + e.diaPago : '', parseFloat(e.salarioBs)||0, pm ? 'Pagado' : 'Pendiente'];
                });
                if(!filasNominaX.length) filasNominaX = [['Sin empleados con salario registrado']];
                const hojas = [
                    { nombre: 'Resumen', filas: [
                        ['Concepto', 'Valor (Bs)'],
                        ['Empresa', empresa],
                        ['Reporte', labelPeriodo(per)],
                        ['Período', rp.ini + ' a ' + rp.fin],
                        ['Generado', fechaGen],
                        ['Tasa USD del día', tasaHoy || 0],
                        ['Ventas del período', totVentas],
                        ['Ganancia cobrada', totGan],
                        ['Gastos', totGastos],
                        [nominaLbl, nominaUso],
                        ['Utilidad neta', utilNeta],
                        ['Por cobrar (CxC)', totalCxc],
                        ['Ventas a crédito', ventasCreditoTot],
                        ['Ganancia a crédito', totGanCredito]
                    ]},
                    { nombre: 'Ventas', filas: [
                        ['Ticket', 'Fecha', 'Hora', 'Cliente', 'Artículos', 'Total (Bs)', 'Abono (Bs)', 'Pendiente (Bs)', 'Vence', 'Tasa', 'Ganancia (Bs)', 'Forma de pago']
                    ].concat(ventasPer.length ? ventasPer.slice().reverse().map(v => {
                        const esCrX = v.credito && !v.anulada;
                        return [
                        v.id, fmtFechaDisplay(v.fecha) || '', v.hora || '', v.cliente || 'General',
                        (v.items||[]).map(i => i.nombre + (i.cantidad > 1 ? ' x' + i.cantidad : '')).join(', '),
                        v.total || 0,
                        esCrX && Number(v.pago) > 0 ? v.pago : '—',
                        esCrX ? (v.creditoRestante != null ? v.creditoRestante : v.total) : '—',
                        esCrX && v.creditoFechaLimite ? textoFechaLimite(v.creditoFechaLimite) : '—',
                        v.dolarRate || 0, v.gananciaTotal || 0, formasLabel[v.tipoPago] || v.tipoPago || ''
                    ]; }) : [['Sin ventas en el período']])},
                    { nombre: 'Ventas por forma', filas: [
                        ['Forma', 'Total (Bs)', '% del período']
                    ].concat(Object.keys(porForma).length ? Object.keys(porForma).map(k => [
                        formasLabel[k] || k, porForma[k] || 0, totVentas > 0 ? +((porForma[k] / totVentas * 100).toFixed(2)) : 0
                    ]) : [['Sin ventas en el período']])},
                    { nombre: 'Gastos', filas: [
                        ['Fecha', 'Concepto', 'Categoría', 'Monto (Bs)']
                    ].concat(gastosPer.length ? gastosPer.slice().reverse().map(g => [
                        fmtFechaDisplay(g.fecha) || '', g.concepto || '', g.categoria || '', g.montoBs || 0
                    ]) : [['Sin gastos en el período']])},
                    { nombre: 'Nómina', filas: [
                        ['Empleado', 'Cargo', 'Día de pago', 'Salario (Bs)', 'Estado']
                    ].concat(filasNominaX)},
                    { nombre: 'Entregas', filas: [
                        ['Fecha', 'Hora', 'Proveedor', 'Producto', 'Cantidad', 'Lapso (días)', 'Vence', 'Estado', 'Notas']
                    ].concat(entregas.length ? entregas.slice().sort((a,b) => String(a.fecha).localeCompare(String(b.fecha))).map(e => [
                        fmtFechaDisplay(e.fecha) || '', e.hora || '', e.proveedor || '', e.producto || '',
                        parseInt(e.cantidad)||0, e.lapsoDias||0, fmtFechaDisplay(e.fechaVencimiento) || '',
                        e.estado === 'recibido' ? 'Recibida' : e.estado === 'salida' ? 'Salida' : 'Pendiente', e.notas || ''
                    ]) : [['Sin entregas registradas']])},
                    { nombre: 'Cartera por cobrar', filas: [
                        ['Cliente', 'Cédula', 'Teléfono', 'Saldo (Bs)']
                    ].concat(conDeudaCxc.length ? conDeudaCxc.map(c => [
                        c.nombre || '', c.cedula || '', c.telefono || '', c.adeudo || 0
                    ]) : [['Sin deudas pendientes']])},
                    { nombre: 'Historial de tasas', filas: [
                        ['Fecha', 'Hora', 'Tasa (Bs)']
                    ].concat(histTasa.filter(h => h && h.fecha && !isNaN(new Date(h.fecha).getTime())).filter(h => enR(new Date(h.fecha).getTime())).map(h => [
                        h.fecha, h.hora || '', h.tasa
                    ]).length ? histTasa.filter(h => h && h.fecha && !isNaN(new Date(h.fecha).getTime())).filter(h => enR(new Date(h.fecha).getTime())).map(h => [
                        h.fecha, h.hora || '', h.tasa
                    ]) : [['Sin historial']])}
                ];
                await descargarXlsx(nombre, hojas);
            } else {
                const w = window.open('', '_blank');
                if(!w){ await jamAlert('El navegador bloqueó la ventana. Permite ventanas emergentes o usa Exportar Excel.', 'error'); return; }
                w.document.open(); w.document.write(html); w.document.close();
                setTimeout(() => { try { w.focus(); w.print(); } catch(e){} }, 400);
            }
        } catch(err) { console.error('ERROR REPORTE DOC:', err); await jamAlert('No se pudo generar el reporte: ' + err.message, 'error'); }
    }
    async function mostrarResumen(){
        currentSub = 'resumen';
        const bloqueado = volverBloqueado, accent = D.config.theme;
        const ventas = await getAll('ventas');
        D.gastos = await getAll('gastos'); D.empleados = await getAll('empleados');
        const _p = _periodoReporte || 'mes';
        const rp = rangoPeriodo(_p);
        const ventasPer = ventas.filter(v => { const t = msToDateStr(v.timestamp || new Date(v.fecha).getTime()); return t >= rp.ini && t <= rp.fin; });
        const gastosPer = (D.gastos||[]).filter(g => { const t = msToDateStr(g.timestamp || new Date(g.fecha).getTime()); return t >= rp.ini && t <= rp.fin; });
        const totVentas = ventasPer.reduce((a,v)=>a+(v.total||0),0);
        const totGan = ventasPer.filter(v => !v.credito).reduce((a,v)=>a+(v.gananciaTotal||0),0);
        const totGastos = gastosPer.reduce((a,g)=>a+(g.montoBs||0),0);
        const { nominaUso, nominaLbl } = periodoNominaInfo(_p, D.empleados, D.gastos);
        const utilNeta = totGan - totGastos - nominaUso;
        const totGanCreditoRes = ventasPer.filter(v => v.credito && !v.anulada).reduce((a,v)=>a+(v.gananciaTotal||0),0);
        document.getElementById('appRoot').innerHTML = `
            <div class="page-header-fixed"><div class="module-header"><div class="flex items-center" style="min-width:0"><span class="module-crumb" onclick="navigateTo('reportes')" title="Ir a Reportes">Reportes</span><span class="module-crumb-sep">/</span><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Resumen')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Resumen</h2></div><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div>
            <div class="page-container">
                <div class="config-section" style="margin-bottom:16px">
                    <div class="config-section-title" style="font-size:.75rem;font-weight:700;opacity:.6;margin-bottom:8px"><i class="fas fa-clipboard"></i> Resumen del período</div>
                    <div class="flex gap-1 mb-2" style="flex-wrap:wrap">${['hoy','semana','mes','anio'].map(p => `<button id="perBtn_${p}" class="btn-redondeado py-1 px-3 text-xs" style="${_p===p ? `background:${accent};color:#fff` : `border:1px solid ${accent};color:${accent}`}">${p==='hoy'?'Hoy':p==='semana'?'7 días':p==='mes'?'Mes':p==='anio'?'Año':''}</button>`).join('')}</div>
                    <div id="resumenPeriodo">
                        <div class="card-bcv" style="padding:10px;margin-bottom:6px"><div class="flex justify-between"><span class="text-xs" style="opacity:.7">Período</span><span class="text-xs font-bold">${labelPeriodo(_p)} · ${rp.ini} → ${rp.fin}</span></div></div>
                        <div class="grid grid-cols-2 gap-2">
                            <div class="card-bcv" style="padding:10px;text-align:center"><div class="font-black text-lg" style="color:${accent}">${fmtPrecio(totVentas)}</div><div class="text-xs opacity-70">Ventas (Bs)</div></div>
                            <div class="card-bcv" style="padding:10px;text-align:center"><div class="font-black text-lg" style="color:#10b981">${fmtPrecio(totGan)}</div><div class="text-xs opacity-70">Ganancia cobrada (Bs)</div></div>
                            <div class="card-bcv" style="padding:10px;text-align:center"><div class="font-black text-lg" style="color:#ef4444">${fmtPrecio(totGastos)}</div><div class="text-xs opacity-70">Gastos (Bs)</div></div>
                            <div class="card-bcv" style="padding:10px;text-align:center"><div class="font-black text-lg" style="color:#f59e0b">${nominaUso > 0 ? fmtPrecio(nominaUso) : '—'}</div><div class="text-xs opacity-70">${nominaLbl}</div></div>
                        </div>
                        <div class="card-bcv" style="padding:10px;margin-top:6px"><div class="flex justify-between items-center"><span class="text-xs" style="opacity:.7">Ganancia a crédito (período)</span><span class="text-lg font-black" style="color:#f59e0b">${totGanCreditoRes > 0 ? fmtPrecio(totGanCreditoRes) + ' Bs' : '—'}</span></div></div>
                        <div class="card-bcv" style="padding:10px;margin-top:6px"><div class="flex justify-between items-center"><span class="text-xs" style="opacity:.7">Utilidad neta</span><span class="text-lg font-black" style="color:${utilNeta >= 0 ? '#10b981' : '#ef4444'}">${fmtPrecio(utilNeta)} Bs</span></div></div>
                    </div>
                    <div class="flex gap-2 mt-2"><button id="btnDocExcel" class="btn-azul-redondeado btn-redondeado flex-1 py-2 text-xs"><i class="fas fa-chart-column"></i> Exportar Excel</button><button id="btnDocPrint" class="btn-redondeado flex-1 py-2 text-xs" style="border:1.5px solid ${accent};color:${accent}"><i class="fas fa-file-invoice"></i> Documento (imprimir)</button></div>
                </div>
                <div class="config-section" style="margin-bottom:16px">
                    <div class="config-section-title" style="font-size:.75rem;font-weight:700;opacity:.6;margin-bottom:8px"><i class="fas fa-user-tie"></i> Nómina (salarios de empleados)</div>
                    ${nóminaPendienteHTML()}
                </div>
            </div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        ['hoy','semana','mes','anio'].forEach(p => { const b = document.getElementById('perBtn_'+p); if(b) b.onclick = () => { _periodoReporte = p; mostrarResumen(); }; });
        document.getElementById('btnDocExcel').onclick = () => generarReporteDocumento(_periodoReporte, 'excel');
        document.getElementById('btnDocPrint').onclick = () => generarReporteDocumento(_periodoReporte, 'print');
        inyectarBotonAyudaModulo();
    }
    async function renderReportes(){
        let ventas = await getAll('ventas');
        D.gastos = await getAll('gastos'); D.empleados = await getAll('empleados'); D.entregas = await getAll('entregas');
        let bloqueado = volverBloqueado, accent = D.config.theme;
        let histTasa = cargarHistorialTasa();
        let dias = [];
        for(let i=6; i>=0; i--){
            let d = new Date(); d.setDate(d.getDate()-i);
            let fechaStr = msToDateStr(d.getTime());
            let registro = histTasa.filter(h => h.fecha === fechaStr).slice(-1)[0];
            dias.push(registro || { fecha: fechaStr, hora: '', tasa: null });
        }
        let tasaHtml = dias.map((h, idx) => {
            let prev = idx > 0 ? dias[idx-1] : null;
            let flecha = '';
            if(prev && prev.tasa !== null && h.tasa !== null){
                let diff = h.tasa - prev.tasa;
                if(diff > 0.001) flecha = '<span style="color:#ef4444">▲</span>';
                else if(diff < -0.001) flecha = '<span style="color:#10b981">▼</span>';
            }
            let valor = h.tasa !== null ? `${flecha} ${fmtDolar(h.tasa)} Bs` : '<span style="opacity:.4">—</span>';
            return `<div class="flex justify-between items-center" style="padding:5px 0;border-bottom:1px solid rgba(128,128,128,.1)"><span class="text-xs" style="opacity:.6">${fmtTasaSemanaEtiqueta(h)}</span><span class="text-xs font-bold" style="color:${accent}">${valor}</span></div>`;
        }).join('');
        document.getElementById('appRoot').innerHTML = `
            <div class="page-header-fixed"><div class="module-header"><div class="flex items-center" style="min-width:0"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Reportes')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Reportes</h2><span class="module-crumb-sep">/</span><button id="btnIrResumen" class="btn-cabezal-sub" type="button" title="Resumen del período">Resumen</button></div><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div>
            <div class="page-container">
                <div class="chart-hint" style="text-align:center;font-size:.75rem;opacity:.5;margin-bottom:6px">Toca una barra para ver los indicadores del día</div>
                <div class="chart-container"><canvas id="chartVentas"></canvas></div>
                <div class="config-section" style="margin-bottom:16px">
                    <div class="config-section-title" style="font-size:.75rem;font-weight:700;opacity:.6;margin-bottom:8px"><i class="fas fa-money-bill-transfer"></i> Tasa del dólar — últimos 7 días</div>
                    ${tasaHtml}
                </div>
                <h3 class="font-bold mb-2">Registro de ventas</h3>
                <div class="flex gap-2 mb-2">
                    <div class="buscador" style="flex:1">
                        <i class="fas fa-search icono-busqueda"></i>
                        <input id="buscarVentas" type="text" placeholder="Buscar por fecha, artículo o cliente..." oninput="window.onBuscarVentasTexto()" class="border-2 rounded-xl p-2 w-full" autocomplete="off">
                        <button id="btnCalendarioVentas" class="btn-icon-cuadrado" title="Ver ventas por fecha" onclick="window.abrirCalendarioVentas()"><i class="fas fa-calendar-alt"></i></button>
                    </div>
                </div>
                <div class="text-xs opacity-60 mb-2" id="contadorVentas">${ventas.length} venta(s)</div>
                <div id="listaVentasReporte" class="max-h-64 overflow-auto">${ventas.slice().reverse().map(v => ventaCardReporte(v)).join('')}</div>
            </div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        const bResumen = document.getElementById('btnIrResumen');
        if(bResumen) bResumen.onclick = () => mostrarResumen();
        renderGraficoVentas(ventas);
        D.ventas = ventas;
        setTimeout(() => {
            let canvas = document.getElementById('chartVentas');
            if(!canvas) return;
            let handler = (ex, ey) => {
                let r = canvas.getBoundingClientRect();
                let cx = ex - r.left, cy = ey - r.top;
                for(let b of _barsInfo){
                    if(cx >= b.x && cx <= b.x + b.w && cy >= b.y - 10 && cy <= b.y + b.h + 14){
                        document.querySelectorAll('.kpi-popup-overlay').forEach(e => e.remove());
                        mostrarKPIsDelDia(b.fecha, b.label);
                        return;
                    }
                }
            };
            canvas.addEventListener('click', e => handler(e.clientX, e.clientY));
            canvas.addEventListener('touchstart', e => { e.preventDefault(); handler(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
        }, 100);
    }
    
    const formasPagoGlobal = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MÓVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DÉBITO','dolares':'DÓLARES','pago_dividido':'PAGO DIVIDIDO','credito':'CRÉDITO' };
    function ventaCardReporte(v){
        const _clRep = v.clienteId ? D.clientes.find(c => c.id === v.clienteId) : null;
        const cedulaRep = _clRep && _clRep.cedula ? ` (${escapeHtml(_clRep.cedula)})` : '';
        const totalUsdRep = v.dolarRate > 0 ? ` / $${fmtDolar(v.total / v.dolarRate)}` : '';
        return `<div class="border rounded-xl p-3 mb-2 cursor-pointer hover:opacity-80" style="border-color:var(--accent)" onclick="window.mostrarTicketDesdeReporte('${v.id}')"><div class="flex justify-between items-start"><div><b>${escapeHtml(v.id)}</b></div><div class="text-xs opacity-60">${escapeHtml(v.fecha)}</div></div><div class="text-sm mt-1"><i class="fas fa-user"></i> ${escapeHtml(v.cliente)}${cedulaRep}</div><div class="flex justify-between items-center mt-1"><span class="text-sm font-bold" style="color:var(--accent)">${fmtPrecio(v.total)} Bs${totalUsdRep}</span><span class="text-xs">${formasPagoGlobal[v.tipoPago] || v.tipoPago}</span></div>${v.dolarRate ? `<div class="text-xs mt-1 opacity-60"><i class="fas fa-dollar-sign"></i> Tasa del día: 1 USD = ${fmtDolar(v.dolarRate)} Bs</div>` : ''}<div class="text-xs mt-1 opacity-60">${(v.items||[]).map(i=>`${escapeHtml(i.nombre)} x${i.cantidad}${i.precioUsd ? ` ($${fmtDolar(i.precioUsd)})` : ''}`).join(', ')}</div></div>`;
    }
    let filtroCalendario = null;
    const mesNombre = m => ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m];
    function isoFechaVenta(v){
        if(v.timestamp) return msToDateStr(v.timestamp);
        return aFechaISO(v.fecha);
    }
    window.filtrarVentasReporte = () => {
        const input = document.getElementById('buscarVentas');
        const lista = document.getElementById('listaVentasReporte');
        const contador = document.getElementById('contadorVentas');
        const btnCal = document.getElementById('btnCalendarioVentas');
        if(!lista) return;
        let q = (input ? input.value : '').toLowerCase().trim();
        let base = D.ventas;
        if(filtroCalendario){
            base = D.ventas.filter(v => {
                let iso = isoFechaVenta(v);
                if(!iso) return false;
                return filtroCalendario.tipo === 'dia' ? iso === filtroCalendario.valor : iso.startsWith(filtroCalendario.valor);
            });
        }
        let result;
        if(filtroCalendario || !q) result = base.slice().reverse();
        else result = base.filter(v => {
            let hayFecha = String(v.fecha||'').toLowerCase().includes(q);
            let hayCliente = String(v.cliente||'').toLowerCase().includes(q);
            let hayItem = (v.items||[]).some(i => String(i.nombre||'').toLowerCase().includes(q));
            let hayId = String(v.id||'').toLowerCase().includes(q);
            return hayFecha || hayCliente || hayItem || hayId;
        }).reverse();
        lista.innerHTML = result.map(v => ventaCardReporte(v)).join('');
        if(contador) contador.innerText = result.length + ' venta(s)';
        if(btnCal) btnCal.style.background = filtroCalendario ? (D.config.theme || '#3b82f6') : '';
    };
    window.onBuscarVentasTexto = () => { if(filtroCalendario) filtroCalendario = null; window.filtrarVentasReporte(); };
    window.limpiarBuscarVentas = () => {
        filtroCalendario = null;
        const input = document.getElementById('buscarVentas');
        if(input) input.value = '';
        window.filtrarVentasReporte();
    };
    window.aplicarFiltroDia = (iso) => {
        filtroCalendario = { tipo:'dia', valor: iso };
        const input = document.getElementById('buscarVentas');
        if(input) input.value = iso;
        window.filtrarVentasReporte();
        const modal = document.getElementById('modalCalendarioVentas');
        if(modal) modal.remove();
    };
    window.aplicarFiltroMes = (prefix, etiqueta) => {
        filtroCalendario = { tipo:'mes', valor: prefix };
        const input = document.getElementById('buscarVentas');
        if(input) input.value = etiqueta;
        window.filtrarVentasReporte();
        const modal = document.getElementById('modalCalendarioVentas');
        if(modal) modal.remove();
    };
    window.quitarFiltroFecha = () => {
        filtroCalendario = null;
        const input = document.getElementById('buscarVentas');
        if(input) input.value = '';
        window.filtrarVentasReporte();
        const modal = document.getElementById('modalCalendarioVentas');
        if(modal) modal.remove();
    };
    function renderCalendarioVentas(){
        const modal = document.getElementById('modalCalendarioVentas');
        if(!modal) return;
        const a = window._calYear, m = window._calMonth;
        const primerDia = new Date(a, m, 1).getDay();
        const numDias = new Date(a, m + 1, 0).getDate();
        const prefijo = a + '-' + String(m + 1).padStart(2, '0');
        let ventasMes = D.ventas.filter(v => isoFechaVenta(v).startsWith(prefijo));
        let totalMes = ventasMes.reduce((s, v) => s + (v.total || 0), 0);
        const semana = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
        let celdas = semana.map(d => `<div class="cal-cabecera">${d}</div>`).join('');
        for(let i = 0; i < primerDia; i++) celdas += `<div class="cal-vacio"></div>`;
        let prevTasa = 0;
        for(let d = 1; d <= numDias; d++){
            const iso = prefijo + '-' + String(d).padStart(2, '0');
            const n = ventasMes.filter(v => isoFechaVenta(v) === iso).length;
            const info = tasaParaFecha(iso);
            const conTasa = info.tasa > 0;
            let flecha = '';
            if(conTasa){
                if(prevTasa > 0 && info.tasa > prevTasa) flecha = '<span class="cal-flecha cal-flecha-up">▲</span>';
                else if(prevTasa > 0 && info.tasa < prevTasa) flecha = '<span class="cal-flecha cal-flecha-down">▼</span>';
                prevTasa = info.tasa;
            }
            const tasaHtml = conTasa ? `<span class="cal-tasa">${flecha}${fmtDolar(info.tasa)}</span>` : '';
            celdas += `<button class="cal-dia ${n > 0 ? 'cal-dia-venta' : ''}" onclick="window.aplicarFiltroDia('${iso}')"><span class="cal-dia-num">${d}</span>${n > 0 ? `<span class="cal-badge">${n}</span>` : ''}${tasaHtml}</button>`;
        }
        modal.innerHTML = `<div class="modal-form-content" style="max-width:340px">
            <h3 class="font-bold text-lg mb-1" style="color:${D.config.theme}"><i class="fas fa-calendar-days"></i> Ventas por fecha</h3>
            <p class="text-xs opacity-70 mb-2">La tasa del día aparece en cada casilla.</p>
            <div class="cal-nav"><button onclick="window._calMonth--;if(window._calMonth<0){window._calMonth=11;window._calYear--;}renderCalendarioVentas()">◀</button><div class="cal-titulo">${mesNombre(m)} ${a}</div><button onclick="window._calMonth++;if(window._calMonth>11){window._calMonth=0;window._calYear++;}renderCalendarioVentas()">▶</button></div>
            <div class="cal-nav cal-nav-ano"><button onclick="window._calYear--;renderCalendarioVentas()">◀ Año</button><div class="cal-titulo">${ventasMes.length} venta(s) · ${fmtPrecio(totalMes)} Bs</div><button onclick="window._calYear++;renderCalendarioVentas()">Año ▶</button></div>
            <div class="cal-grid">${celdas}</div>
            <div class="flex gap-2 mt-3">
                <button class="btn-azul-redondeado btn-redondeado flex-1 py-2 text-sm" onclick="window.aplicarFiltroMes('${prefijo}','${mesNombre(m)} ${a}')"><i class="fas fa-calendar-days"></i> Ver todo ${mesNombre(m)}</button>
                <button class="btn-redondeado flex-1 py-2 bg-gray-200 text-sm" onclick="window.quitarFiltroFecha()"><i class="fas fa-trash"></i> Quitar</button>
            </div>
            <button class="w-full mt-2 py-2 rounded-xl bg-gray-200" onclick="document.getElementById('modalCalendarioVentas').remove()">Cerrar</button>
        </div>`;
    }
    window.abrirCalendarioVentas = () => {
        const ahora = new Date();
        window._calYear = ahora.getFullYear();
        window._calMonth = ahora.getMonth();
        const modal = document.createElement('div');
        modal.className = 'modal-form';
        modal.id = 'modalCalendarioVentas';
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        renderCalendarioVentas();
    };
    
    window.mostrarTicketDesdeReporte = (ventaId) => {
        let venta = D.ventas.find(v => v.id === ventaId);
        if(venta) mostrarTicket(venta, true);
    };
    window.mostrarDetalleCliente = (clienteId) => {
        if (!clienteId) return;
        const cliente = D.clientes.find(c => c.id === clienteId);
        if (!cliente) return;
        const adeudo = parseFloat(cliente.adeudo) || 0;
        const modal = document.createElement('div'); modal.className = 'modal-form';
        // Ventas a crédito con saldo pendiente de este cliente (avecindan en Carmen: ticket + plazo + vencimiento).
        const pendientes = ((D.ventas)||[]).filter(v => v.credito && !v.anulada && v.clienteId === clienteId && ((v.creditoRestante != null ? v.creditoRestante : v.total) > 0));
        const pendientesHtml = pendientes.length ? `<div class="mb-3 text-xs"><div class="font-bold mb-1" style="opacity:.7"><i class="fas fa-hand-holding-dollar"></i> Ventas a crédito pendientes:</div>${pendientes.slice().reverse().map(v => { const rest = (v.creditoRestante != null) ? v.creditoRestante : v.total; return `&nbsp;• <b>${escapeHtml(v.id)}</b> ${escapeHtml(textoFechaVenta(v))}<br>&nbsp;&nbsp;Pendiente: <b>${fmtPrecio(rest)} Bs</b>${v.creditoPlazoDias ? ' · Plazo: ' + v.creditoPlazoDias + ' días' : ''}${v.creditoFechaLimite ? ' · Vence: ' + escapeHtml(textoFechaLimite(v.creditoFechaLimite)) : ''}`; }).join('<br>')}</div>` : '';
        const abonosHtml = (cliente.abonos && cliente.abonos.length) ? `<div class="mb-3 text-xs"><div class="font-bold mb-1" style="opacity:.7"><i class="fas fa-scroll"></i> Abonos registrados:</div>${cliente.abonos.slice().reverse().map(a => `&nbsp;• ${escapeHtml(textoFechaLimite(a.timestamp || a.fecha))}: <b>${fmtPrecio(a.monto)} Bs</b>${a.nota ? ' (' + escapeHtml(a.nota) + ')' : ''}`).join('<br>')}</div>` : '';
        modal.innerHTML = `<div class="modal-form-content"><h3 class="text-xl font-bold mb-4">Detalles del Cliente</h3><div class="mb-2"><strong>Nombre:</strong> ${escapeHtml(cliente.nombre)}</div><div class="mb-2"><strong>Cédula/RIF:</strong> ${escapeHtml(cliente.cedula || 'N/A')}</div><div class="mb-2"><strong>Teléfono:</strong> ${escapeHtml(cliente.telefono || 'N/A')}</div><div class="mb-2"><strong>Dirección:</strong> ${escapeHtml(cliente.direccion || 'N/A')}</div><div class="mb-2"><strong>Email:</strong> ${escapeHtml(cliente.email || 'N/A')}</div><div class="mb-3 rounded-xl p-3" style="background:rgba(128,128,128,0.07)"><span class="text-sm font-bold" style="color:${adeudo > 0 ? '#ef4444' : '#10b981'}"><i class="fas fa-credit-card"></i> Saldo: ${fmtPrecio(adeudo)} Bs</span></div>${pendientesHtml}${abonosHtml}<div class="flex gap-3 mt-4"><button id="btnAbonoDetalle" class="btn-azul-redondeado btn-redondeado flex-1 py-2"><i class="fas fa-money-bill-wave"></i> Registrar abono</button><button id="closeDetalle" class="btn-redondeado flex-1 py-2 bg-gray-200">Cerrar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('closeDetalle').onclick = () => modal.remove();
        document.getElementById('btnAbonoDetalle').onclick = () => { modal.remove(); registrarAbono(clienteId); };
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
    };
    // ==================== CARTERA CxC (créditos por cobrar) ====================
    // Vista consolidada de los adeudos de todos los clientes (ventas a crédito).
    // Muestra total por cobrar, cobrado acumulado, filtros y permite registrar
    // abonos desde el mismo listado (reutiliza registrarAbono).
    let _filtroCartera = 'deuda';
    async function renderCartera(){
        currentSub = 'cartera';
        let bloqueado = volverBloqueado, accent = D.config.theme;
        D.clientes = await getAll('clientes');
        const todos = D.clientes || [];
        const conDeuda = todos.filter(c => (parseFloat(c.adeudo) || 0) > 0);
        const totalCxC = conDeuda.reduce((a,c) => a + (parseFloat(c.adeudo) || 0), 0);
        const totalAbonos = todos.reduce((a,c) => a + (c.abonos || []).reduce((x,ab) => x + (ab.monto || 0), 0), 0);
        document.getElementById('appRoot').innerHTML = `
            <div class="page-header-fixed"><div class="module-header"><div class="flex items-center" style="min-width:0"><span class="module-crumb" onclick="navigateTo('clientes')" title="Ir a Clientes">Clientes</span><span class="module-crumb-sep">/</span><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Cartera')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Cartera</h2></div><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div>
            <div class="page-container">
                <div class="config-section" style="margin-bottom:16px">
                    <div class="config-section-title" style="font-size:.75rem;font-weight:700;opacity:.6;margin-bottom:8px"><i class="fas fa-chart-column"></i> Resumen de cartera</div>
                    <div class="grid grid-cols-3 gap-2">
                        <div class="card-bcv" style="padding:10px;text-align:center"><div class="font-black text-lg" style="color:#ef4444">${fmtPrecio(totalCxC)}</div><div class="text-xs opacity-70">Por cobrar (Bs)</div></div>
                        <div class="card-bcv" style="padding:10px;text-align:center"><div class="font-black text-lg" style="color:${accent}">${conDeuda.length}</div><div class="text-xs opacity-70">Clientes con deuda</div></div>
                        <div class="card-bcv" style="padding:10px;text-align:center"><div class="font-black text-lg" style="color:#10b981">${fmtPrecio(totalAbonos)}</div><div class="text-xs opacity-70">Cobrado (abonos)</div></div>
                    </div>
                </div>
                <div class="flex gap-1 mb-2" style="flex-wrap:wrap">
                    <button id="filtroCartera_deuda" class="btn-redondeado py-1 px-3 text-xs" style="${_filtroCartera==='deuda' ? `background:${accent};color:#fff` : `border:1px solid ${accent};color:${accent}`}"><i class="fas fa-credit-card"></i> Deudores (${conDeuda.length})</button>
                    <button id="filtroCartera_todos" class="btn-redondeado py-1 px-3 text-xs" style="${_filtroCartera==='todos' ? `background:${accent};color:#fff` : `border:1px solid ${accent};color:${accent}`}"><i class="fas fa-users"></i> Todos (${todos.length})</button>
                </div>
                <div class="mb-3 relative">
                    <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                    <input type="text" id="searchCartera" placeholder="Buscar por nombre o cédula..." class="pl-9 pr-3 py-2 border-2 rounded-xl w-full" style="border-color:${accent}">
                </div>
                <div id="listaCartera" class="scroll-area"></div>
            </div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        document.getElementById('filtroCartera_deuda').onclick = () => { _filtroCartera = 'deuda'; renderCartera(); };
        document.getElementById('filtroCartera_todos').onclick = () => { _filtroCartera = 'todos'; renderCartera(); };
        const inpC = document.getElementById('searchCartera');
        if(inpC) inpC.oninput = e => renderListaCartera(e.target.value.toLowerCase());
        renderListaCartera('');
        inyectarBotonAyudaModulo();
    }
    function renderListaCartera(norm){
        const todos = D.clientes || [];
        // Ventas a crédito pendientes de un cliente y su vencimiento más próximo (sirve para "Vence:" en la tarjeta).
        const ventasCreditoPendientes = (clienteId) => ((D.ventas)||[]).filter(v => v.credito && !v.anulada && v.clienteId === clienteId && ((v.creditoRestante != null ? v.creditoRestante : v.total) > 0));
        const vencimientoCliente = (clienteId) => { let mejor = null; ventasCreditoPendientes(clienteId).forEach(v => { const m = Number(v.creditoFechaLimite) || 0; if(m && (mejor === null || m < mejor)) mejor = m; }); return mejor ? { ms: mejor, txt: textoFechaLimite(mejor) } : null; };
        let filt = todos.map(c => ({ c, adeudo: parseFloat(c.adeudo) || 0 }))
            .filter(x => _filtroCartera === 'todos' || x.adeudo > 0)
            .filter(x => {
                const texto = [x.c.nombre||'', x.c.cedula||'', x.c.telefono||''].join(' ');
                return normalizeText(texto).includes(norm);
            })
            .sort((a,b) => b.adeudo - a.adeudo);
        const cont = document.getElementById('listaCartera'); if(!cont) return;
        if(!filt.length){ cont.innerHTML = '<div class="text-center py-4 text-gray-500">' + (_filtroCartera==='deuda' ? 'Sin clientes con deuda <i class="fas fa-heart"></i>' : 'No hay clientes registrados') + '</div>'; return; }
        cont.innerHTML = filt.map(x => {
            const venc = vencimientoCliente(x.c.id);
            const ultAbono = (x.c.abonos && x.c.abonos.length) ? x.c.abonos[x.c.abonos.length-1] : null;
            const esDeudor = x.adeudo > 0;
            return `
            <div class="client-card" data-id="${x.c.id}" style="${esDeudor ? 'background:rgba(239,68,68,0.14)!important;border-color:rgba(239,68,68,0.7)!important' : ''}">
                <div class="font-bold break-words">${esDeudor ? '<i class="fas fa-circle-exclamation" style="color:#ef4444;margin-right:4px"></i>' : ''}${escapeHtml(String(x.c.nombre || 'Sin nombre'))} ${esDeudor ? '<span style="font-size:9px;font-weight:800;color:#fff;background:#ef4444;border-radius:999px;padding:1px 6px;vertical-align:middle">DEUDOR</span>' : ''}</div>
                <div class="text-xs text-gray-500 mt-1"><i class="fas fa-id-card"></i> ${escapeHtml(x.c.cedula || 'N/A')} | <i class="fas fa-phone"></i> ${escapeHtml(x.c.telefono || '—')}</div>
                <div class="flex justify-between items-center mt-1"><span class="text-xs" style="opacity:.7">Saldo</span><span class="text-sm font-bold" style="color:${x.adeudo > 0 ? '#ef4444' : '#10b981'}">${fmtPrecio(x.adeudo)} Bs</span></div>
                ${venc ? `<div class="text-xs mt-1" style="opacity:.8;color:${venc.ms < Date.now() ? '#ef4444' : 'inherit'}"><i class="fas fa-calendar-day"></i> ${venc.ms < Date.now() ? 'Vencido:' : 'Vence:'} ${venc.txt}</div>` : ''}
                ${ultAbono ? `<div class="text-xs mt-1" style="opacity:.6"><i class="fas fa-scroll"></i> Último abono: ${escapeHtml(textoFechaLimite(ultAbono.timestamp || ultAbono.fecha))} · ${fmtPrecio(ultAbono.monto)} Bs</div>` : ''}
                <div class="card-btns"><button class="btn-abono-cartera btn-verde-redondeado"><i class="fas fa-money-bill-wave"></i> Abono</button><button class="btn-detalle-cartera btn-editar-redondeado"><i class="fas fa-user"></i> Detalle</button></div>
            </div>`; }).join('');
        document.querySelectorAll('.btn-abono-cartera').forEach((btn, idx) => { btn.onclick = () => registrarAbono(filt[idx].c.id); });
        document.querySelectorAll('.btn-detalle-cartera').forEach((btn, idx) => { btn.onclick = () => mostrarDetalleCliente(filt[idx].c.id); });
    }

    // ==================== COBRANZA / ABONOS DE CLIENTES ====================
    // Registra abonos al crédito de un cliente: descuenta su adeudo y deja
    // constancia en 'abonos' del cliente. El dinero cobrado NO altera la
    // utilidad de reportes (la ganancia ya se contó con la venta a crédito);
    // se suma al arqueo del cierre de caja del día (ventasEsperadasCaja)
    // para que cuadre con el efectivo físico recaudado hoy.
    window.registrarAbono = async (clienteId) => {
        const cli = (D.clientes || []).find(c => c.id === clienteId);
        if(!cli){ mostrarNotificacion('Cliente no encontrado', 'error'); return; }
        const adeudo = parseFloat(cli.adeudo) || 0;
        if(adeudo <= 0){ await jamAlert(cli.nombre + ' no tiene deudas registradas', 'info'); return; }
        const modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:400px"><h3 class="text-xl font-bold mb-2"><i class="fas fa-money-bill-wave"></i> Abono de ${escapeHtml(cli.nombre)}</h3>
            <div class="text-sm mb-3" style="opacity:.7">Adeudo actual: <b style="color:#ef4444">${fmtPrecio(adeudo)} Bs</b></div>
            <div class="mb-3"><label>Monto del abono (Bs)</label><input type="text" id="abonoMonto" inputmode="decimal" value="${adeudo > 0 ? fmtPrecio(adeudo) : ''}" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Método de cobro</label><input type="hidden" id="abonoMetodo" value="efectivo_bs"><button type="button" id="btnAbonoMetodo" class="border rounded-xl p-2 w-full flex items-center justify-between" style="background:rgba(0,0,0,0.04);cursor:pointer;text-align:left"><span style="display:flex;align-items:center;gap:8px;min-width:0"><i id="abonoMetodoIcon" class="fas fa-money-bill-wave" style="color:var(--accent,#3b82f6);width:18px;text-align:center;flex-shrink:0"></i><span id="abonoMetodoText" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:.9rem">Efectivo (Bs)</span></span><span aria-hidden="true" style="flex-shrink:0;opacity:.55;font-size:.7rem">&#9662;</span></button></div>
            <div class="mb-3"><label>Nota (opcional)</label><input type="text" id="abonoNota" placeholder="Ej: primer corte" class="border rounded-xl p-2 w-full"></div>
            <div class="flex gap-3 mt-4"><button id="guardarAbono" class="btn-azul-redondeado btn-redondeado flex-1 py-2 font-bold">Registrar abono</button><button id="cancelarAbono" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        aplicarMascaraBs(document.getElementById('abonoMonto'));
        const pintarAbonoMetodo = (v) => {
            const inp = document.getElementById('abonoMetodo'); if(inp) inp.value = v;
            const txt = document.getElementById('abonoMetodoText'); if(txt) txt.textContent = nombreTipoPago(v);
            const ic = document.getElementById('abonoMetodoIcon'); if(ic) ic.className = 'fas ' + iconoTipoPago(v);
        };
        const btnAbonoMetodo = document.getElementById('btnAbonoMetodo');
        if(btnAbonoMetodo) btnAbonoMetodo.onclick = () => mostrarSelectorPago(document.getElementById('abonoMetodo').value, v => pintarAbonoMetodo(v), PAGOS_SOLO_ABONO);
        pintarAbonoMetodo(document.getElementById('abonoMetodo').value);
        document.getElementById('cancelarAbono').onclick = () => modal.remove();
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
        document.getElementById('guardarAbono').onclick = async () => {
            const monto = parseBs(document.getElementById('abonoMonto').value);
            if(!(monto > 0)){ await jamAlert('Ingresa un monto válido', 'error'); return; }
            if(monto > adeudo + 0.01 && !(await jamConfirm(`El abono (${fmtPrecio(monto)} Bs) supera el adeudo (${fmtPrecio(adeudo)} Bs). ¿Registrarlo igualmente?`))) return;
            const metodo = document.getElementById('abonoMetodo').value;
            const nota = document.getElementById('abonoNota').value.trim();
            const todas = await getAll('clientes');
            const cliActual = todas.find(c => c.id === clienteId) || cli;
            cliActual.adeudo = Math.max(0, Math.round(((parseFloat(cliActual.adeudo) || 0) - monto) * 100) / 100);
            cliActual.abonos = cliActual.abonos || [];
            cliActual.abonos.push({ fecha: msToDateStr(Date.now()), monto: Math.round(monto*100)/100, metodo, nota, timestamp: Date.now() });
            await saveItem('clientes', cliActual);
            D.clientes = await getAll('clientes');
            modal.remove();
            if(currentSub === 'cartera') renderCartera();
            else renderCrud('clientes','Clientes',['cedula','nombre','telefono','direccion','email']);
            mostrarNotificacion('💵 Abono registrado', 'success');
        };
    };
    
    // ==================== RESPALDO Y RESTAURACIÓN ====================
    function esAppNativa() { return !!(window.AndroidBridge); }
    function utf8ToBase64(str) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(binary);
    }
    function base64ToUtf8(b64) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }
    let carpetaNativa = null;
    let carpetaAccionPendiente = null;
    async function leerCarpetaNativa() {
        if (!esAppNativa()) return;
        try {
            const info = await puenteResultado(AndroidBridge.getCarpetaInfo());
            if (info) {
                const idx = info.indexOf('|');
                carpetaNativa = idx >= 0
                    ? { nombre: info.slice(0, idx), uri: info.slice(idx + 1) }
                    : { nombre: info, uri: info };
            }
        } catch (e) { carpetaNativa = null; }
    }
    window.carpetaSeleccionadaCallback = function (nombre, uri) {
        const accion = carpetaAccionPendiente;
        carpetaAccionPendiente = null;
        if (uri) {
            carpetaNativa = { nombre: nombre || 'Carpeta', uri: uri };
            actualizarUICarpeta();
            mostrarNotificacion('✅ Carpeta configurada: ' + (nombre || 'carpeta') + '/JAMPOS', 'success');
            if (accion) setTimeout(accion, 200);
        } else {
            mostrarNotificacion('⚠️ No se eligió carpeta', 'info');
        }
    };
    function asegurarCarpetaNativa(accion) {
        if (!esAppNativa()) { accion(); return; }
        if (carpetaNativa && carpetaNativa.uri) { accion(); return; }
        carpetaAccionPendiente = accion;
        mostrarNotificacion('Primero elija una carpeta donde JAM POS guardará sus archivos', 'info');
        try { AndroidBridge.elegirCarpeta(); } catch (e) { carpetaAccionPendiente = null; accion(); }
    }
    function actualizarUICarpeta() {
        if (!esAppNativa()) return;
        const estado = document.getElementById('carpetaEstado');
        if (estado) {
            estado.innerHTML = carpetaNativa && carpetaNativa.uri
                ? '<i class="fas fa-circle-check"></i> Carpeta activa: <b>' + escapeHtml(carpetaNativa.nombre) + '/JAMPOS</b>. Ahí se guardan tickets y respaldos.'
                : '<i class="fas fa-circle-info"></i> Sin carpeta configurada. Elija una carpeta para guardar tickets y respaldos (se creará la subcarpeta JAMPOS).';
        }
        const btn = document.getElementById('elegirCarpetaBtn');
        if (btn) btn.innerHTML = carpetaNativa && carpetaNativa.uri ? '<i class="fas fa-folder-open"></i> Cambiar carpeta' : '<i class="fas fa-folder"></i> Elegir carpeta';
    }
    async function obtenerTodosLosDatos(){
        let stores = ['productos','clientes','proveedores','gastos','empleados','ventas','entregas','tickets'];
        let data = { config: D.config, timestamp: new Date().toISOString(), version: '0.1' };
        for (const s of stores) { data[s] = await getAll(s); }
        data.historialTasa = cargarHistorialTasa();
        data.tasaDiaria = await cargarTasaDiaria();
        data.caja = cargarCaja();
        return data;
    }
    async function exportarBackupJSON(){
        let data = await obtenerTodosLosDatos();
        if (esAppNativa()) {
            asegurarCarpetaNativa(async () => {
                try {
                    const nombre = `jampos_backup_${new Date().toISOString().slice(0,10)}.json`;
                    const res = await puenteResultado(AndroidBridge.guardarArchivo(nombre, 'application/json', utf8ToBase64(JSON.stringify(data, null, 2))));
                    if (res && res.startsWith('ok')) {
                        mostrarNotificacion('✅ Backup JSON guardado en ' + (carpetaNativa ? carpetaNativa.nombre : 'carpeta') + '/JAMPOS/' + nombre, 'success');
                    } else {
                        mostrarNotificacion('❌ No se pudo exportar: ' + (res || 'error desconocido'), 'error');
                    }
                } catch (e) { mostrarNotificacion('❌ Error al exportar: ' + e.message, 'error'); }
            });
            return;
        }
        let blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a'); a.href = url;
        a.download = `jampos_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click(); URL.revokeObjectURL(url);
        mostrarNotificacion('✅ Backup JSON descargado', 'success');
    }
    function celdaCSV(v){
        if(v === null || v === undefined) return '';
        let str = (typeof v === 'object') ? JSON.stringify(v) : String(v);
        if(str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) str = '"' + str.replace(/"/g, '""') + '"';
        return str;
    }
    async function exportarBackupCSV(){
        let data = await obtenerTodosLosDatos();
        let csvLines = ['\uFEFF# JAM POS - Exportación CSV', `# Generado: ${data.timestamp}`, ''];
        let stores = ['productos','clientes','proveedores','gastos','empleados','ventas','entregas'];
        stores.forEach(s => {
            if(data[s].length === 0) return;
            let headersSet = new Set();
            data[s].forEach(item => Object.keys(item).forEach(k => headersSet.add(k)));
            let headers = Array.from(headersSet);
            csvLines.push(`# === ${s.toUpperCase()} ===`);
            csvLines.push(headers.join(','));
            data[s].forEach(item => {
                csvLines.push(headers.map(h => celdaCSV(item[h])).join(','));
            });
            csvLines.push('');
        });
        let historialTasa = cargarHistorialTasa();
        if(historialTasa.length){
            csvLines.push('# === HISTORIALTASA ===');
            csvLines.push('fecha,hora,tasa');
            historialTasa.forEach(h => { csvLines.push(celdaCSV(h.fecha) + ',' + celdaCSV(h.hora) + ',' + celdaCSV(h.tasa)); });
            csvLines.push('');
        }
        if(data.tasaDiaria && data.tasaDiaria.length){
            csvLines.push('# === TASADIARIA ===');
            csvLines.push('fecha,hora,tasa,fijada');
            data.tasaDiaria.forEach(h => { csvLines.push(celdaCSV(h.fecha) + ',' + celdaCSV(h.hora || '') + ',' + celdaCSV(h.tasa) + ',' + celdaCSV(h.fijada ? 1 : 0)); });
            csvLines.push('');
        }
        const cajaExport = cargarCaja();
        if((cajaExport.cierres && cajaExport.cierres.length) || cajaExport.abierta || cajaExport.ultimoArqueo){
            csvLines.push('# === CAJA ===');
            csvLines.push('json');
            csvLines.push(celdaCSV(JSON.stringify(cajaExport)));
            csvLines.push('');
        }
        if (esAppNativa()) {
            asegurarCarpetaNativa(async () => {
                try {
                    const nombre = `jampos_export_${new Date().toISOString().slice(0,10)}.csv`;
                    const res = await puenteResultado(AndroidBridge.guardarArchivo(nombre, 'text/csv', utf8ToBase64(csvLines.join('\n'))));
                    if (res && res.startsWith('ok')) {
                        mostrarNotificacion('✅ CSV guardado en ' + (carpetaNativa ? carpetaNativa.nombre : 'carpeta') + '/JAMPOS/' + nombre, 'success');
                    } else {
                        mostrarNotificacion('❌ No se pudo exportar: ' + (res || 'error desconocido'), 'error');
                    }
                } catch (e) { mostrarNotificacion('❌ Error al exportar: ' + e.message, 'error'); }
            });
            return;
        }
        let blob = new Blob([csvLines.join('\n')], {type: 'text/csv;charset=utf-8;'});
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a'); a.href = url;
        a.download = `jampos_export_${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        mostrarNotificacion('✅ CSV exportado (ábralo con Excel)', 'success');
    }
    async function importarDesdeCarpeta(){
        if (!esAppNativa()) { alert('Esta opción solo está disponible en la app Android.'); return; }
        if (!(carpetaNativa && carpetaNativa.uri)) {
            carpetaAccionPendiente = importarDesdeCarpeta;
            mostrarNotificacion('Primero elija una carpeta de la que importar', 'info');
            try { AndroidBridge.elegirCarpeta(); } catch (e) { alert('No se pudo abrir el selector de carpeta'); }
            return;
        }
        let lista = [];
        try { lista = JSON.parse(await puenteResultado(AndroidBridge.listarArchivos()) || '[]'); } catch (e) { lista = []; }
        const jsonFiles = lista.filter(f => /\.json$/i.test(f));
        const csvFiles = lista.filter(f => /\.(csv|txt)$/i.test(f));
        if (jsonFiles.length === 0 && csvFiles.length === 0) {
            alert('No hay archivos de respaldo en la carpeta ' + (carpetaNativa ? carpetaNativa.nombre : 'JAMPOS') + '/JAMPOS');
            return;
        }
        let mensaje = 'Archivos disponibles:\n';
        if (jsonFiles.length) mensaje += '\n📦 JSON:\n' + jsonFiles.map(f => '  ' + f).join('\n');
        if (csvFiles.length) mensaje += '\n📊 CSV:\n' + csvFiles.map(f => '  ' + f).join('\n');
        mensaje += '\n\nEscriba el nombre exacto del archivo a importar:';
        const nombre = await jamPrompt(mensaje);
        if (!nombre) return;
        let contenido = null;
        try { contenido = await puenteResultado(AndroidBridge.leerArchivo(nombre)); } catch (e) {}
        if (!contenido || contenido === 'null') { alert('No se encontró el archivo: ' + nombre); return; }
        try {
            const texto = base64ToUtf8(contenido);
            const file = new File([texto], nombre, { type: /\.json$/i.test(nombre) ? 'application/json' : 'text/csv' });
            if (/\.json$/i.test(nombre)) importarBackupJSON(file);
            else importarBackupCSV(file);
        } catch (e) { alert('Error al leer el archivo: ' + e.message); }
    }
    function combinarImportacion(destino, nuevos, campoNombre = null){
        let existentes = Array.isArray(destino) ? destino.slice() : [];
        let porId = new Map(), porCodigo = new Map(), porNombre = new Map();
        const keyCod = c => c != null ? String(c).toLowerCase() : '';
        existentes.forEach((x, idx) => {
            if(!x) return;
            if(x.id) porId.set(x.id, idx);
            if(x.codigo) porCodigo.set(keyCod(x.codigo), true);
            if(campoNombre && !x.codigo && x[campoNombre]) porNombre.set(keyCod(x[campoNombre]), true);
        });
        let agregados = 0, actualizados = 0, omitidos = 0, nuevosItems = [];
        (nuevos || []).forEach(item => {
            if(!item) return;
            if(item.id && porId.has(item.id)){
                let existente = existentes[porId.get(item.id)];
                let tsNuevo = item.updatedAt || 0;
                let tsExistente = (existente && existente.updatedAt) || 0;
                if(tsNuevo > tsExistente){
                    existentes[porId.get(item.id)] = Object.assign({}, item);
                    actualizados++;
                }else{
                    omitidos++;
                }
                return;
            }
            let esNombre = campoNombre && !item.codigo && item[campoNombre];
            let duplicado = !!(item.codigo && porCodigo.has(keyCod(item.codigo)))
                || !!(esNombre && porNombre.has(keyCod(item[campoNombre])));
            if(duplicado){ omitidos++; return; }
            let nuevo = Object.assign({}, item);
            if(!nuevo.id) nuevo.id = 'imp' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            existentes.push(nuevo);
            nuevosItems.push(nuevo);
            porId.set(nuevo.id, existentes.length - 1);
            if(nuevo.codigo) porCodigo.set(keyCod(nuevo.codigo), true);
            if(esNombre) porNombre.set(keyCod(nuevo[campoNombre]), true);
            agregados++;
        });
        return { lista: existentes, nuevos: nuevosItems, agregados: agregados, actualizados: actualizados, omitidos: omitidos };
    }
    function importarBackupJSON(file){
        let reader = new FileReader();
        reader.onload = async function(e){
            try {
                let data = JSON.parse(e.target.result);
                if(!data || typeof data !== 'object') { alert('Archivo JSON no válido'); return; }
                let stores = ['productos','clientes','proveedores','gastos','empleados','ventas','entregas','tickets'];
                let resumen = stores.filter(s => data[s] && Array.isArray(data[s]) && data[s].length).map(s => `  • ${s}: ${data[s].length} registros`);
                if(resumen.length === 0) { alert('El archivo no contiene registros que integrar'); return; }
                let confirmacion = await jamConfirm(`¿INTEGRAR datos del archivo?\nSe agregarán los registros que no existan ya en el teléfono:\n${resumen.join('\n')}\n\n✅ Los datos actuales (ventas, artículos, gastos...) NO se borrarán.`);
                if(!confirmacion) return;
                let resumenFinal = [];
                for(let s of stores){
                    if(data[s] && Array.isArray(data[s]) && data[s].length){
                        let campoNombre = s === 'productos' ? 'nombre' : null;
                        let r = combinarImportacion(D[s], data[s], campoNombre);
                        D[s] = r.lista;
                        if (DATA_STORES.includes(s)) await saveToIDB(s, r.lista);
                        else localStorage.setItem(STORAGE_KEYS[s], JSON.stringify(r.lista));
                        resumenFinal.push(`${s}: +${r.agregados}${r.actualizados ? ' | ' + r.actualizados + ' actualizado(s)' : ''} | ${r.omitidos} duplicado(s) omitido(s)`);
                    }
                }
                if(data.historialTasa && Array.isArray(data.historialTasa)){
                    let nHist = importarHistorialTasaDesde(data.historialTasa);
                    if(nHist > 0) resumenFinal.push(`historial de tasa: +${nHist} día(s) con tasa`);
                }
                if(data.tasaDiaria && Array.isArray(data.tasaDiaria)){
                    let nTd = await importarTasaDiariaDesde(data.tasaDiaria);
                    if(nTd > 0) resumenFinal.push(`tasa diaria: +${nTd} día(s)`);
                }
                let aplicaConfig = false;
                if(data.config){
                    aplicaConfig = await jamConfirm('Los registros se integraron correctamente.\n\n¿Restaurar también la configuración del archivo (empresa, tasa del dólar, tema)?\nPulsa NO para conservar la configuración actual.\n\n💡 Tasa del dólar INTELIGENTE: si la del archivo es MÁS ANTIGUA que la vigente, se conserva la vigente y la del archivo pasa al historial (no se sobrepone).');
                }
                if(aplicaConfig){
                    const tasaInfo = aplicarConfigInteligente(data.config, data.timestamp);
                    if(tasaInfo) resumenFinal.push(tasaInfo);
                }
                if(data.caja && typeof data.caja === 'object'){
                    const cj = data.caja;
                    if((cj.cierres && cj.cierres.length) || cj.abierta || cj.ultimoArqueo){
                        guardarCaja(cj);
                        resumenFinal.push(`cierre de caja: historial de ${(cj.cierres || []).length} cierre(s) restaurado(s)`);
                    }
                }
                mostrarNotificacion('✅ Integración completada\n' + resumenFinal.join('\n'), 'success');
                if(currentModule === 'home') renderHome(); else renderConfig();
            } catch(err) { alert('Error al leer el archivo: ' + err.message); }
        };
        reader.readAsText(file);
    }
    const CAMPOS_NUMERICOS_CSV = new Set(['stock','cantidad','precioVentaBs','precioVentaUsd','costoRealBs','costoRealUsd','precioUnitario','costoUnitario','subtotal','ganancia','gananciaTotal','total','pago','cambio','monto','montoBs','adeudo','salario','salarioBs','dolarRate','iva','ivaPorcentaje','timestamp','tasa','lapsoDias']);
    function parsearValorCSV(campo, val){
        if(val === '' ) return '';
        let v = val.trim();
        if(v[0] === '[' || v[0] === '{'){
            try { return JSON.parse(v); } catch(e) { return val; }
        }
        if(CAMPOS_NUMERICOS_CSV.has(campo) && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
        if(v === 'true') return true;
        if(v === 'false') return false;
        return val;
    }
    function parsearBackupCSV(text){
        let data = { config: null, productos: [], clientes: [], proveedores: [], gastos: [], empleados: [], ventas: [], entregas: [], historialTasa: [], tasaDiaria: [], caja: [] };
        let storeMap = { 'PRODUCTOS':'productos','CLIENTES':'clientes','PROVEEDORES':'proveedores','GASTOS':'gastos','EMPLEADOS':'empleados','VENTAS':'ventas','ENTREGAS':'entregas','HISTORIALTASA':'historialTasa','TASADIARIA':'tasaDiaria','CAJA':'caja' };
        let currentStore = null, headers = null;
        for(let line of text.split('\n')){
            line = line.trim();
            if(line === '' || line.startsWith('# JAM POS') || line.startsWith('# Generado')) continue;
            let sectionMatch = line.match(/^# ===\s*(\w+)\s*===/);
            if(sectionMatch){
                currentStore = storeMap[sectionMatch[1]] || null;
                headers = null;
                continue;
            }
            if(!currentStore) continue;
            if(line.startsWith('#')) continue;
            if(!headers) { headers = line.split(',').map(h => h.trim()); continue; }
            let row = {};
            let values = parseCSVLine(line);
            headers.forEach((h, i) => {
                row[h] = parsearValorCSV(h, (values[i] !== undefined) ? values[i] : '');
            });
            data[currentStore].push(row);
        }
        return data;
    }
    function importarBackupCSV(file){
        let reader = new FileReader();
        reader.onload = async function(e){
            try {
                let text = e.target.result.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                let data = parsearBackupCSV(text);
                let stores = ['productos','clientes','proveedores','gastos','empleados','ventas','entregas'];
                let totalItems = stores.reduce((s,store) => s + data[store].length, 0);
                if(totalItems === 0) { alert('No se encontraron datos en el archivo CSV'); return; }
                let resumen = stores.filter(s=>data[s].length).map(s=>`  • ${s}: ${data[s].length} registros`);
                if(!(await jamConfirm(`¿INTEGRAR datos desde CSV?\nSe agregarán los registros que no existan ya:\n${resumen.join('\n')}\n\n✅ Los datos actuales del teléfono NO se borrarán.`))) return;
                let resumenFinal = [];
                for(let s of stores){
                    if(data[s].length) {
                        let campoNombre = s === 'productos' ? 'nombre' : null;
                        let r = combinarImportacion(D[s], data[s], campoNombre);
                        D[s] = r.lista;
                        if (DATA_STORES.includes(s)) await saveToIDB(s, r.lista);
                        else localStorage.setItem(STORAGE_KEYS[s], JSON.stringify(r.lista));
                        resumenFinal.push(`${s}: +${r.agregados}${r.actualizados ? ' | ' + r.actualizados + ' actualizado(s)' : ''} | ${r.omitidos} duplicado(s) omitido(s)`);
                    }
                }
                if(data.historialTasa && Array.isArray(data.historialTasa)){
                    let nHist = importarHistorialTasaDesde(data.historialTasa);
                    if(nHist > 0) resumenFinal.push(`historial de tasa: +${nHist} día(s) con tasa`);
                }
                if(data.tasaDiaria && Array.isArray(data.tasaDiaria)){
                    let nTd = await importarTasaDiariaDesde(data.tasaDiaria);
                    if(nTd > 0) resumenFinal.push(`tasa diaria: +${nTd} día(s)`);
                }
                if(data.caja && data.caja.length && data.caja[0] && data.caja[0].json && typeof data.caja[0].json === 'object'){
                    const cj = data.caja[0].json;
                    if((cj.cierres && cj.cierres.length) || cj.abierta || cj.ultimoArqueo){
                        guardarCaja(cj);
                        resumenFinal.push(`cierre de caja: historial de ${(cj.cierres || []).length} cierre(s) restaurado(s)`);
                    }
                }
                mostrarNotificacion('✅ Integración completada\n' + resumenFinal.join('\n'), 'success');
                if(currentModule === 'home') renderHome(); else renderConfig();
            } catch(err) { alert('Error al leer el archivo CSV: ' + err.message); }
        };
        reader.readAsText(file);
    }
    function parseCSVLine(str){
        let result = [], current = '', inQuotes = false;
        for(let i=0; i<str.length; i++){
            let c = str[i];
            if(inQuotes){
                if(c === '"' && str[i+1] === '"') { current += '"'; i++; }
                else if(c === '"') { inQuotes = false; }
                else { current += c; }
            } else {
                if(c === '"') { inQuotes = true; }
                else if(c === ',') { result.push(current); current = ''; }
                else { current += c; }
            }
        }
        result.push(current);
        return result;
    }
    
    // ==================== ALERTAS INTELIGENTES ====================
    function reproducirSonidoAlerta(){
        if(!D.config.sonidoAlertas) return;
        try {
            var elegido = D.config.sonidoNotif && D.config.sonidoNotif.audio;
            var usarInterno = D.config.usarSonidoInterno !== false;
            if (elegido) {
                if (D.__audioAlerta && D.__audioAlerta.src !== elegido) { try { D.__audioAlerta.pause(); } catch(e){} D.__audioAlerta = null; }
                if (!D.__audioAlerta) { D.__audioAlerta = new Audio(elegido); }
                D.__audioAlerta.volume = 1;
                var p1 = D.__audioAlerta.play(); if (p1 && p1.catch) p1.catch(function(){});
                return;
            }
            if (usarInterno) {
                var ruta = sonidoRuta('notificacion/2.mp3');
                if (D.__audioAlerta && D.__audioAlerta.src !== ruta) { try { D.__audioAlerta.pause(); } catch(e){} D.__audioAlerta = null; }
                if (!D.__audioAlerta) { D.__audioAlerta = new Audio(ruta); }
                D.__audioAlerta.volume = 1;
                var p2 = D.__audioAlerta.play(); if (p2 && p2.catch) p2.catch(function(){});
                return;
            }
            let ctx = new (window.AudioContext || window.webkitAudioContext)();
            let osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 800;
            let gain = ctx.createGain(); gain.gain.value = 0.3;
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 200);
        } catch(e) { /* fallo silencioso */ }
    }
    function sonidoRuta(rel){
        var nat = typeof window.AndroidBridge !== 'undefined' && !!window.AndroidBridge;
        return nat ? 'file:///android_asset/www/' + rel : rel;
    }
    function abrirSelectorSonido(){
        var modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);font-family:sans-serif;';
        var nombreActual = (D.config.sonidoNotif && D.config.sonidoNotif.nombre) || '2.mp3';
        var usaInterno = D.config.usarSonidoInterno !== false;
        var caja = document.createElement('div');
        caja.style.maxWidth = '420px';
        caja.style.width = '92%';
        caja.style.background = (D.config.backgroundMode === 'dark' ? '#1e293b' : '#fff');
        caja.style.color = (D.config.backgroundMode === 'dark' ? '#e2e8f0' : '#0f172a');
        caja.style.borderRadius = '18px';
        caja.style.padding = '20px';
        caja.style.boxShadow = '0 20px 60px rgba(0,0,0,.35)';
        caja.innerHTML =
            '<h3 style="margin:0 0 4px;font-size:17px;font-weight:800"><i class="fas fa-music"></i> Sonido de notificaciones</h3>' +
            '<p style="margin:0 0 14px;font-size:12px;opacity:.65">Se usa en alertas de stock, tasa USD y promociones.</p>' +
            '<div id="selSonidoInterno" style="display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgba(128,128,128,.35);border-radius:12px;padding:10px 12px;margin-bottom:8px;cursor:pointer">' +
            '<div><div style="font-weight:700;font-size:13px"><i class="fas fa-volume-high"></i> Sonido interno (' + nombreActual + ')</div><div style="font-size:11px;opacity:.6">Por defecto del app</div></div>' +
            '<span id="iconSelInt" style="font-size:18px">' + (usaInterno && !D.config.sonidoNotif.audio ? '&#10003;' : '&#10003;') + '</span></div>' +
            '<label for="audioArchivoInput" style="display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgba(128,128,128,.35);border-radius:12px;padding:10px 12px;margin-bottom:14px;cursor:pointer;background:rgba(59,130,246,.12)">' +
            '<div><div style="font-weight:700;font-size:13px"><i class="fas fa-folder-open"></i> Elegir del sistema</div><div style="font-size:11px;opacity:.6">MP3 · WAV · OGG · M4A (Android / Windows / Linux...)</div></div>' +
            '<span style="font-size:18px">&#11014;</span></label>' +
            '<input type="file" id="audioArchivoInput" accept="audio/*,.mp3,.wav,.ogg,.m4a" style="display:none">' +
            '<span id="selSonidoPrueba" style="background:#3b82f6;color:#fff;border:none;border-radius:10px;padding:9px 12px;font-size:13px;font-weight:700;margin-bottom:10px;display:inline-block;cursor:pointer"><i class="fas fa-play"></i> Probar sonido</span>' +
            '<span id="selSonidoLimpiar" style="background:rgba(239,68,68,.15);color:#ef4444;border:none;border-radius:10px;padding:9px 12px;font-size:13px;font-weight:700;margin-bottom:10px;display:inline-block;cursor:pointer"><i class="fas fa-rotate-left"></i> Restaurar 2.mp3</span>' +
            '<div style="display:flex;gap:8px;margin-top:6px">' +
            '<span id="selSonidoGuardar" style="flex:1;background:#10b981;color:#fff;border:none;border-radius:12px;padding:11px;font-size:14px;font-weight:800;text-align:center;cursor:pointer"><i class="fas fa-check"></i> Aplicar</span>' +
            '<span id="selSonidoCancelar" style="flex:1;background:rgba(128,128,128,.18);color:inherit;border:none;border-radius:12px;padding:11px;font-size:14px;font-weight:700;text-align:center;cursor:pointer">Cancelar</span>' +
            '</div>';
        modal.appendChild(caja);
        document.documentElement.appendChild(modal);
        var pendiente = null;
        (function(){
            var iv = document.getElementById('selSonidoInterno');
            var ic = document.getElementById('iconSelInt');
            var input = document.getElementById('audioArchivoInput');
            var prueba = document.getElementById('selSonidoPrueba');
            var limpiar = document.getElementById('selSonidoLimpiar');
            var guardar = document.getElementById('selSonidoGuardar');
            var cancelar = document.getElementById('selSonidoCancelar');
            if (iv) iv.onclick = function(){ pendiente = null; ic.innerHTML = '&#10003;'; };
            if (input) input.onchange = function(){
                var f = input.files && input.files[0];
                if (!f) return;
                var lector = new FileReader();
                lector.onload = function(){ pendiente = { nombre: f.name, audio: lector.result }; ic.innerHTML = '&#10003;'; };
                lector.readAsDataURL(f);
            };
            if (prueba) prueba.onclick = function(){
                var src = pendiente ? pendiente.audio : sonidoRuta('notificacion/2.mp3');
                try { var t = new Audio(src); t.volume = 1; var p = t.play(); if (p && p.catch) p.catch(function(){}); } catch(e){}
            };
            if (limpiar) limpiar.onclick = function(){ pendiente = { nombre: '2.mp3', audio: null }; ic.innerHTML = '&#10003;'; };
            if (guardar) guardar.onclick = async function(){
                if (pendiente === null) {
                    if (!D.config.sonidoNotif) D.config.sonidoNotif = {};
                    D.config.sonidoNotif.nombre = nombreActual;
                    D.config.usarSonidoInterno = true;
                    await saveConfig(); await notificarPrefServicio('usarSonidoInterno', true);
                } else {
                    if (!D.config.sonidoNotif) D.config.sonidoNotif = {};
                    D.config.sonidoNotif.nombre = pendiente.nombre;
                    D.config.sonidoNotif.audio = pendiente.audio;
                    D.config.usarSonidoInterno = pendiente.audio ? false : true;
                    await saveConfig(); await notificarPrefServicio('usarSonidoInterno', !!pendiente.audio);
                }
                try { modal.parentNode.removeChild(modal); } catch(e){}
                mostrarNotificacion('Sonido de notificaciones actualizado', 'success');
            };
            if (cancelar) cancelar.onclick = function(){ try { modal.parentNode.removeChild(modal); } catch(e){} };
        })();
    }
    function verificarStockBajo(){
        if(!D.config.alertaStockBajo) return;
        if(D.config.silenciarNotif) return;
        const minStock = (D.config.stockMinimo > 0) ? D.config.stockMinimo : 5;
        let bajos = D.productos.filter(p => p.stock < minStock);
        if(bajos.length > 0){
            let nombres = bajos.slice(0,3).map(p => `${escapeHtml(p.nombre)} (${p.stock})`).join(', ');
            let msj = `⚠️ ${bajos.length} producto(s) con stock bajo: ${nombres}${bajos.length > 3 ? ` y ${bajos.length-3} más` : ''}`;
            mostrarNotificacion(msj, 'error');
            mostrarNotificacionNativa('Stock bajo', `${bajos.length} producto(s) con stock bajo`, 'stock-bajo');
            if(D.config.sonidoAlertas) reproducirSonidoAlerta();
        }
    }
    function notificarTasaActualizada(tasaAnterior, tasaNueva){
        if(!D.config.alertaTasa) return;
        if(D.config.silenciarNotif) return;
        let diff = Math.abs(tasaNueva - tasaAnterior);
        if(diff > 0.5){
            mostrarNotificacion(`💱 La tasa USD cambió: ${fmtDolar(tasaAnterior)} → ${fmtDolar(tasaNueva)} Bs`, 'info');
            mostrarNotificacionNativa('Tasa USD actualizada', `${fmtDolar(tasaAnterior)} → ${fmtDolar(tasaNueva)} Bs · JAM POS v1.1 By @felinuxs`, 'tasa');
            if(D.config.sonidoAlertas) reproducirSonidoAlerta();
        }
    }

    
    // ==================== CONFIGURACIÓN ====================
    async function renderConfig(){
        let colores = ['#ef4444','#f97316','#f59e0b','#10b981','#22c55e','#3b82f6','#00ced1','#8b5cf6','#a855f7','#ec4899','#ff69b4','#000000'];
        let bloqueado = volverBloqueado, accent = D.config.theme;
        const filaOpcion = (icono, nombre, desc, id, checked) => `
            <div class="opcion-fila">
                <span class="opcion-izq"><span class="opcion-icono">${icono}</span><span class="opcion-nombre">${nombre}${desc ? `<span class="opcion-desc">${desc}</span>` : ''}</span></span>
                <label class="switch"><input type="checkbox" id="${id}" ${checked?'checked':''}><span class="slider"></span></label>
            </div>`;
        let html = `
            <div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Configuración')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Configuración</h2><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div>
            <div class="page-container">
                <div class="config-section"><button id="btnToggleEmpresa" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2"><i class="fas fa-building"></i> Datos de la Empresa</button><div id="panelEmpresa" style="display:none;" class="mt-2 config-inner"><div class="mb-2"><label>Nombre de la tienda</label><input type="text" id="empresaNombre" value="${escapeHtml(D.config.empresa.nombre)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>Dirección</label><input type="text" id="empresaDireccion" value="${escapeHtml(D.config.empresa.direccion)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>Teléfono</label><input type="text" id="empresaTelefono" value="${escapeHtml(D.config.empresa.telefono)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>RIF</label><input type="text" id="empresaRif" value="${escapeHtml(D.config.empresa.rif)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>Logo (URL, emoji o imagen)</label><input type="text" id="empresaLogo" value="${escapeHtml(D.config.empresa.logo)}" placeholder="URL de imagen o emoji" class="border rounded-xl p-2 w-full"><button id="btnLogoDispositivo" type="button" class="btn-redondeado w-full mt-2 py-2" style="background:#0ea5e9;color:#fff"><i class="fas fa-folder-open"></i> Elegir imagen del dispositivo (PNG · JPG · GIF · WEBP)</button><input type="file" id="logoArchivoInput" accept="image/png,image/jpeg,image/gif,image/webp" style="display:none"></div><button id="guardarEmpresa" class="btn-azul-redondeado btn-redondeado w-full mt-2 py-2"><i class="fas fa-floppy-disk"></i> Guardar datos empresa</button></div></div>
                <div class="config-section"><button id="btnToggleTasa" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2"><i class="fas fa-sack-dollar"></i> Tasa de Cambio (${fuenteRegidoraClave() === 'ALCB-USDT' ? 'USDT/BS' : 'USD/BS'})</button><div id="panelTasa" style="display:none;" class="mt-2 config-inner">
                    <div class="mb-3">
                        <div class="panel-tasa p-3 rounded-lg mb-3">
                            <div class="flex justify-between items-center">
                                <span class="font-semibold">API activa:</span>
                                <span id="fuenteTasaActiva" class="text-xs font-mono">${nombreFuenteTasa(D.config.fuenteTasa)}</span>
                            </div>
                            <div class="mt-2">
                                <div class="text-xs font-semibold opacity-70 mb-1">Cambiar fuente de referencia (toca la deseada):</div>
                                <div class="flex flex-col gap-1.5">
                                    <button data-fuente="BCV" class="fuente-opcion ${(D.config.fuenteTasa || 'BCV')==='BCV' ? 'fuente-opcion-activa' : ''}"><span class="fuente-titulo"><span><img class="fuente-logo" src="iconos/bcv-mini.png" alt=""> Tasa BCV</span><span class="fuente-vivo" id="tvBCV">${tasaVivaNumero('BCV')}</span></span><span class="text-xs opacity-60">(oficial · por defecto)</span></button>
                                    <button data-fuente="ALCB-BCV" class="fuente-opcion ${(D.config.fuenteTasa || 'BCV')==='ALCB-BCV' ? 'fuente-opcion-activa' : ''}"><span class="fuente-titulo"><span><img class="fuente-logo" src="iconos/alcambio-mini.png" alt=""> Tasa Al Cambio BCV</span><span class="fuente-vivo" id="tvALCB-BCV">${tasaVivaNumero('ALCB-BCV')}</span></span><span class="text-xs opacity-60">(BCV vía API Al Cambio)</span></button>
                                    <button data-fuente="ALCB-USDT" class="fuente-opcion ${(D.config.fuenteTasa || 'BCV')==='ALCB-USDT' ? 'fuente-opcion-activa' : ''}"><span class="fuente-titulo"><span><img class="fuente-logo" src="iconos/usdt-mini.png" alt=""> Tasa Al Cambio USDT</span><span class="fuente-vivo" id="tvALCB-USDT">${tasaVivaNumero('ALCB-USDT')}</span></span><span class="text-xs opacity-60">(USDT vía API Al Cambio)</span></button>
                                </div>
                            </div>
                            <div class="flex justify-between items-center mt-2">
                                <span>Tasa actual:</span>
                                <span id="tasaActualDisplay" class="font-mono text-xl font-bold" style="color:${accent}">${D.config.dolarRate > 0 ? fmtDolar(D.config.dolarRate) : '—'}</span>
                                <span id="tasaMonedaEtiqueta">${D.config.dolarRate > 0 ? (fuenteRegidoraClave() === 'ALCB-USDT' ? 'Bs/USDT' : 'Bs/USD') : ''}</span>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">Actualizado: ${D.config.lastUpdate}</div>
                            ${D.config.tasaManual ? `<div class="text-xs mt-1 p-2 rounded" style="background:rgba(239,68,68,.1);color:#ef4444;font-weight:600"><i class="fas fa-triangle-exclamation"></i> Modo manual activo. Verifique siempre el valor actual en el BCV antes de fijar un precio.</div>` : `<div class="text-xs mt-1 p-2 rounded" style="background:rgba(16,185,129,.1);color:#10b981;font-weight:600"><i class="fas fa-circle-check"></i> Modo automático — la tasa se actualiza sola al abrir la app.</div>`}
                        </div>
                        <div class="flex flex-col gap-3">
                            ${filaOpcion('<i class="fas fa-lock"></i>','Usar tasa manual', 'Fija, sin internet', 'modoManualCheck', D.config.tasaManual)}
                            <div id="tasaManualDiv" style="${D.config.tasaManual ? 'display:flex' : 'display:none'}" class="flex gap-2 items-center">
                                <input type="number" id="tasaManualInput" step="0.01" value="${D.config.tasaManualValue > 0 ? D.config.tasaManualValue : ''}" placeholder="Ej: 800.00" class="border rounded-xl p-2 flex-1">
                                <button id="guardarTasaManualBtn" class="btn-azul-redondeado btn-redondeado py-2 px-4">Fijar</button>
                            </div>
                            <button id="actualizarTasaInternetBtn" class="btn-redondeado py-2 px-4" style="background:#3b82f6; color:white;">
                                <i class="fas fa-globe"></i> Actualizar tasa desde Internet
                            </button>
                            <button id="fijarTasaDiaBtn" class="btn-redondeado py-2 px-4" style="background:#10b981; color:white;">
                                <i class="fas fa-lock"></i> Fijar tasa del día (inmutable en el calendario)
                            </button>
                            <div class="text-xs text-gray-500 mt-2">
                                <i class="fas fa-circle-info"></i> La API se actualiza automáticamente. ${!D.config.tasaManual ? '<i class="fas fa-circle-check"></i> Modo AUTOMÁTICO activado' : '<i class="fas fa-lock"></i> Modo MANUAL activado'}
                            </div>
                        </div>
                    </div>
                </div></div>
                <div class="config-section"><button id="btnToggleOpciones" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2"><i class="fas fa-gear"></i> Opciones generales</button><div id="panelOpciones" style="display:none;" class="mt-2 config-inner">
                    <div class="grupo-opciones">
                        <div class="grupo-opciones-titulo"><i class="fas fa-credit-card"></i> Facturación</div>
                        ${filaOpcion('<i class="fas fa-chart-column"></i>','IVA', 'Aplicar ' + D.config.ivaPorcentaje + '% sobre el subtotal de cada venta', 'toggleIVA', D.config.ivaActivo)}
                        ${filaOpcion('<i class="fas fa-sack-dollar"></i>','Mostrar dólar', 'Mostrar la tasa USD en la pantalla principal', 'toggleMostrarDolar', D.config.mostrarDolar)}
                        ${filaOpcion('<i class="fas fa-lock"></i>','Prevenir cierre', 'Confirmar antes de salir de un módulo', 'togglePrevenirCierre', D.config.prevenirCierre)}
                    </div>
                    <div class="grupo-opciones">
                        <div class="grupo-opciones-titulo"><i class="fas fa-moon"></i> Apariencia</div>
                        ${filaOpcion('<i class="fas fa-circle-half-stroke"></i>','Modo oscuro automático', 'Se sincroniza con el modo del sistema', 'toggleAutoOscuro', D.config.autoOscuro)}
                        ${filaOpcion('<i class="fas fa-moon"></i>','Fondo oscuro', 'Activar el tema oscuro manualmente', 'toggleFondoOscuro', D.config.backgroundMode==='dark')}
                        ${filaOpcion('<i class="fas fa-circle-question"></i>','Guía en cabeceras', 'Mostrar el icono de guía interactiva en las cabeceras de los módulos', 'toggleGuiaCabecera', D.config.mostrarGuiaCabecera !== false)}
                    </div>
                    <div class="grupo-opciones">
                        <div class="grupo-opciones-titulo"><i class="fas fa-bell"></i> Alertas inteligentes</div>
                        ${filaOpcion('<i class="fas fa-boxes-stacked"></i>','Stock bajo', 'Notificar cuando hay productos con stock bajo', 'toggleAlertaStock', D.config.alertaStockBajo)}
                        ${filaOpcion('<i class="fas fa-money-bill-transfer"></i>','Cambio de tasa USD', 'Notificar cuando cambia la tasa del dólar', 'toggleAlertaTasa', D.config.alertaTasa)}
                        ${filaOpcion('<i class="fas fa-volume-high"></i>','Sonido', 'Reproducir sonido cuando se emite una alerta', 'toggleSonidoAlertas', D.config.sonidoAlertas)}
                        <div class="opcion-fila">
                            <span class="opcion-izq"><span class="opcion-icono"><i class="fas fa-music"></i></span><span class="opcion-nombre">Elegir sonido<span class="opcion-desc">Sonido de las notificaciones (tasa, promociones y alertas). Toca para escoger del sistema.</span></span></span>
                            <button id="btnElegirSonido" type="button" class="btn-redondeado py-1 px-3 text-xs" style="background:${accent};color:#fff"><i class="fas fa-upload"></i> Elegir</button>
                        </div>
                        ${filaOpcion('<i class="fas fa-volume-xmark"></i>','Silenciar notificaciones', 'No mostrar el aviso ni sonar cuando cambia una tasa', 'toggleSilenciarNotif', D.config.silenciarNotif)}
                    </div>
                    <div class="mb-2"><label class="text-xs opacity-70">Umbral de stock mínimo</label><input type="number" id="stockMinimoInput" min="0" value="${D.config.stockMinimo > 0 ? D.config.stockMinimo : 5}" class="border rounded-xl p-2 w-full"></div>
                    <p class="text-xs text-center mt-3 opacity-60">Las alertas aparecen como notificaciones al iniciar y al realizar acciones clave</p>
                </div></div>
                <div class="config-section"><button id="btnToggleSeguridad" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2"><i class="fas fa-lock"></i> Seguridad (PIN)</button><div id="panelSeguridad" style="display:none;" class="mt-2 config-inner"><div class="mb-2"><label>PIN de acceso (4 dígitos, dejar vacío para deshabilitar)</label><input type="password" id="pinInput" value="${escapeHtml(D.config.pin)}" maxlength="4" pattern="[0-9]*" inputmode="numeric" class="border rounded-xl p-2 w-full text-center text-2xl tracking-widest" placeholder="****"></div><button id="guardarPinBtn" class="btn-azul-redondeado btn-redondeado w-full py-2"><i class="fas fa-lock"></i> Guardar PIN</button><p class="text-xs text-center mt-2 opacity-60">${D.config.pin ? '<i class="fas fa-circle-check"></i> PIN activo. Se pedirá al abrir la app.' : '<i class="fas fa-circle-info"></i> Sin PIN. Cualquiera puede acceder.'}</p></div></div>
                <div class="config-section"><button id="btnToggleColores" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2"><i class="fas fa-palette"></i> Temas de color</button><div id="panelColores" style="display:none;" class="mt-2 config-inner"><div class="flex flex-wrap justify-center gap-2" id="paletaColores" style="max-width:290px;margin:0 auto"></div></div></div>
                <div class="config-section"><button id="btnToggleSync" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2"><i class="fas fa-rotate"></i> Sincronización entre dispositivos</button><div id="panelSync" style="display:none;" class="mt-2 config-inner"><div class="text-xs opacity-70 mb-2">Conecta este equipo con otros (PC o teléfono) y comparte productos, clientes, ventas, proveedores, gastos, empleados, tasa y tickets, sin necesidad de servidores. Mientras dos equipos estén encendidos con Internet, los datos se copian solos.</div><button id="abrirSyncBtn" class="btn-redondeado py-2 px-4 w-full" style="background:#3b82f6;color:#fff"><i class="fas fa-link"></i> Abrir Sincronización</button><p class="text-xs text-center mt-2 opacity-60">Crea un círculo o únete escaneando el QR (o escribiendo ID + código)</p></div></div>
                <div class="config-section"><button id="btnToggleBackup" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2"><i class="fas fa-floppy-disk"></i> Copia de seguridad</button><div id="panelBackup" style="display:none;" class="mt-2 config-inner"><div class="flex flex-col gap-3">${esAppNativa() ? `<div class="rounded-xl p-3" style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.3)"><p class="text-sm font-semibold mb-1"><i class="fas fa-folder"></i> Carpeta de la aplicación</p><p id="carpetaEstado" class="text-xs opacity-70 mb-2"><i class="fas fa-circle-info"></i> Elija una carpeta para guardar tickets y respaldos (se creará la subcarpeta JAMPOS).</p><button id="elegirCarpetaBtn" class="btn-redondeado py-2 px-4 w-full" style="background:#0ea5e9;color:#fff"><i class="fas fa-folder-open"></i> Elegir carpeta</button></div>` : `<p class="text-xs text-center opacity-60"><i class="fas fa-lightbulb"></i> En la app Android podrás elegir una carpeta donde guardar los archivos.</p>`}<button id="exportJsonBtn" class="btn-redondeado py-2 px-4" style="background:#3b82f6;color:#fff"><i class="fas fa-download"></i> Exportar todo (JSON)</button><button id="exportCsvBtn" class="btn-redondeado py-2 px-4" style="background:#10b981;color:#fff"><i class="fas fa-download"></i> Exportar todo (CSV / Excel)</button><button id="importJsonBtn" class="btn-redondeado py-2 px-4" style="background:#8b5cf6;color:#fff"><i class="fas fa-upload"></i> Importar desde JSON</button><button id="importCsvBtn" class="btn-redondeado py-2 px-4" style="background:#f59e0b;color:#fff"><i class="fas fa-upload"></i> Importar desde CSV / Excel</button>${esAppNativa() ? `<button id="importCarpetaBtn" class="btn-redondeado py-2 px-4" style="background:#14b8a6;color:#fff"><i class="fas fa-folder-open"></i> Importar desde la carpeta JAMPOS</button><button id="restaurarBackupBtn" class="btn-redondeado py-2 px-4" style="background:#ef4444;color:#fff"><i class="fas fa-rotate"></i> Restaurar desde respaldo automático</button>` : ''}<input type="file" id="importFileInput" accept=".json" style="display:none"><input type="file" id="importCsvFileInput" accept=".csv,.xlsx,.xls,.txt" style="display:none"><p class="text-xs text-center mt-2 opacity-60">Los archivos CSV se abren directamente en Excel</p></div></div></div>
            <div class="text-center text-xs mt-4 opacity-60">By @felinuxs</div>
            </div>
        `;
        document.getElementById('appRoot').innerHTML = html;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        
        const toggle = (btnId, panelId) => { document.getElementById(btnId).onclick = () => { let p = document.getElementById(panelId); p.style.display = p.style.display === 'none' ? 'block' : 'none'; }; };
        toggle('btnToggleEmpresa', 'panelEmpresa');
        toggle('btnToggleTasa', 'panelTasa');
        toggle('btnToggleOpciones', 'panelOpciones');
        toggle('btnToggleSeguridad', 'panelSeguridad');
        toggle('btnToggleColores', 'panelColores');
        toggle('btnToggleBackup', 'panelBackup');
        toggle('btnToggleSync', 'panelSync');
        document.getElementById('abrirSyncBtn').onclick = () => { if(window.renderSync) navigateTo('sync'); };
        
        const modoManualCheck = document.getElementById('modoManualCheck');
        const tasaManualDiv = document.getElementById('tasaManualDiv');
        const tasaManualInput = document.getElementById('tasaManualInput');
        const guardarTasaManualBtn = document.getElementById('guardarTasaManualBtn');
        const actualizarInternetBtn = document.getElementById('actualizarTasaInternetBtn');
        
        document.getElementById('fijarTasaDiaBtn').onclick = async () => {
            const ok = await fijarTasaDia(hoyISO());
            if(ok){
                D.tasaDiaria = await cargarTasaDiaria();
                refrescarCacheTasaDiaria();
                mostrarNotificacion('🔒 Tasa del día fijada. Quedará inmutable en el calendario.', 'success');
            } else {
                mostrarNotificacion('ℹ️ La tasa del día ya estaba fijada', 'info');
            }
        };
        
        modoManualCheck.addEventListener('change', async (e) => {
            D.config.tasaManual = e.target.checked;
            if (e.target.checked) {
                D.config.dolarRate = D.config.tasaManualValue;
                D.config.lastUpdate = new Date().toLocaleDateString() + " (Manual)";
                registrarCambioTasa(D.config.dolarRate);
                tasaManualDiv.style.display = 'flex';
            } else {
                tasaManualDiv.style.display = 'none';
                D.config.lastUpdate = "Pendiente de actualización automática";
            }
            saveConfig();
            document.getElementById('tasaActualDisplay').innerText = fmtDolar(D.config.dolarRate);
            actualizarInfoCard();
            await recalcularPreciosPorTasa();
        });

        // Selector de fuente de tasa (BCV / Al Cambio BCV / Al Cambio USDT).
        // Al tocar una fuente se guarda, se refresca la tasa con esa fuente y
        // se actualiza todo lo que depende de la tasa (home + operaciones).
        document.querySelectorAll('.fuente-opcion').forEach(btn => {
            btn.addEventListener('click', async () => {
                const fuente = btn.getAttribute('data-fuente');
                if (!fuente || fuente === (D.config.fuenteTasa || 'BCV')) return;
                D.config.fuenteTasa = fuente;
                // Al cambiar de fuente se deja de usar tasa manual (usa la API elegida)
                D.config.tasaManual = false;
                const tasaManualDiv = document.getElementById('tasaManualDiv');
                if (tasaManualDiv) tasaManualDiv.style.display = 'none';
                const modoCheck = document.getElementById('modoManualCheck'); if (modoCheck) modoCheck.checked = false;
                const etiqueta = document.getElementById('fuenteTasaActiva'); if (etiqueta) etiqueta.innerText = nombreFuenteTasa(fuente);
                document.querySelectorAll('.fuente-opcion').forEach(o => o.classList.toggle('fuente-opcion-activa', o === btn));
                mostrarNotificacion('Cambiando fuente a: ' + nombreFuenteTasa(fuente) + '...', 'info');
                saveConfig();
                // Avisar al nativo para que la barra de fondo rote a las otras dos.
                if (window.AndroidBridge && typeof AndroidBridge.guardarFuenteTasa === 'function') {
                    try { AndroidBridge.guardarFuenteTasa(fuente); } catch(e) {}
                }
                await actualizarTasa(true);
                const tasaActualDisplay = document.getElementById('tasaActualDisplay');
                if (tasaActualDisplay) tasaActualDisplay.innerText = fmtDolar(D.config.dolarRate);
                const tasaMonedaEtiqueta = document.getElementById('tasaMonedaEtiqueta');
                if (tasaMonedaEtiqueta) tasaMonedaEtiqueta.innerText = (fuente === 'ALCB-USDT') ? 'Bs/USDT' : 'Bs/USD';
                actualizarInfoCard();
                await recalcularPreciosPorTasa();
                actualizarDisplayTasa();
            });
        });
        
        document.getElementById('guardarPinBtn').onclick = () => {
            let pin = document.getElementById('pinInput').value.replace(/\D/g, '').slice(0, 4);
            document.getElementById('pinInput').value = pin;
            D.config.pin = pin;
            saveConfig();
            renderConfig();
            mostrarNotificacion(pin ? '🔒 PIN guardado. Se pedirá al abrir la app.' : '🔓 PIN eliminado. Acceso sin restricciones.', 'success');
        };

        guardarTasaManualBtn.onclick = async () => {
            const nuevoValor = parseFloat(tasaManualInput.value);
            if (!isNaN(nuevoValor) && nuevoValor > 0) {
                D.config.tasaManualValue = nuevoValor;
                if (D.config.tasaManual) {
                    D.config.dolarRate = nuevoValor;
                    D.config.lastUpdate = new Date().toLocaleDateString() + " (Manual)";
                    registrarCambioTasa(nuevoValor);
                }
                saveConfig();
                document.getElementById('tasaActualDisplay').innerText = fmtDolar(D.config.dolarRate);
                actualizarInfoCard();
                await recalcularPreciosPorTasa();
                mostrarNotificacion(`Tasa manual establecida en ${fmtDolar(nuevoValor)} Bs/USD`, 'success');
            } else {
                alert("Ingrese un valor numérico válido (mayor a 0)");
            }
        };
        
        actualizarInternetBtn.onclick = async () => {
            const wasManual = D.config.tasaManual;
            if (wasManual) D.config.tasaManual = false;
            mostrarNotificacion("Actualizando tasa desde internet...", 'info');
            await actualizarTasa(true);
            if (wasManual) {
                const mantenerManual = await jamConfirm("Se ha obtenido una tasa actualizada desde internet. ¿Desea seguir usando tasa MANUAL?");
                if (mantenerManual) {
                    D.config.tasaManual = true;
                    const usarNueva = await jamConfirm(`La tasa obtenida es ${fmtDolar(D.config.dolarRate)}. ¿Desea actualizar la tasa manual a este valor?`);
                    if (usarNueva) {
                        D.config.tasaManualValue = D.config.dolarRate;
                    }
                } else {
                    D.config.tasaManual = false;
                }
                saveConfig();
            }
            renderConfig();
        };
        
        document.getElementById('guardarEmpresa').onclick = async () => { 
            D.config.empresa = { 
                nombre: document.getElementById('empresaNombre').value, 
                direccion: document.getElementById('empresaDireccion').value, 
                telefono: document.getElementById('empresaTelefono').value, 
                rif: document.getElementById('empresaRif').value, 
                logo: document.getElementById('empresaLogo').value 
            }; 
            await saveConfig(); 
            mostrarNotificacion('✓ Datos de empresa guardados', 'success');
            document.getElementById('panelEmpresa').style.display = 'none'; 
        };
        
        const btnLogoDispositivo = document.getElementById('btnLogoDispositivo');
        const logoArchivoInput = document.getElementById('logoArchivoInput');
        if (btnLogoDispositivo && logoArchivoInput) {
            btnLogoDispositivo.onclick = () => logoArchivoInput.click();
            logoArchivoInput.onchange = (e) => {
                const f = e.target.files && e.target.files[0];
                if (!f) return;
                const ext = (f.name.split('.').pop() || '').toLowerCase();
                if (['png','jpg','jpeg','gif','webp'].indexOf(ext) === -1) { mostrarNotificacion('Formato no soportado: usa PNG, JPG, GIF o WEBP.', 'error'); return; }
                const lector = new FileReader();
                lector.onload = () => {
                    abrirRecortadorLogo(lector.result, (dataUrl) => {
                        document.getElementById('empresaLogo').value = dataUrl;
                        mostrarNotificacion('✓ Logo recortado. Pulsa Guardar datos empresa.', 'success');
                    });
                };
                lector.readAsDataURL(f);
                logoArchivoInput.value = '';
            };
        }
        
        let paleta = document.getElementById('paletaColores');
        colores.forEach(c => { let circle = document.createElement('div'); circle.className = 'color-circle'; circle.style.backgroundColor = c; circle.onclick = async () => { D.config.theme = c; await saveConfig(); renderConfig(); }; paleta.appendChild(circle); });
        
        document.getElementById('toggleIVA').onchange = async e => { D.config.ivaActivo = e.target.checked; await saveConfig(); };
        document.getElementById('togglePrevenirCierre').onchange = async e => { D.config.prevenirCierre = e.target.checked; await saveConfig(); };
        document.getElementById('toggleMostrarDolar').onchange = async e => { D.config.mostrarDolar = e.target.checked; await saveConfig(); actualizarInfoCard(); };
        document.getElementById('toggleAutoOscuro').onchange = async e => { 
            D.config.autoOscuro = e.target.checked; 
            if(D.config.autoOscuro) aplicarModoSistema();
            await saveConfig();
            document.getElementById('toggleFondoOscuro').checked = D.config.backgroundMode === 'dark';
        };
        document.getElementById('toggleFondoOscuro').onchange = async e => {
            D.config.autoOscuro = false;
            D.config.backgroundMode = e.target.checked ? 'dark' : 'light';
            document.getElementById('toggleAutoOscuro').checked = false;
            await saveConfig();
        };
        document.getElementById('toggleAlertaStock').onchange = async e => { D.config.alertaStockBajo = e.target.checked; await saveConfig(); };
        document.getElementById('toggleAlertaTasa').onchange = async e => { D.config.alertaTasa = e.target.checked; await saveConfig(); };
                        document.getElementById('toggleSonidoAlertas').onchange = async e => { D.config.sonidoAlertas = e.target.checked; await saveConfig(); };
                        document.getElementById('btnElegirSonido').onclick = () => { abrirSelectorSonido(); };
                        document.getElementById('toggleSilenciarNotif').onchange = async e => { D.config.silenciarNotif = e.target.checked; await saveConfig(); await notificarPrefServicio('silenciarNotif', e.target.checked); };
                        document.getElementById('toggleGuiaCabecera').onchange = async e => { D.config.mostrarGuiaCabecera = e.target.checked; await saveConfig(); };
        const stockMinInp = document.getElementById('stockMinimoInput');
        if(stockMinInp){
            const aplicarStockMin = (v) => { const n = parseInt(v, 10); D.config.stockMinimo = isFinite(n) && n >= 0 ? n : 5; saveConfig(); verificarStockBajo(); };
            stockMinInp.addEventListener('change', () => aplicarStockMin(stockMinInp.value));
            stockMinInp.addEventListener('blur', () => aplicarStockMin(stockMinInp.value));
        }
        document.getElementById('exportJsonBtn').onclick = async () => await exportarBackupJSON();
        document.getElementById('exportCsvBtn').onclick = async () => await exportarBackupCSV();
        document.getElementById('importJsonBtn').onclick = () => document.getElementById('importFileInput').click();
        document.getElementById('importFileInput').onchange = e => { if(e.target.files[0]) importarBackupJSON(e.target.files[0]); };
        document.getElementById('importCsvBtn').onclick = () => document.getElementById('importCsvFileInput').click();
        document.getElementById('importCsvFileInput').onchange = e => { if(e.target.files[0]) importarBackupCSV(e.target.files[0]); };
        const elegirCarpetaBtn = document.getElementById('elegirCarpetaBtn');
        if (elegirCarpetaBtn) elegirCarpetaBtn.onclick = () => {
            if (!esAppNativa()) return;
            try { AndroidBridge.elegirCarpeta(); } catch (e) { alert('No se pudo abrir el selector de carpeta'); }
        };
        const importCarpetaBtn = document.getElementById('importCarpetaBtn');
        if (importCarpetaBtn) importCarpetaBtn.onclick = importarDesdeCarpeta;
        const restaurarBackupBtn = document.getElementById('restaurarBackupBtn');
        if (restaurarBackupBtn) restaurarBackupBtn.onclick = async () => {
            if (!esAppNativa()) return;
            if (!carpetaNativa || !carpetaNativa.uri) { mostrarNotificacion('⚠️ Primero elija una carpeta', 'info'); return; }
            const n = await restaurarDesdeArchivos();
            if (n === 0) mostrarNotificacion('ℹ️ No se encontraron respaldos para restaurar', 'info');
        };
        actualizarUICarpeta();
        // 3) Al abrir Configuracion > Tasa de cambio se refrescan los montos en vivo
        //    de las tres fuentes para saber en cuanto esta cada API antes de elegir.
        //    Solo se hace si la seccion de config esta visible y no se refresco
        //    hace menos de 30s, para no repetir 3 consultas en cada re-render.
        if (currentModule === 'config') {
            const haceFalta = !D.__ultimaTasasVivas || (Date.now() - D.__ultimaTasasVivas) > 30000;
            if (haceFalta) {
                D.__ultimaTasasVivas = Date.now();
                refrescarTasasVivas();
            }
        }
    }
    
    // ==================== SERVICE WORKER Y PWA ====================
    (function setupPWA() {
        var esTauri = window.__TAURI__ !== undefined || navigator.userAgent.includes('Tauri');
        if (!esTauri && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(function(err) {
                console.log('SW registration failed (non-critical):', err);
            });
        }

        if (window.AndroidBridge && window.AndroidBridge.requestWakeLock) {
            window.AndroidBridge.requestWakeLock();
        }
        if (window.AndroidBridge && window.AndroidBridge.lockPortrait) {
            window.AndroidBridge.lockPortrait();
        }

        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            var btn = document.querySelector('.install-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.innerHTML = '<i class="fas fa-mobile-screen-button"></i> Instalar App';
                btn.className = 'install-btn';
                btn.style.setProperty('background', D.config.theme);
                btn.style.setProperty('color', '#ffffff');
                btn.onclick = function() {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        deferredPrompt.userChoice.then(function() {
                            if (btn && btn.parentNode) btn.remove();
                        });
                    } else if (btn && btn.parentNode) {
                        btn.remove();
                    }
                };
                document.body.appendChild(btn);
            }
        });

        window.addEventListener('appinstalled', function() {
            var btn = document.querySelector('.install-btn');
            if (btn) btn.remove();
            console.log('JAM POS instalada como PWA');
        });
    })();
    
        function askPin(callback){
        let overlay = document.createElement('div');
        overlay.id = 'pinOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg,#000);color:var(--text,#fff);';
        overlay.innerHTML = '<h2 class=\"text-xl font-bold mb-4\"><i class="fas fa-lock"></i> PIN de acceso</h2><input type=\"password\" id=\"pinAuthInput\" maxlength=\"4\" pattern=\"[0-9]*\" inputmode=\"numeric\" class=\"border rounded-xl p-2 text-center text-2xl tracking-widest w-48\" placeholder=\"****\" autofocus style=\"background:var(--card-bg,#222);color:var(--text,#fff)\"><p id=\"pinErrorMsg\" class=\"text-red-400 text-sm mt-2 hidden\">PIN incorrecto</p>';
        document.body.appendChild(overlay);
        let input = document.getElementById('pinAuthInput');
        input.focus();
        input.addEventListener('keydown', function handler(e){
            if(e.key !== 'Enter') return;
            let val = this.value.replace(/\D/g,'').slice(0,4);
            if(val === D.config.pin){
                sessionStorage.setItem('jam_pin_authed','1');
                overlay.remove();
                if(callback) callback();
            } else {
                document.getElementById('pinErrorMsg').classList.remove('hidden');
                this.value = '';
                this.focus();
            }
        });
    }
// ==================== GUÍA DE LA APP Y TUTORIAL ====================
    const APP_VERSION = '1.1';
    const APP_NOMBRE = 'JAM POS';
    const APP_TAGLINE = 'Tienda Profesional';
    const MODULOS_GUIA = [
        { icon: 'fa-shopping-cart', nombre: 'Ventas', uso: 'Registra ventas buscando por nombre o código de barras, escáner de cámara, pago en Bs/dólares/dividido, ventas a CRÉDITO, ticket con imagen y modo Kiosco. Incluye cierre de caja (arqueo) y anulación de ventas.' },
        { icon: 'fa-boxes', nombre: 'Inventario', uso: 'Administra tus productos: precios en Bs y USD con conversión automática, stock mínimo y alertas, ajustes de stock auditados, categorías, escaneo de código de barras, imágenes y selección en lote.' },
        { icon: 'fa-users', nombre: 'Clientes', uso: 'Cartera de clientes con cédula, teléfono, saldo por cobrar (adeudo), historial de compras y búsqueda inteligente. Botón Cartera CxC para ver deudores y cobrar abonos.' },
        { icon: 'fa-truck', nombre: 'Proveedores', uso: 'Registra proveedores y tiempos de entrega. El módulo Entregas controla mercancía recibida con calendario de vencimientos; al recibir, sube el stock automáticamente.' },
        { icon: 'fa-coins', nombre: 'Gastos', uso: 'Registra los gastos del negocio y clasifícalos por categoría (incluye NÓMINA) para controlar tus costos.' },
        { icon: 'fa-user-tie', nombre: 'Empleados', uso: 'Gestiona tu personal y NÓMINA: cédula, cargo, salario en Bs, día de pago. Botón "Pagar" genera el gasto y marca el salario como pagado.' },
        { icon: 'fa-chart-line', nombre: 'Reportes', uso: 'Estadísticas: ventas por forma de pago, resumen del período (ganancia cobrada vs crédito), cartera por cobrar, nómina, entregas, gráficos diarios y documento/Excel imprimible.' },
        { icon: 'fa-calculator', nombre: 'Calculadora', uso: 'Convertidor USD ⇄ Bs integrado. Calcula precios, conversiones y prepagos al instante.' },
        { icon: 'fa-palette', nombre: 'Config', uso: 'Tema y colores, empresa, fuente de la tasa de dólar (3 disponibles), alertas de stock, impresión, copia de seguridad (JSON/CSV con tickets y caja), PIN, sync y dual persistencia.' },
        { icon: 'fa-sync-alt', nombre: 'Sincronizar', uso: 'Comparte los datos entre tus equipos sin servidores: Config → Sincronización entre dispositivos. Crea el círculo en la PC (QR + código de 4 letras) y únete desde los demás dispositivos escaneando el QR o escribiendo ID + código. Todo se copia solo mientras coincidan encendidos con internet.' }
    ];

    function inyectarBotonAyudaModulo() {
        const header = document.querySelector('.module-header');
        if(!header) return;
        if(D.config.mostrarGuiaCabecera === false) return;
        if(header.querySelector('.btn-ayuda-modulo')) return;
        const btn = document.createElement('button');
        btn.className = 'btn-ayuda-modulo';
        btn.title = 'Guía de la app';
        btn.innerHTML = '<i class="fas fa-circle-question"></i>';
        btn.onclick = () => {
            const g = GUIA_MODULOS[currentModule];
            if(g) iniciarTutorial(g.pasos, g.clave);
            else mostrarGuiaApp();
        };
        // Posición: junto al botón «Volver» (botón home) en un grupo derecho, pegados.
        const volver = header.querySelector('#btnVolverModule') || header.querySelector('.btn-back');
        if(volver){
            let der = header.querySelector('.module-header-der');
            if(!der){
                der = document.createElement('div');
                der.className = 'module-header-der';
                volver.parentNode.insertBefore(der, volver);
                der.appendChild(volver);
            }
            der.insertBefore(btn, volver);
            return;
        }
        const titulo = header.querySelector('.module-title');
        if(titulo) {
            let grupo = header.querySelector('.module-header-izq');
            if(!grupo) {
                grupo = document.createElement('div');
                grupo.className = 'module-header-izq';
                titulo.parentNode.insertBefore(grupo, titulo);
            }
            grupo.appendChild(titulo);
            const filaMigas = header.querySelector('.flex.items-center');
            if(filaMigas) filaMigas.appendChild(btn);
            else grupo.appendChild(btn);
        } else {
            header.insertBefore(btn, header.firstChild);
        }
    }

    function mostrarGuiaApp() {
        if (document.querySelector('.tuto-overlay')) return;
        const accent = D.config.theme;
        const versionTxt = `Versión ${APP_VERSION}`;
        const modulosHtml = MODULOS_GUIA.map(m =>
            `<div class="guia-item"><i class="fas ${m.icon}"></i><div><strong>${m.nombre}</strong><small>${m.uso}</small></div></div>`
        ).join('');
        const esNativa = typeof esAppNativa === 'function' && esAppNativa();
        const featuresHtml = `
            <div class="guia-item"><i class="fas fa-database"></i><div><strong>Dual Persistencia</strong><small>Tus datos se guardan en IndexedDB + archivos JSON como respaldo. Si la base de datos se borra, se restaura automáticamente.</small></div></div>
            <div class="guia-item"><i class="fas fa-lock"></i><div><strong>3 modos de candado</strong><small>Visible (prueba 30 días), Silencioso (sin aviso), Libre (sin candado). Configurable por variante.</small></div></div>
            <div class="guia-item"><i class="fas fa-tv"></i><div><strong>Modo Kiosco</strong><small>Pantalla simplificada para punto de venta rápido. Mantén presionado "Ventas" 4 segundos para activarlo o desactivarlo (candado rojo). Incluye calculadora integrada.</small></div></div>
            <div class="guia-item"><i class="fas fa-calculator"></i><div><strong>Calculadora USD ⇄ Bs</strong><small>Convertidor integrado en el home y en el kiosco. Formato de miles venezolano: 1.234.567,89</small></div></div>
            <div class="guia-item"><i class="fas fa-money-bill-wave"></i><div><strong>Tipo de cambio en vivo</strong><small>3 fuentes disponibles (BCV, AlCambio BCV, USDT) con selector; la regidora se muestra en el home y las otras 2 en la barra de fondo del teléfono (Android). Conversión automática Bs ⇄ USD.</small></div></div>
            <div class="guia-item"><i class="fas fa-hand-holding-usd"></i><div><strong>Crédito y Cartera CxC</strong><small>Vende a crédito por cliente y cobra abonos. La Cartera muestra deudores y cobrado; los abonos del día se suman al arqueo de caja.</small></div></div>
            <div class="guia-item"><i class="fas fa-cash-register"></i><div><strong>Cierre de caja</strong><small>Abre caja con fondo, cuadra ventas y abonos por método de pago y guarda el arqueo con diferencias.</small></div></div>
            <div class="guia-item"><i class="fas fa-user-tie"></i><div><strong>Nómina de empleados</strong><small>Salarios, día de pago y botón "Pagar" que registra el gasto y marca el mes como pagado.</small></div></div>
            <div class="guia-item"><i class="fas fa-truck"></i><div><strong>Entregas de proveedores</strong><small>Control de mercancía recibida con vencimientos; al recibir la entrega el stock sube solo.</small></div></div>
            <div class="guia-item"><i class="fas fa-boxes"></i><div><strong>Stock mínimo y alertas</strong><small>Configura un mínimo por producto; la app avisa (y suena) cuando baja. Ajustes de stock manuales auditados.</small></div></div>
            <div class="guia-item"><i class="fas fa-sync-alt"></i><div><strong>Sincronización entre dispositivos</strong><small>PC, celular o tablet comparten productos, ventas, clientes y más automáticamente (P2P, sin servidores, gratis). Config → Sincronización: crea el círculo en la PC y únete por QR o ID + código.</small></div></div>
            ${esNativa ? `<div class="guia-item"><i class="fas fa-folder-open"></i><div><strong>Carpeta de archivos</strong><small>Guarda tickets, respaldos y datos en la carpeta que elijas en tu dispositivo.</small></div></div>` : ''}
        `;
        const fondo = document.createElement('div');
        fondo.className = 'guia-fondo';
        fondo.innerHTML = `
            <div class="guia-caja">
                <div class="guia-titulo" style="color:${accent}"><i class="fas fa-circle-question"></i>Guía de la aplicación</div>
                <div class="guia-version">${APP_NOMBRE} · ${APP_TAGLINE} · ${versionTxt}</div>
                <div class="guia-fila"><span>Nombre</span><span>${APP_NOMBRE}</span></div>
                <div class="guia-fila"><span>Versión</span><span>${APP_VERSION}</span></div>
                <div class="guia-fila"><span>Tipo de cambio</span><span>${D.config.mostrarDolar ? '3 fuentes en vivo (BCV · AlCambio BCV · USDT)' : 'Desactivado'}</span></div>
                <div class="guia-fila"><span>Empresa</span><span>${D.config.empresa?.nombre || '—'}</span></div>
                <div class="guia-seccion">
                    <h4>Características principales</h4>
                    <div class="guia-lista">${featuresHtml}</div>
                </div>
                <div class="guia-seccion">
                    <h4>Cómo usar los módulos</h4>
                    <div class="guia-lista">${modulosHtml}</div>
                </div>
                <div class="guia-botones">
                    <button class="guia-boton-secundario" onclick="cerrarGuiaApp()">Cerrar</button>
                    <button class="guia-boton-primario" style="background:${accent}" onclick="cerrarGuiaApp();iniciarTutorial()">Ver recorrido interactivo</button>
                </div>
            </div>`;
        document.body.appendChild(fondo);
        window.cerrarGuiaApp = () => fondo.remove();
    }

    const GUIA_HOME = [
        { sel: null, titulo: 'Bienvenido a JAM POS LIBRE', texto: 'Tu tienda profesional: ventas, inventario, clientes (CxC), proveedores (entregas), gastos, nómina y cierre de caja. Tus datos se sincronizan entre dispositivos automáticamente.' },
        { sel: '#searchGlobalInput', titulo: 'Búsqueda rápida', texto: 'Escribe aquí para buscar productos, clientes y proveedores desde cualquier parte. La búsqueda inteligente filtra por nombre, código o cédula.' },
        { sel: '.card-bcv', titulo: 'Tipo de cambio', texto: 'Muestra la tasa regidora del dólar en vivo (BCV, AlCambio BCV o USDT, según elijas). Toca el icono para usar el convertidor USD ⇄ Bs con formato venezolano (1.234.567,89).' },
        { sel: '.home-grid', titulo: 'Tus módulos', texto: 'Cada botón abre un módulo: Ventas, Inventario, Clientes (con Cartera CxC), Proveedores (con Entregas), Gastos, Empleados (Nómina), Reportes, Calculadora y Configuración. Dentro de Configuración también está la Sincronización entre dispositivos.' },
        { sel: '.led-converter', titulo: 'Calculadora USD ⇄ Bs', texto: 'Convertidor rápido integrado. Toca para calcular conversiones al instante sin salir del home.' },
        { sel: null, titulo: 'Modo Kiosco', texto: 'Mantén presionado el botón "Ventas" 4 segundos para activar el modo Kiosco: pantalla simplificada para punto de venta rápido con calculadora integrada.' },
        { sel: '.btn-ayuda-home', titulo: 'Guía de la app', texto: 'Este botón abre la guía completa con todas las características, módulos y cómo usar cada uno. Desde aquí también puedes repetir el recorrido interactivo.' },
        { sel: null, titulo: '¡Listo!', texto: 'Ya conoces lo esencial. Explora cada módulo cuando quieras, y vuelve a la guía cuando lo necesites.' }
    ];
    const GUIA_VENTAS = [
        { sel: null, titulo: 'Ventas — Modo completo', texto: 'Esta es la pantalla principal de ventas. Aquí registras cada venta con cliente, productos, pago, ticket y, si aplica, crédito o arqueo de caja.' },
        { sel: '#clienteInput', titulo: '1. El cliente', texto: 'Escribe el nombre o la cédula del cliente y toca la sugerencia. Usa "+" para crear uno nuevo al instante. La búsqueda inteligente encuentra por nombre, cédula o teléfono.' },
        { sel: '#buscarProducto', titulo: '2. Buscar productos', texto: 'Escribe el nombre o código de barras. Toca un resultado para agregarlo al carrito (un toque = 1 unidad; un doble toque rápido no suma de más). Con Enter y un código se agrega directo.' },
        { sel: '#btnScanVentas', titulo: '3. Escáner con cámara', texto: 'Toca la cámara para escanear un código de barras y agregar el producto automáticamente.' },
        { sel: '#carritoLista', titulo: '4. Carrito', texto: 'Aquí ves lo agregado: cambia cantidades con los botones +/−, quita productos y mira el subtotal, IVA y total en tiempo real con precios en Bs y USD. El stock valida cada unidad.' },
        { sel: '#tipoPago', titulo: '5. Tipo de pago', texto: 'Elige cómo paga: efectivo Bs, dólares, tarjeta, transferencia, pago móvil, pago dividido (varios métodos en una venta) o 💳 CRÉDITO (requiere cliente; suma a la Cartera CxC y puedes cobrar abonos después).' },
        { sel: '#finalizarVenta', titulo: '6. Finalizar venta', texto: 'Genera el TICKET: imagen, impresión y reenvío por WhatsApp. Con efectivo calcula el cambio. El ticket guarda la tasa del día y las ventas a crédito marcan "CRÉDITO".' },
        { sel: null, titulo: '7. Anular una venta', texto: 'En el ticket toca "Anular": devuelve el stock, revierte el crédito del cliente y la venta sale de los reportes y del arqueo.' },
        { sel: null, titulo: '8. Cierre de caja', texto: 'En el encabezado "Ventas / Caja" toca "Caja" para abrir el arqueo del día: apertura con fondo, ventas y abonos cobrados por cada método de pago (efectivo, pago móvil, transferencia, tarjeta) para cuadrar el efectivo y guardar el cierre.' },
        { sel: null, titulo: '9. Crédito y abonos', texto: 'Después de una venta a crédito, el cliente aparece con adeudo en Clientes/Cartera. Toca "💵 Abono" para cobrar parcial o totalmente; el abono del día se suma al arqueo de caja.' },
        { sel: null, titulo: 'Modo Kiosco', texto: 'Para acceso rápido: mantén presionado "Ventas" 4 segundos. El kiosco muestra solo lo esencial con calculadora integrada y candado de seguridad (mantén presionado el candado 4 segundos para salir).' },
        { sel: null, titulo: '¡Listo!', texto: 'Con eso dominas Ventas. Haz tu primera venta cuando quieras; el ticket te da imagen e impresión.' }
    ];
    const GUIA_INVENTARIO = [
        { sel: '#searchInv', titulo: '1. Buscar en inventario', texto: 'Escribe el nombre o código de barras para filtrar al instante. Con Enter y un código se agrega o busca directo.' },
        { sel: '#btnScanInv', titulo: '2. Escáner', texto: 'Toca la cámara para escanear un código de barras y encontrar el producto al instante.' },
        { sel: '#nuevoProducto', titulo: '3. Nuevo producto', texto: 'Formulario completo: nombre, código, categoría, TIPO, proveedor, stock, imágenes y precios de compra y venta en Bs y USD.' },
        { sel: null, titulo: '4. Conversión automática', texto: 'En el formulario, los precios se convierten SOLOS: escribe en Bs y se rellena USD (y viceversa). Compra y venta se convierten por separado.' },
        { sel: '.product-card', titulo: '5. Tus productos', texto: 'Cada tarjeta muestra precios en Bs y USD, stock y categoría. Toca ✏️ Editar, 📋 Copiar, 🗑️ Eliminar (avisa si tiene stock) o ↔️ Ajustar para corregir unidades con un motivo (quedará auditado).' },
        { sel: '#selectAllCheckbox', titulo: '6. Selección en lote', texto: 'Marca varios productos y pulsa "✏️ Editar selección" para cambiar precios, categoría, proveedor o stock de todos a la vez.' },
        { sel: null, titulo: '7. Stock mínimo y alertas', texto: 'En Config → Alertas fijas el stock mínimo general. Cuando un producto baje de esa cantidad, la app avisa y suena. También hay ajustes de stock manuales auditados.' },
        { sel: null, titulo: '¡Listo!', texto: 'Ya sabes manejar inventario con conversión automática, ajustes y alertas. ¡Agrega tu primer producto!' }
    ];
    const GUIA_REPORTES = [
        { sel: '.chart-container', titulo: '1. Gráfico diario', texto: 'Toca cualquier barra del gráfico para ver las ventas, la ganancia COBRADA, gastos y utilidad de ese día (las ventas a crédito se informan en la Cartera).' },
        { sel: '#chartVentas', titulo: '2. Gráfico', texto: 'Gráfica de tus ventas en el tiempo para detectar tendencias de un vistazo.' },
        { sel: '#buscarVentas', titulo: '3. Buscar ventas', texto: 'Escribe para filtrar por fecha, artículo, cliente o número de venta. También puedes usar el calendario.' },
        { sel: '#btnCalendarioVentas', titulo: '4. Calendario', texto: 'Abre un calendario para ver las ventas de un día o de un mes específicos.' },
        { sel: '#listaVentasReporte', titulo: '5. Detalle de venta', texto: 'Toca cualquier venta para ver su ticket completo: cliente, productos, total, forma de pago y botón Anular.' },
        { sel: null, titulo: '6. Resumen y documentos', texto: 'La opción "Resumen" (Reportes / Resumen) y Exportar Excel arman el reporte del período: ventas y ganancia COBRADA (las ventas a crédito se muestran por separado), gastos, nómina, entregas, ventas por forma de pago, cartera por cobrar y tasas. Utilidad = ganancia cobrada − gastos − nómina.' },
        { sel: null, titulo: '¡Listo!', texto: 'Con Reportes controlas tu negocio: ganancias, gastos, ventas por día, crédito y caja.' }
    ];
    const GUIA_CONFIG = [
        { sel: null, titulo: 'Configuración', texto: 'Aquí personalizas todo: empresa, tema, fuente de la tasa, alertas, seguridad, backup y sincronización.' },
        { sel: '#btnToggleEmpresa', titulo: '1. Datos de la empresa', texto: 'Configura nombre, dirección, teléfono, RIF y logo. Aparece en los tickets impresos.' },
        { sel: '#btnToggleTasa', titulo: '2. Tasa de cambio', texto: 'Elige la fuente del dólar: BCV, AlCambio BCV o USDT. La regidora se muestra en el home y las otras 2 en la barra de fondo del teléfono (Android). Conversión automática Bs ⇄ USD en toda la app.' },
        { sel: '#btnToggleOpciones', titulo: '3. Opciones y alertas', texto: 'Modo oscuro automático, IVA, prevenir cierre accidental, SONIDO de alertas y stock mínimo general para avisar cuando un producto está bajo.' },
        { sel: '#btnToggleSeguridad', titulo: '4. Seguridad (PIN)', texto: 'Protege la app con un PIN de 4 dígitos. Se pide al abrir la app.' },
        { sel: '#btnToggleColores', titulo: '5. Temas de color', texto: 'Elige el color de acento de la app entre una paleta de colores predefinidos.' },
        { sel: '#btnToggleBackup', titulo: '6. Copia de seguridad', texto: 'Dual persistencia: tus datos se guardan en IDB + archivos JSON. Exporta/importa JSON y CSV — incluyen TODOS los registros, tickets, cierre de caja, historial y tasas — y restaura desde el respaldo automático.' },
        { sel: '#btnToggleSync', titulo: '7. Sincronización entre dispositivos', texto: 'Abre el panel y toca "Abrir Sincronización". En la PC crea el círculo (aparecen QR, ID y código de 4 letras); en los demás equipos únete escaneando el QR o escribiendo ID + código. Los datos se comparten solos mientras ambos estén encendidos con internet.' },
        { sel: null, titulo: '¡Listo!', texto: 'Con Config personalizas la app a tu negocio. Los datos se sincronizan y respaldan automáticamente.' }
    ];
    const GUIA_SYNC = [
        { sel: '.module-header', titulo: 'Sincronización', texto: 'Conecta todos tus equipos (PC, celulares y tabletas) para que compartan los mismos datos sin servidores ni cuentas: productos, clientes, proveedores, gastos, empleados, ventas, tasa, tickets y entregas.' },
        { sel: null, titulo: '1. Crea el círculo', texto: 'En el equipo principal (la PC que pasa más tiempo encendida) toca "Crear círculo (primer equipo)".' },
        { sel: '#syncQRContainer', titulo: '2. QR + ID + código', texto: 'Aparece el QR con su código de 4 letras y el ID del círculo. Escanea ese QR desde el teléfono para unirte. Para entrar a mano, el otro equipo necesita el ID (botón "Copiar ID") y el código de 4 letras.' },
        { sel: null, titulo: '3. Únete desde los demás', texto: 'En cada otro equipo ve a Configuración → Sincronización entre dispositivos → Abrir Sincronización y toca "Unirme escaneando QR" o "Escribir ID del círculo".' },
        { sel: null, titulo: '4. Se sincroniza solo', texto: 'Mientras ambos equipos estén encendidos y con internet, se conectan automáticamente y se intercambian los cambios. Si editas el mismo dato en dos equipos, gana el último en hacerlo. Los borrados también se propagan.' },
        { sel: null, titulo: '¡Listo!', texto: 'Guarda una foto del QR para futuras instalaciones. Para desvincular un equipo usa "Olvidar círculo".' }
    ];
    const GUIA_MODULOS = {
        ventas: { clave: 'jam_guia_ventas_visto', pasos: GUIA_VENTAS },
        inventario: { clave: 'jam_guia_inventario_visto', pasos: GUIA_INVENTARIO },
        reportes: { clave: 'jam_guia_reportes_visto', pasos: GUIA_REPORTES },
        config: { clave: 'jam_guia_config_visto', pasos: GUIA_CONFIG },
        sync: { clave: 'jam_guia_sync_visto', pasos: GUIA_SYNC }
    };

    function iniciarTutorial(pasos, claveVisto) {
        if (document.querySelector('.tuto-overlay') || document.querySelector('.guia-fondo')) return;
        const accent = D.config.theme;
        const fondo = document.createElement('div');
        fondo.className = 'tuto-overlay';
        const resalto = document.createElement('div');
        resalto.className = 'tuto-resalto';
        const burbuja = document.createElement('div');
        burbuja.className = 'tuto-burbuja';
        burbuja.innerHTML = `<div class="tuto-flecha"></div><h3></h3><p></p><div class="tuto-botones"><button class="tuto-saltar">Saltar</button><button class="tuto-siguiente" style="background:${accent}">Siguiente</button></div><div class="tuto-contador"></div>`;
        fondo.appendChild(resalto);
        fondo.appendChild(burbuja);
        document.body.appendChild(fondo);

        let paso = 0;
        const pintar = () => {
            const p = pasos[paso];
            const h3 = burbuja.querySelector('h3'); h3.textContent = ''; nodosIconosFA(p.titulo, h3);
            const pr = burbuja.querySelector('p'); pr.textContent = ''; nodosIconosFA(p.texto, pr);
            burbuja.querySelector('.tuto-contador').textContent = `${paso + 1} de ${pasos.length}`;
            burbuja.querySelector('.tuto-siguiente').textContent = paso === pasos.length - 1 ? 'Terminar' : 'Siguiente';
            if (p.sel) {
                const el = document.querySelector(p.sel);
                if (el) {
                    const r = el.getBoundingClientRect();
                    resalto.style.display = 'block';
                    resalto.style.left = (r.left - 6) + 'px';
                    resalto.style.top = (r.top - 6) + 'px';
                    resalto.style.width = (r.width + 12) + 'px';
                    resalto.style.height = (r.height + 12) + 'px';
                } else {
                    resalto.style.display = 'none';
                }
            } else {
                resalto.style.display = 'none';
            }
        };
        const marcarVisto = () => { if(claveVisto) localStorage.setItem(claveVisto, '1'); };
        const siguiente = () => {
            paso++;
            if (paso >= pasos.length) { fondo.remove(); marcarVisto(); return; }
            pintar();
        };
        burbuja.querySelector('.tuto-saltar').onclick = () => { fondo.remove(); marcarVisto(); };
        burbuja.querySelector('.tuto-siguiente').onclick = siguiente;
        pintar();
    }

    function iniciarTutorialSiPrimeraVez() {
        if(localStorage.getItem('jam_tutorial_visto')) {
            setTimeout(() => {
                if(currentModule === 'home') {
                    const btn = document.querySelector('.btn-ayuda-home');
                    const inp = document.getElementById('searchGlobalInput');
                    if(btn) btn.classList.add('oculto');
                    if(inp) inp.classList.add('sin-ayuda');
                }
            }, 400);
            return;
        }
        setTimeout(() => {
            if(currentModule === 'home' && document.querySelector('.home-grid')) iniciarTutorial(GUIA_HOME, 'jam_tutorial_visto');
        }, 600);
    }

    function iniciarGuiaModuloSiPrimeraVez(mod) {
        const g = GUIA_MODULOS[mod];
        if(!g || localStorage.getItem(g.clave)) return;
        setTimeout(() => {
            if(currentModule === mod) iniciarTutorial(g.pasos, g.clave);
        }, 500);
    }
// ==================== VERSIÓN DE PRUEBA (CANDADO) ====================
    // ==================== SISTEMA DE PRUEBA 30 DÍAS ====================
    const JAM_EMAIL_VENTA = 'jamaplicativo@gmail.com';
    // Modo del candado de prueba:
    //   'visible'    -> cuenta atrás con banner + popup (versión de prueba gráfica)
    //   'silencioso' -> cuenta 30 días desde la primera activación SIN mostrar nada;
    //                   al vencer muestra únicamente la pantalla de bloqueo
    //   'libre'      -> sin candado ni conteo (no se escribe ninguna marca)
    const JAM_MODO_CANDADO = 'libre';
    window._pruebaInfo = null;

    function mostrarBloqueoPrueba() {
        if(document.querySelector('.prueba-bloqueo')) return;
        document.body.innerHTML = '';
        const fondo = document.createElement('div');
        fondo.className = 'prueba-bloqueo';
        fondo.innerHTML = `<div class="prueba-bloqueo-caja">
            <div class="prueba-bloqueo-icono">&#128274;</div>
            <h2>Periodo de prueba finalizado</h2>
            <p>Tu periodo de prueba de <b>30 dias</b> de JAM POS ha terminado.</p>
            <p class="prueba-bloqueo-detalle">Para seguir usando el sistema necesitas la version completa con todas las caracteristicas premium.</p>
            <div class="prueba-bloqueo-email">
                <div class="prueba-bloqueo-email-label">Contacta para obtener la version completa:</div>
                <a href="mailto:${JAM_EMAIL_VENTA}" class="prueba-bloqueo-email-link">${JAM_EMAIL_VENTA}</a>
            </div>
            <div class="prueba-bloqueo-premium">
                <div class="prueba-bloqueo-premium-titulo">Version Premium incluye:</div>
                <div class="prueba-bloqueo-premium-item">&#10003; Sin limite de tiempo</div>
                <div class="prueba-bloqueo-premium-item">&#10003; Sincronizacion entre dispositivos</div>
                <div class="prueba-bloqueo-premium-item">&#10003; Soporte tecnico prioritario</div>
                <div class="prueba-bloqueo-premium-item">&#10003; Actualizaciones de por vida</div>
                <div class="prueba-bloqueo-premium-item">&#10003; Personalizacion para tu tienda</div>
            </div>
            <button class="prueba-bloqueo-btn" onclick="window.location.href='mailto:${JAM_EMAIL_VENTA}'">Enviar correo</button>
            <button class="prueba-bloqueo-btn-cerrar" onclick="if(window.AndroidBridge&&AndroidBridge.cerrarApp)AndroidBridge.cerrarApp();else window.close();">Cerrar</button>
        </div>`;
        document.body.appendChild(fondo);
    }

    function mostrarContadorPrueba(info) {
        if(!info || info.bloqueada) return;
        if(sessionStorage.getItem('jam_trial_popup_shown')) return;
        sessionStorage.setItem('jam_trial_popup_shown', '1');
        const overlay = document.createElement('div');
        overlay.className = 'prueba-contador-overlay';
        const pct = Math.round((info.diasRestantes / 30) * 100);
        const diasText = info.diasRestantes === 1 ? '1 dia' : info.diasRestantes + ' dias';
        const urgente = info.diasRestantes <= 7;
        overlay.innerHTML = `<div class="prueba-contador-caja">
            <div class="prueba-contador-header">
                <div class="prueba-contador-icono">&#128230;</div>
                <h2>JAM POS</h2>
                <span class="prueba-contador-tag">Version de Prueba</span>
            </div>
            <div class="prueba-contador-cuerpo">
                <div class="prueba-contador-numero ${urgente ? 'prueba-contador-urgente' : ''}">${info.diasRestantes}</div>
                <div class="prueba-contador-label">${diasText} restantes</div>
                <div class="prueba-contador-barra">
                    <div class="prueba-contador-barra-fill" style="width:${pct}%"></div>
                </div>
                <div class="prueba-contador-dias-total">30 dias de prueba</div>
            </div>
            <div class="prueba-contador-footer">
                <p>¿Necesitas la version completa?</p>
                <a href="mailto:${JAM_EMAIL_VENTA}" class="prueba-contador-email">${JAM_EMAIL_VENTA}</a>
                <button class="prueba-contador-btn" id="btnCerrarContador">Continuar usando</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#btnCerrarContador').onclick = function() { overlay.remove(); };
    }

    function mostrarBannerPrueba(info) {
        if(!info || info.bloqueada) return;
        window._pruebaInfo = info;
        const home = document.querySelector('.home-container');
        if(!home) return;
        const existente = document.querySelector('.prueba-banner');
        if(existente) existente.remove();
        const b = document.createElement('div');
        b.className = 'prueba-banner';
        const diasText = info.diasRestantes === 1 ? '1 dia' : info.diasRestantes + ' dias';
        b.innerHTML = `<span>&#128274; Prueba — <b>${diasText}</b> restantes</span><a href="mailto:${JAM_EMAIL_VENTA}" class="prueba-banner-link">Version completa</a><button onclick="this.parentElement.remove()">&#10005;</button>`;
        home.prepend(b);
    }

    function sincronizarPrueba(info) {
        if(JAM_MODO_CANDADO === 'libre') return;
        if(info.bloqueada) { window._pruebaInfo = null; mostrarBloqueoPrueba(); return; }
        if(JAM_MODO_CANDADO === 'silencioso') return;
        mostrarBannerPrueba(info);
        mostrarContadorPrueba(info);
    }

    function verificarPruebaInicio() {
        if(JAM_MODO_CANDADO === 'libre') { window._pruebaInfo = null; return false; }
        var TRIAL_DAYS = 30;
        var TRIAL_KEY = 'jam_trial_data';

        // Función local de verificación (funciona sin AndroidBridge)
        function verificarLocal() {
            var fecha = 0;
            try {
                var stored = localStorage.getItem(TRIAL_KEY);
                if (stored) {
                    try { fecha = JSON.parse(atob(stored)).f; } catch(e) {}
                }
            } catch(e) {}
            if (!fecha) {
                try {
                    var idbData = localStorage.getItem(TRIAL_KEY + '_idb');
                    if (idbData) {
                        try { fecha = JSON.parse(atob(idbData)).f; } catch(e) {}
                    }
                } catch(e) {}
            }
            if (!fecha) {
                fecha = Date.now();
                var encoded = btoa(JSON.stringify({ f: fecha, k: 'j27', v: 1 }));
                try { localStorage.setItem(TRIAL_KEY, encoded); } catch(e) {}
                try { localStorage.setItem(TRIAL_KEY + '_idb', encoded); } catch(e) {}
            }
            var diffDias = Math.floor((Date.now() - fecha) / 86400000);
            var diasRestantes = Math.max(0, TRIAL_DAYS - diffDias);
            return { bloqueada: diasRestantes <= 0, diasRestantes: diasRestantes, fechaInicio: fecha, tamper: false };
        }

        // Intentar con AndroidBridge primero, si no existe usar local
        var info;
        if (window.AndroidBridge && typeof AndroidBridge.esVersionPrueba === 'function' && AndroidBridge.esVersionPrueba()) {
            try { info = JSON.parse(AndroidBridge.verificarPrueba()); } catch(e) { info = verificarLocal(); }
        } else {
            info = verificarLocal();
        }
        sincronizarPrueba(info);
        if(info.bloqueada) { mostrarBloqueoPrueba(); return true; }
        window._pruebaInfo = (JAM_MODO_CANDADO === 'visible') ? info : null;
        return false;
    }
// ==================== INICIALIZACIÓN ====================
    // Bloquear orientación vertical cuando está instalado como PWA (standalone).
    // En navegador normal no aplica (screen.orientation.lock solo funciona en
    // pantalla completa / standalone) para no molestar al usuario.
    function bloquearOrientacionVertical() {
        if (window.matchMedia('(display-mode: standalone)').matches && screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('portrait').catch(function(){});
        }
    }
    bloquearOrientacionVertical();
    // Bloquear menú contextual, selección y copia de texto (feeling nativo).
    (function bloquearCopiadoYSeleccion() {
        const editable = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
        document.addEventListener('contextmenu', e => { if(!editable(e.target)) e.preventDefault(); });
        document.addEventListener('selectstart', e => { if(!editable(e.target)) e.preventDefault(); });
        document.addEventListener('copy', e => { if(!editable(e.target)) e.preventDefault(); });
        document.addEventListener('cut', e => { if(!editable(e.target)) e.preventDefault(); });
        document.addEventListener('dragstart', e => e.preventDefault());
        // Android: informar al WebView cuando el foco esta en un campo editable,
        // para que el menu nativo Copiar/Cortar/Pegar se muestre SOLO alli.
        const esEditable = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
        const notificarFoco = () => {
            if(!window.AndroidBridge || typeof AndroidBridge.setCampoEditable !== 'function') return;
            AndroidBridge.setCampoEditable(esEditable(document.activeElement));
        };
        document.addEventListener('focusin', notificarFoco);
        document.addEventListener('focusout', notificarFoco);
        document.addEventListener('visibilitychange', notificarFoco);
    })();
    // Feedback háptico nativo al presionar botones
    (function setupHaptico() {
        if (!navigator.vibrate) return;
        document.addEventListener('pointerdown', function(e) {
            var t = e.target;
            if (t.closest('button,.btn-redondeado,.sidebar-item,.main-module-btn,.color-circle,.btn-editar-redondeado,.btn-eliminar-redondeado,.btn-verde-redondeado,#btnFinalizarVenta')) {
                navigator.vibrate(10);
            }
        }, { passive: true });
    })();
    // Sistema de refresco/consulta de tasas (sin saturar). Se llama UNA vez en
    // todos los caminos de arranque (normal, modo kiosco y restauracion de
    // modulo), para que el selector de fuentes y el monitoreo de 30 min
    // funcionen siempre, independientemente de donde arranque la app.
    function iniciarCicloTasas() {
        // 1) Al abrir la app se consultan TODAS las tasas (BCV, Al Cambio BCV y USDT)
        //    para mostrar los montos en vivo en el selector de configuracion.
        refrescarTasasVivas();
        // 2) Cada 30 minutos se vuelven a consultar (monitoreo constante).
        setInterval(() => { refrescarTasasVivas(); actualizarTasa(false); }, 30 * 60 * 1000);
        // 3) Al abrir la opcion Tasa de cambio en Configuracion, renderConfig()
        //    tambien llama a refrescarTasasVivas() (bajo "al abrir la opcion").
    }
    loadAllData().then(() => {
        if(window.JAMUltimateTrial && window.JAMUltimateTrial.bloquearInmediato()) return;
        if(verificarPruebaInicio()) return;
        iniciarCicloTasas();
        if(!(D.config.dolarRate > 0)){ setTimeout(() => { garantizarTasa().then(ok => { if(!ok) mostrarNotificacion('Sin tasa registrada: conéctate a internet o ingrésala en Configuración.', 'error'); actualizarDisplayTasa(); try{ recalcularPreciosPorTasa(); }catch(e){} }); }, 1200); }
        if(kioscoVentas) {
            localStorage.setItem('jam_last_module', 'ventas');
            const irKiosco = () => { currentModule = 'ventas'; renderVentas(); actualizarTasa(false); };
            if(D.config.pin && D.config.pin.length === 4 && !sessionStorage.getItem('jam_pin_authed')) askPin(irKiosco);
            else irKiosco();
            return;
        }
        const shortcutModule = window.jamShortcutModule ? window.jamShortcutModule() : null;
        const lastModule = shortcutModule || localStorage.getItem('jam_last_module');
        if(shortcutModule) { localStorage.setItem('jam_last_module', shortcutModule); }
        if(lastModule && lastModule !== 'home' && lastModule !== '' && window.navigateTo) {
            if(D.config.pin && D.config.pin.length === 4) {
                if(!sessionStorage.getItem('jam_pin_authed')) askPin(() => { renderHome(); window.navigateTo(lastModule); actualizarTasa(false); });
                else { renderHome(); setTimeout(() => window.navigateTo(lastModule), 50); actualizarTasa(false); }
            } else {
                renderHome();
                setTimeout(() => window.navigateTo(lastModule), 50);
                actualizarTasa(false);
            }
            return;
        }
        if(D.config.pin && D.config.pin.length === 4) {
            if(!sessionStorage.getItem('jam_pin_authed')) askPin(() => { renderHome(); actualizarTasa(false); });
            else { renderHome(); actualizarTasa(false); }
        } else {
            renderHome();
            actualizarTasa(false);
        }
    });
    
    // Detectar cambio de tamaño (rotación, resize escritorio)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            actualizarModoLayout();
            if(currentModule === 'home' && document.activeElement?.id !== 'searchGlobalInput') renderHome();
        }, 300);
    });

    // Al regresar de segundo plano: refrescar el módulo actual.
    // Fix: pantalla en blanco tras dejar la app mucho tiempo en background.
    document.addEventListener('visibilitychange', () => {
        if(document.hidden) {
            if(kioscoVentas) guardarSesionVenta();
            return;
        }
        // Si hay kiosco y no estamos en ventas, forzar vuelta a ventas
        if(kioscoVentas && currentModule !== 'ventas') {
            currentModule = 'ventas';
            renderVentas();
            return;
        }
        // Modo normal: re-renderizar el módulo actual
        refrescarModuloActual();
    });

    // Re-renderiza el módulo actual sin cambiar de módulo
    function refrescarModuloActual() {
        if(!currentModule) return;
        if(currentModule === 'home') renderHome();
        else if(currentModule === 'ventas') renderVentas();
        else if(currentModule === 'inventario') renderInventario();
        else if(currentModule === 'clientes') renderCrud('clientes', 'Clientes', ['cedula','nombre','telefono','direccion','email']);
        else if(currentModule === 'proveedores') renderCrud('proveedores', 'Proveedores', ['rif','nombre','telefono','contacto','direccion']);
        else if(currentModule === 'gastos') renderCrud('gastos', 'Gastos', ['concepto','montoBs','categoria','fecha']);
        else if(currentModule === 'empleados') renderCrud('empleados', 'Empleados', ['cedula','nombre','cargo','salarioBs','diaPago','fechaPago','fechaContrato']);
        else if(currentModule === 'reportes') renderReportes();
        else if(currentModule === 'config') renderConfig();
    }
    window.jamRefrescarModuloActual = refrescarModuloActual;

    // Llamado desde Android onResume() cuando la Activity se restaura
    window.jamOnResume = function() {
        if(!document.body || !document.body.children.length) return;
        // Verificar que el DOM esté intacto
        const appEl = document.getElementById('app') || document.body;
        if(!appEl || appEl.children.length === 0) {
            // DOM destruido, recargar todo desde cero
            loadAllData().then(() => {
                renderHome();
                actualizarTasa(false);
            });
            return;
        }
        refrescarModuloActual();
    };
