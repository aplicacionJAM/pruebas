/* ============================================================================
   JAM POS - Capa "Odoo" para escritorio (TOP BAR + LAUNCHER + HOME + SKIN)
   ============================================================================
   Reutiliza TODA la lógica de app.js mediante window.navigateTo, window.D,
   window.editarProductoDesdeBusqueda, window.venderProductoDesdeBusqueda y
   window.mostrarConvertidor. No modifica app.js.
   - Un MutationObserver sobre #appRoot sustituye el home original por la piel
     Odoo siempre que apaezca (inicio, backToHome, resize, resume...).
   - Se activa solo con width >= 1024px (misma regla que esDesktop de app.js).
   - En móvil no se aplica nada.
   ========================================================================== */
(function () {
  'use strict';

  const MODULOS = [
    { icon: 'fa-shopping-cart', label: 'Ventas', desc: 'Venta de productos y creación de facturas', color: '#714b67', id: 'ventas' },
    { icon: 'fa-boxes', label: 'Inventario', desc: 'Gestión de productos y stock', color: '#017e84', id: 'inventario' },
    { icon: 'fa-users', label: 'Clientes', desc: 'Cartera de clientes y abonos', color: '#d65050', id: 'clientes' },
    { icon: 'fa-truck', label: 'Proveedores', desc: 'Proveedores y entregas', color: '#c26d00', id: 'proveedores' },
    { icon: 'fa-coins', label: 'Gastos', desc: 'Registro de gastos del negocio', color: '#7c4b8a', id: 'gastos' },
    { icon: 'fa-user-tie', label: 'Empleados', desc: 'Nómina y pagos de empleados', color: '#2e70a8', id: 'empleados' },
    { icon: 'fa-chart-line', label: 'Reportes', desc: 'Estadísticas y reportes', color: '#227a4e', id: 'reportes' },
    { icon: 'fa-palette', label: 'Configuración', desc: 'Ajustes, tema y respaldos', color: '#4b5563', id: 'config' }
  ];

  // Subtítulos de módulo -> módulo propietario (para teñir el panel al color del módulo)
  const SUBMODULOS = {
    'caja': 'ventas', 'cierre': 'ventas', 'cartera': 'clientes', 'entregas': 'proveedores', 'resumen': 'reportes'
  };

  const selectorHomeOriginal = '#searchGlobalInput';

  let topbarEl = null, launcherEl = null, searchEl = null, resultsEl = null;

  /* ¿Es una PC real? Ancho amplio + mouse o trackpad (puntero fino).
     Así los efectos y colores de la piel solo se ven en PC y NO en
     smartphones/tablets, aunque el ancho de la ventana supere 1024px. */
  function esPC() {
    return window.innerWidth >= 1024 &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function estado() { try { return window.D && D.config ? D.config : {}; } catch (e) { return {}; } }

  function accentColor() { return estado().theme || '#714b67'; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function normalize(s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function fmtDolarStatic(v) {
    try { return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    catch (e) { return String(v); }
  }

  /* ------------------------------------------------------------------ TOPBAR */
  function buildTopbar() {
    topbarEl = document.createElement('div');
    topbarEl.className = 'odoo-topbar';
    const accent = accentColor();
    topbarEl.innerHTML =
      '<button class="ot-logo" style="background:' + accent + '" title="Menú de aplicaciones" id="odooBtnApps"><i class="fas fa-th-large"></i></button>' +
      '<span class="ot-appname">JAM POS <span class="fa fa-angle-right"></span><span id="otModuloActual">Inicio</span></span>' +
      '<div class="ot-search">' +
      '  <i class="fas fa-search"></i>' +
      '  <input type="text" id="odooBuscar" placeholder="Buscar productos, clientes, módulos..." autocomplete="off">' +
      '  <span class="ot-kbd">Ctrl K</span>' +
      '  <div class="odoo-search-results" style="display:none"></div>' +
      '</div>' +
      '<div class="ot-actions">' +
      '  <button class="ot-iconbtn" id="odooBtnHome" title="Inicio"><i class="fas fa-home"></i></button>' +
      '</div>';
    document.body.insertBefore(topbarEl, document.body.firstChild);

    resultsEl = topbarEl.querySelector('.odoo-search-results');
    searchEl = topbarEl.querySelector('#odooBuscar');
    topbarEl.querySelector('#odooBtnApps').onclick = () => toggleLauncher(true);
    topbarEl.querySelector('#odooBtnHome').onclick = () => { try { window.backToHome(); } catch (e) {} };
    searchEl.addEventListener('input', () => runSearch(searchEl.value));
    searchEl.addEventListener('focus', () => { if (searchEl.value) runSearch(searchEl.value); });
    document.addEventListener('click', ev => {
      if (resultsEl && !resultsEl.contains(ev.target) && ev.target !== searchEl) { resultsEl.style.display = 'none'; }
    });
    document.addEventListener('keydown', ev => {
      if (ev.key === 'k' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); searchEl.focus(); searchEl.select(); }
      if (ev.key === 'Escape') closeGlobal();
    });
  }

  function setModuloActual(nombre) {
    const el = document.getElementById('otModuloActual');
    if (el) el.textContent = nombre || 'Inicio';
  }

  /* Tiñe el skin del módulo activo con su color único (líneas, botones, fuentes).
     Se apoya en una variable CSS --mod-accent que style-odoo.css usa en:
     título, breadcrumb, línea bajo la cabecera, botones redondeados. */
  let ultimoModuloId = null;
  function tintarModulo(id, forzar) {
    id = id || null;
    if (id === ultimoModuloId && !forzar) return;
    ultimoModuloId = id;
    const root = document.documentElement;
    if (id) {
      const sub = SUBMODULOS[String(id).toLowerCase()];
      const base = MODULOS.find(x => x.id === (sub || id)) || MODULOS[0];
      root.style.setProperty('--mod-accent', base.color);
      root.style.setProperty('--mod-accent-soft', base.color + '22');
    } else {
      root.style.removeProperty('--mod-accent');
      root.style.removeProperty('--mod-accent-soft');
    }
  }
  function idDeTitulo(t) {
    t = String(t || '').trim().toLowerCase();
    const directo = MODULOS.find(m => m.label.toLowerCase() === t);
    if (directo) return directo.id;
    const sub = SUBMODULOS[t];
    if (sub) return sub;
    return null;
  }

  /* ---------------------------------------------------------------- LAUNCHER */
  function buildLauncher() {
    launcherEl = document.createElement('div');
    launcherEl.className = 'odoo-launcher';
    renderLauncherList('');
    document.body.appendChild(launcherEl);
    launcherEl.addEventListener('click', ev => { if (ev.target === launcherEl) closeGlobal(); });
  }

  function renderLauncherList(q) {
    const filt = MODULOS.filter(m => normalize(m.label + ' ' + m.desc).includes(normalize(q)));
    launcherEl.innerHTML =
      '<div class="odoo-launcher-box">' +
      '  <div class="odoo-launcher-search"><i class="fas fa-magnifying-glass"></i><input type="text" id="odooLauncherBuscar" placeholder="Escriba el nombre de una aplicación..." autocomplete="off"></div>' +
      '  <p class="odoo-launcher-title">Aplicaciones</p>' +
      '  <div class="odoo-app-grid">' +
      filt.map(m => '<button class="odoo-app-card" data-mod="' + m.id + '">' +
        '<span class="oac-icon" style="background:' + m.color + '"><i class="fas ' + m.icon + '"></i></span>' +
        '<span class="oac-label">' + m.label + '</span></button>').join('') +
      '  </div>' +
      '</div>';
    const inp = launcherEl.querySelector('#odooLauncherBuscar');
    if (inp) {
      inp.focus();
      inp.addEventListener('input', e => renderLauncherList(e.target.value.replace(/^\s+/, '')));
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { const b = launcherEl.querySelector('.odoo-app-card'); if (b) b.click(); } });
    }
    launcherEl.querySelectorAll('.odoo-app-card').forEach(btn => {
      btn.onclick = () => { cerrarLauncher(); try { window.navigateTo(btn.dataset.mod); } catch (e) {} };
    });
  }

  function toggleLauncher(abrir) {
    if (!launcherEl) return;
    const open = abrir === true || !launcherEl.classList.contains('open');
    launcherEl.classList.toggle('open', open);
    if (open) { const i = launcherEl.querySelector('#odooLauncherBuscar'); if (i) i.focus(); }
  }
  function cerrarLauncher() { if (launcherEl) launcherEl.classList.remove('open'); }
  function closeGlobal() { cerrarLauncher(); if (resultsEl) resultsEl.style.display = 'none'; }

  /* ------------------------------------------------------------------ HOME */
  function buildHome() {
    const root = document.getElementById('appRoot');
    if (!root || !esPC()) return;
    const cfg = estado();
    const accent = accentColor();
    const tasa = cfg.dolarRate > 0 ? fmtDolarStatic(cfg.dolarRate) : '—';
    const hora = new Date().getHours();
    let saludo = 'Buenos días';
    if (hora >= 12 && hora < 19) saludo = 'Buenas tardes';
    if (hora >= 19) saludo = 'Buenas noches';

    const html =
      '<div class="odoo-home">' +
      '  <div class="odoo-home-head"><h1><i class="fas fa-store" style="color:' + accent + '"></i> ' + saludo + '<span class="oh-hello">JAM POS v1.1</span></h1></div>' +
      '  <div class="odoo-tasas">' +
      '    <div class="ot-card"><p class="ot-t">Tipo de cambio</p><p class="ot-v">1 USD = ' + tasa + ' Bs</p>' +
      '      <button class="btn-azul-redondeado" id="odooConv"><i class="fas fa-calculator"></i> Convertidor</button></div>' +
      '  </div>' +
      '  <div class="odoo-modules">' +
      MODULOS.map(m => '<button class="odoo-module-card" data-mod="' + m.id + '">' +
        '<span class="omc-icon" style="background:' + m.color + '"><i class="fas ' + m.icon + '"></i></span>' +
        '<span class="omc-txt"><span class="omc-label">' + m.label + '</span><span class="omc-desc">' + m.desc + '</span></span>' +
        '</button>').join('') +
      '  </div>' +
      '</div>';

    root.innerHTML = html;
    const cv = document.getElementById('odooConv');
    if (cv) cv.onclick = () => { try { window.mostrarConvertidor(); } catch (e) {} };
    root.querySelectorAll('.odoo-module-card').forEach(btn => {
      btn.onclick = () => { try { window.navigateTo(btn.dataset.mod); } catch (e) {} };
    });
    setModuloActual('Inicio');
  }

  /* --------------------------------------------------------------- BÚSQUEDA */
  function runSearch(q) {
    q = normalize(q);
    if (!q) { if (resultsEl) resultsEl.style.display = 'none'; return; }
    const mods = MODULOS.filter(m => normalize(m.label + ' ' + m.desc).includes(q));
    const content = [];
    try {
      const prod = (window.D && D.productos) || [];
      prod.slice(0, 5).forEach(p => {
        const nom = p.nombre || '';
        if (normalize(nom).includes(q) || normalize(p.codigo || '').includes(q) || normalize(p.marca || '').includes(q)) {
          content.push({ tipo: 'Producto', icon: 'fa-box', label: nom, mod: 'ventas', id: p.id });
        }
      });
      const cli = (window.D && D.clientes) || [];
      cli.slice(0, 3).forEach(c => {
        const nom = c.nombre || '';
        if (normalize(nom).includes(q)) {
          content.push({ tipo: 'Cliente', icon: 'fa-user', label: nom, mod: 'clientes', id: null });
        }
      });
    } catch (e) {}
    const items = [
      ...mods.map(m => ({ tipo: 'Módulo', icon: m.icon, label: m.label, mod: m.id, id: null })),
      ...content.slice(0, 10)
    ];
    if (!items.length || !resultsEl) {
      if (resultsEl) { resultsEl.innerHTML = '<div class="osr-empty">Sin resultados</div>'; resultsEl.style.display = 'block'; }
      return;
    }
    resultsEl.innerHTML = items.map(r =>
      '<button class="osr-item" data-mod="' + esc(r.mod) + '" data-id="' + esc(r.id || '') + '" data-t="' + esc(r.tipo) + '">' +
      '<i class="fas ' + r.icon + '"></i><span>' + esc(r.label) + '</span><span class="osr-type">' + r.tipo + '</span></button>'
    ).join('');
    resultsEl.style.display = 'block';
    resultsEl.querySelectorAll('.osr-item').forEach(b => {
      b.onclick = () => {
        resultsEl.style.display = 'none'; searchEl.value = '';
        const mod = b.dataset.mod, id = b.dataset.id, tipo = b.dataset.t;
        try {
          if (tipo === 'Producto') {
            if (window.navigateTo) window.navigateTo('ventas');
            setTimeout(() => { try { window.venderProductoDesdeBusqueda(id); } catch (e) {} }, 120);
          } else if (tipo === 'Cliente') {
            if (window.navigateTo) window.navigateTo(mod);
          } else {
            if (window.navigateTo) window.navigateTo(mod);
          }
        } catch (e) {}
      };
    });
  }

  /* ------------------------------------------------------ OBSERVER (núcleo) */
  function aplicarPiel() {
    document.body.classList.add('odoo-desktop');
    document.body.classList.add('hide-original-sidebar');
    if (!topbarEl) { buildTopbar(); buildLauncher(); }
  }

  function quitarPiel() {
    document.body.classList.remove('odoo-desktop');
    document.body.classList.remove('hide-original-sidebar');
    if (topbarEl) { topbarEl.remove(); topbarEl = null; }
    if (launcherEl) { launcherEl.remove(); launcherEl = null; }
    searchEl = null; resultsEl = null;
  }

  function detectarYVestir() {
    if (!esPC()) { quitarPiel(); return; }
    aplicarPiel();
    const root = document.getElementById('appRoot');
    if (!root) return;
    if (root.querySelector(selectorHomeOriginal)) {
      buildHome();
      tintarModulo(null); // en el home no hay módulo activo
    }
    else {
      const t = document.getElementById('tituloModule');
      if (t) {
        setModuloActual(t.textContent.trim());
        const id = idDeTitulo(t.textContent.trim());
        if (id) tintarModulo(id);
        else tintarModulo(null);
      }
    }
  }

  /* Envolver navegación para teñir el módulo al entrar con su color único.
     Se reemplazan a nivel de window solo si la app los expone (así la capa
     sigue siendo no intrusiva y funciona igual si cambiáis app.js). */
  function envolverNavegacion() {
    try {
      const origNav = window.navigateTo;
      const origBack = window.backToHome;
      if (typeof origNav === 'function') {
        window.navigateTo = function (mod) {
          let id = null;
          const m = MODULOS.find(x => x.id === mod) || MODULOS.find(x => SUBMODULOS[String(mod).toLowerCase()] === x.id);
          if (m) id = m.id; else if (typeof mod === 'string') {
            const t = idDeTitulo(mod);
            if (t) id = t;
          }
          if (id) tintarModulo(id);
          return origNav.apply(this, arguments);
        };
      }
      if (typeof origBack === 'function') {
        window.backToHome = function () {
          tintarModulo(null);
          return origBack.apply(this, arguments);
        };
      }
    } catch (e) {}
  }

  function arrancarObserver() {
    const root = document.getElementById('appRoot');
    if (!root || root.dataset.odooObs) return;
    root.dataset.odooObs = '1';
    new MutationObserver(() => detectarYVestir()).observe(root, { childList: true, subtree: true });
    // applyTheme() / toggleFondoOscuro resetean document.body.className (y borran
    // la clase odoo-desktop al cambiar de tema). Un sondeo discreto re-aplica la
    // piel solo cuando falta la clase (guarda contra bucles con app.js).
    setInterval(() => {
      if (esPC() && !document.body.classList.contains('odoo-desktop')) aplicarPiel();
    }, 400);
    detectarYVestir();
  }

  function init() {
    const esperar = setInterval(() => {
      const root = document.getElementById('appRoot');
      if (root && root.innerHTML && root.innerHTML.length > 0) {
        clearInterval(esperar);
        arrancarObserver();
        if (esPC()) aplicarPiel();
      }
    }, 150);
    window.addEventListener('resize', () => {
      setTimeout(detectarYVestir, 250); // después del resize handler de app.js (300ms)
    });
    envolverNavegacion();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();