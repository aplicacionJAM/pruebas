(function () {
  'use strict';
  var C = window.SyncCore;
  if (!C) { console.error('[SYNC] sync-core.js no cargado'); return; }

  var TIENDAS = ['productos', 'clientes', 'proveedores', 'gastos', 'empleados', 'ventas', 'tasa_diaria', 'tickets', 'entregas'];
  var K_DEV = 'jampos_sync_device';
  var K_CIRCLE = 'jampos_sync_circle';
  var K_TOMB = 'jampos_sync_tombstones';
  var K_AUTO = 'jampos_sync_auto';
  var K_LOG = 'jampos_sync_log';
  var K_VISTOS = 'jampos_sync_vistos';

  function json(x) { return JSON.stringify(x); }
  function leer(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function grabar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function leerTomb() { return leer(K_TOMB, []); }
  function guardarTomb(arr) { grabar(K_TOMB, arr); }

  var D = null;
  var dispositivo = null;
  var circle = null;
  var peerActivo = null;
  var sesiones = new Map();
  var sincAutomatica = leer(K_AUTO, '1') === '1';
  var logArr = leer(K_LOG, []);
  var vistos = leer(K_VISTOS, []);
  var timerRecon = null;
  var romper = false;

  function devInit() {
    var d = leer(K_DEV, null);
    if (!d) {
      var ua = navigator.userAgent || '';
      var nombre = (ua.indexOf('Android') >= 0 ? 'Móvil' : (ua.indexOf('Electron') >= 0 ? 'PC' : 'Web')) + ' ' + C.generarCodigo(2);
      d = { id: C.generarId('dev', 8), nombre: nombre };
      grabar(K_DEV, d);
    }
    return d;
  }

  function addLog(msg, tipo) {
    logArr.push({ t: Date.now(), msg: msg, tipo: tipo || 'info' });
    logArr = logArr.slice(-60);
    try { grabar(K_LOG, logArr); } catch (e) {}
    if (window.renderSync) try { window.renderSync(); } catch (e) {}
    if (window.SYNC_MOSTRAR_LOG) window.SYNC_MOSTRAR_LOG(msg, tipo || 'info');
    console.log('[SYNC] ' + msg);
  }

  function notificar(msg, tipo) {
    try { if (window.mostrarNotificacion) window.mostrarNotificacion(msg, tipo || 'info'); } catch (e) {}
  }

  function vistazo(dev, nombre, ultima) {
    var ex = vistos.find(function (v) { return v.dev === dev; });
    if (ex) { ex.nombre = nombre || ex.nombre; ex.ultima = ultima || ex.ultima; }
    else vistos.push({ dev: dev, nombre: nombre || dev, ultima: ultima || null });
    try { grabar(K_VISTOS, vistos.slice(-30)); } catch (e) {}
  }

  function esperarApp(cb, n) {
    n = n || 0;
    if (window.D && window.jamLoadIDB) { D = window.D; cb(); return; }
    if (n > 60) return;
    setTimeout(function () { esperarApp(cb, n + 1); }, 150);
  }

  function cargarTienda(store) {
    if (D && Array.isArray(D[store]) && D[store].length) return Promise.resolve(D[store]);
    if (window.jamLoadIDB) return window.jamLoadIDB(store).catch(function () { return []; });
    return Promise.resolve([]);
  }

  function indicieStore(arr, store) {
    var o = {};
    o[store] = arr || [];
    return C.construirIndice(o, []).rows[store];
  }

  function mapaStore(arr) {
    var m = new Map();
    (arr || []).forEach(function (r) { if (r && r.id) m.set(r.id, r); });
    return m;
  }

  function estadoActual() {
    return {
      circle: circle,
      dispositivo: dispositivo,
      online: typeof navigator !== 'undefined' && 'onLine' in navigator ? navigator.onLine : true,
      sincAutomatica: sincAutomatica,
      sesiones: paresVistos(),
      vistos: vistos.slice(-30),
      peers: peerActivo ? peerActivo.id : null
    };
  }

  function idActualCirculo() {
    if (circle) return circle.hubPeerId || (peerActivo ? peerActivo.id : null) || null;
    return null;
  }

  function paresVistos() {
    var out = [];
    sesiones.forEach(function (s) {
      out.push({ dev: s.dev, nombre: s.nombre, online: true, ultima: s.ultima || null });
    });
    return out;
  }

  function RegistrarBorrado(store, id) {
    var t = leerTomb();
    var idx = t.findIndex(function (x) { return x.store === store && x.id === id; });
    var ts = Date.now();
    if (idx >= 0) t[idx].ts = ts; else t.push({ store: store, id: id, ts: ts });
    guardarTomb(t);
  }
  window._jamSyncRegistrarBorrado = RegistrarBorrado;

  function detenerPeer() {
    if (peerActivo) { try { peerActivo.destroy(); } catch (e) {} peerActivo = null; }
    sesiones.forEach(function (s) { try { s.conn.close(); } catch (e) {} });
    sesiones.clear();
  }

  function detenerTodo() {
    detenerPeer();
    if (timerRecon) { clearTimeout(timerRecon); timerRecon = null; }
  }

  function escucharComoHub() {
    if (peerActivo) detenerPeer();
    var opts = { debug: 0 };
    var idFijo = null;
    if (circle && circle.hubPeerId) idFijo = String(circle.hubPeerId);
    else if (window.SYNC_HUB_ID) idFijo = String(window.SYNC_HUB_ID);
    peerActivo = idFijo ? new Peer(idFijo, opts) : new Peer(opts);
    peerActivo.on('open', function (id) {
      if (circle) {
        circle.hubPeerId = id;
        grabar(K_CIRCLE, circle);
      }
      addLog('Círculo activo (Hub). ID: ' + id + ' | Código: ' + (circle ? circle.codigo : ''));
      if (window.SYNC_TEST) window.SYNC_TEST('hub-open', id, circle ? circle.codigo : '');
      if (window.renderSync) window.renderSync();
    });
    peerActivo.on('connection', function (conn) {
      if (window.SYNC_TEST) window.SYNC_TEST('hub-conn', conn.peer);
      var s = new Sesion(conn, { rol: 'hub', codigo: circle.codigo });
      conn.on('data', function (d) { var m = parse(d); if (m) s.onMsg(m); });
      conn.on('close', function () { sesiones.delete(conn.peer); if (window.renderSync) window.renderSync(); });
      conn.on('error', function () { sesiones.delete(conn.peer); });
      s.marcar(conn.peer);
    });
    peerActivo.on('error', function (err) {
      addLog('Hub error: ' + (err.type || err.message || ''), 'error');
      if (err.type === 'unavailable-id') programarReconexion();
      if (window.SYNC_TEST) window.SYNC_TEST('hub-error', err.type);
    });
  }

  function conectarse(id, codigo, intento) {
    intento = intento || 1;
    if (peerActivo) detenerPeer();
    addLog('Conectando al hub: ' + id);
    var peerIO = new Peer({ debug: 0 });
    peerActivo = peerIO;
    peerIO.on('open', function (idPropio) {
      if (idPropio && window.SYNC_TEST) window.SYNC_TEST('member-peer-open', idPropio);
      var conn = peerIO.connect(id, { reliable: true });
      var s = new Sesion(conn, { rol: 'member', codigo: codigo });
      conn.on('open', function () {
        addLog('Canal P2P abierto con el hub');
        s.conexionAbierta();
        s.marcar(id);
      });
      conn.on('data', function (d) { var m = parse(d); if (m) s.onMsg(m); });
      conn.on('close', function () {
        sesiones.delete(id);
        if (window.renderSync) window.renderSync();
        if (!romper && sincAutomatica && circle) programarReconexion(intento);
        if (window.SYNC_TEST) window.SYNC_TEST('conn-close', id);
      });
      conn.on('error', function (e) {
        addLog('Error de conexión: ' + (e && e.type ? e.type : e), 'error');
        if (!romper && sincAutomatica && circle) programarReconexion(intento);
      });
    });
    peerIO.on('error', function (err) {
      addLog('Peer error: ' + (err.type || err.message || ''), 'error');
      if (window.SYNC_TEST) window.SYNC_TEST('peer-error', err.type);
    });
  }

  function programarReconexion(intento) {
    intento = intento || 1;
    if (timerRecon) clearTimeout(timerRecon);
    if (romper) return;
    var espera = Math.min(30000, 12000 * intento);
    timerRecon = setTimeout(function () {
      if (!circle || romper) return;
      addLog('Reintentando conectar al hub... (' + intento + ')');
      if (!circle.soyHub) conectarse(circle.hubPeerId, circle.codigo, intento + 1);
      else escucharComoHub();
    }, espera);
  }

  function iniciarAuto() {
    romper = false;
    if (!circle) return;
    if (circle.soyHub) escucharComoHub();
    else conectarse(circle.hubPeerId, circle.codigo, 1);
  }

  function crearCirculo() {
    circle = {
      soyHub: true,
      hubPeerId: null,
      codigo: C.generarCodigo(4),
      nombre: dispositivo.nombre,
      creado: Date.now()
    };
    grabar(K_CIRCLE, circle);
    escucharComoHub();
    if (window.renderSync) window.renderSync();
  }

  function rotarCodigo() {
    if (circle) { circle.codigo = C.generarCodigo(4); grabar(K_CIRCLE, circle); }
    if (window.renderSync) window.renderSync();
  }

  function unirse(payloadQr, idManual, codigoManual) {
    var info = typeof payloadQr === 'string' ? C.codigoQr(payloadQr) : null;
    var id = info ? info.hubId : idManual;
    var codigo = info ? info.codigo : codigoManual;
    if (!id) { addLog('Debe escanear el QR o conocer el ID del círculo', 'error'); return; }
    circle = { soyHub: false, hubPeerId: id, codigo: codigo, nombre: info ? info.nombre : null, creado: Date.now() };
    grabar(K_CIRCLE, circle);
    romper = false;
    conectarse(id, codigo, 1);
    if (window.renderSync) window.renderSync();
  }

  function olvidarCirculo() {
    romper = true;
    detenerTodo();
    try { localStorage.removeItem(K_CIRCLE); } catch (e) {}
    circle = null;
    if (window.renderSync) window.renderSync();
  }

  function parse(t) {
    try { return JSON.parse(t); } catch (e) { return null; }
  }

  function Sesion(conn, opciones) {
    this.conn = conn;
    this.peer = conn.peer;
    this.rol = opciones.rol;
    this.esperado = opciones.codigo;
    this.dev = null;
    this.nombre = null;
    this.autenticado = false;
    this.envieIdx = false;
    this.misIndicesListos = false;
    this.envIdxDone = false;
    this.envTombDone = false;
    this.envRec = {};
    this.idxParcial = {};
    this.idxBufe = {};
    this.idxTerminados = {};
    this.idxStoresDone = 0;
    this.tombBufe = [];
    this.tombRecibido = false;
    this.recBufe = {};
    this.flagsRec = {};
    this.maps = null;
    this.pendDirty = new Set();
    this.stats = { add: 0, upd: 0, del: 0 };
    this.ultima = null;
    this.cerrado = false;
    this.miDone = false;
    this.peerDone = false;
  }

  Sesion.prototype.marcar = function (clave) {
    var self = this;
    sesiones.set(clave, self);
  };

  Sesion.prototype.enviar = function (m) {
    try { this.conn.send(json(m)); } catch (e) {}
  };

  Sesion.prototype.onMsg = function (m) {
    if (!this.autenticado) {
      if (m.t === 'hello') return this.helloR(m);
      if (m.t === 'welcome') return this.welcomeR(m);
      if (m.t === 'deny') return this.denyR(m);
      if (m.t === 'welcome') this.welcomeR(m);
      return;
    }
    if (m.t === 'idx') return this.idxR(m);
    if (m.t === 'deltomb') return this.tombR(m);
    if (m.t === 'rec') return this.recR(m);
    if (m.t === 'done') return this.doneR(m);
    if (m.t === 'ping') this.enviar({ t: 'pong', at: m.at });
  };

  Sesion.prototype.conexionAbierta = function () {
    this.enviar({ t: 'hello', ver: 1, dev: dispositivo.id, nombre: dispositivo.nombre, codigo: circle ? circle.codigo : '' });
  };

  Sesion.prototype.helloR = function (m) {
    if (m.codigo !== this.esperado) { this.enviar({ t: 'deny', msg: 'codigo' }); try { this.conn.close(); } catch (e) {} return; }
    this.autenticado = true;
    this.dev = m.dev;
    this.nombre = m.nombre;
    vistazo(m.dev, m.nombre);
    addLog('Dispositivo unido: ' + m.nombre);
    if (window.SYNC_TEST) window.SYNC_TEST('hub-joined', m.nombre);
    this.enviar({ t: 'welcome', nombre: dispositivo.nombre, dev: dispositivo.id });
    this.iniciar();
  };

  Sesion.prototype.welcomeR = function (m) {
    this.autenticado = true;
    this.dev = m.dev;
    this.nombre = m.nombre;
    vistazo(m.dev, m.nombre);
    addLog('Conectado al círculo de: ' + m.nombre);
    if (window.SYNC_TEST) window.SYNC_TEST('member-welcome', m.nombre);
    this.iniciar();
  };

  Sesion.prototype.denyR = function () {
    addLog('Emparejamiento rechazado: código inválido (¿pasó 90s?)', 'error');
    try { this.conn.close(); } catch (e) {}
  };

  Sesion.prototype.iniciar = function () {
    var self = this;
    if (this.envieIdx) return;
    this.envieIdx = true;
    var pendientes = TIENDAS.length;
    this.idxParcial = {};
    TIENDAS.forEach(function (s) {
      cargarTienda(s).then(function (arr) {
        self.idxParcial[s] = indicieStore(arr, s);
        pendientes--;
        if (pendientes === 0) { self.misIndicesListos = true; self.emiteIndices(); }
      });
    });
  };

  Sesion.prototype.emiteIndices = function () {
    var self = this;
    TIENDAS.forEach(function (s) {
      var filas = self.idxParcial[s] || [];
      if (window.SYNC_TEST) window.SYNC_TEST('idx-emit', s, filas.length);
      var chunks = C.dividir(filas, 600);
      chunks.forEach(function (ch) { self.enviar({ t: 'idx', store: s, rows: ch, last: 0 }); });
      self.enviar({ t: 'idx', store: s, rows: [], last: 1 });
    });
    this.envIdxDone = true;
    var trows = leerTomb().map(function (t) { return [t.id, t.store, t.ts]; });
    var tchunks = C.dividir(trows, 600);
    tchunks.forEach(function (ch) { self.enviar({ t: 'deltomb', rows: ch, last: 0 }); });
    this.enviar({ t: 'deltomb', rows: [], last: 1 });
    this.envTombDone = true;
    this.revisarEstado();
  };

  Sesion.prototype.idxR = function (m) {
    var self = this;
    if (!this.idxBufe[m.store]) this.idxBufe[m.store] = [];
    if (!m.last) { this.idxBufe[m.store] = this.idxBufe[m.store].concat(m.rows); return; }
    if (this.idxTerminados[m.store]) return;
    this.idxTerminados[m.store] = true;
    this.idxBufe[m.store] = this.idxBufe[m.store].concat(m.rows);
    this.idxStoresDone++;
    if (this.idxStoresDone === TIENDAS.length) this.consumirIdx();
  };

  Sesion.prototype.consumirIdx = function () {
    var self = this;
    TIENDAS.forEach(function (s) { self.compararPara(s); });
    if (window.renderSync) window.renderSync();
  };

  Sesion.prototype.compararPara = function (s) {
    var self = this;
    var misFilas = this.idxParcial[s] || [];
    var susFilas = this.idxBufe[s] || [];
    var porEnviar = [];
    var mapR = new Map(susFilas);
    var mapL = new Map(misFilas);
    misFilas.forEach(function (f) {
      var tsR = mapR.get(f[0]);
      if (tsR === undefined) porEnviar.push(f[0]);
      else if (f[1] > tsR) porEnviar.push(f[0]);
    });
    if (!porEnviar.length) {
      if (window.SYNC_TEST) window.SYNC_TEST('idx-compare', s, 0);
      this.enviar({ t: 'rec', store: s, items: [], last: 1 });
      this.envRec[s] = true;
      this.revisarEstado();
      return;
    }
    if (window.SYNC_TEST) window.SYNC_TEST('idx-compare', s, porEnviar.length);
    cargarTienda(s).then(function (arr) {
      var porId = new Map(arr.map(function (r) { return [r.id, r]; }));
      var items = [];
      porEnviar.forEach(function (id) { var rec = porId.get(id); if (rec) items.push(rec); });
      var chunks = C.dividir(items, 120);
      chunks.forEach(function (ch) { self.enviar({ t: 'rec', store: s, items: ch, last: 0 }); });
      self.enviar({ t: 'rec', store: s, items: [], last: 1 });
      self.envRec[s] = true;
      if (items.length) addLog('Enviando ' + items.length + ' de ' + s);
      self.revisarEstado();
    });
  };

  Sesion.prototype.tombR = function (m) {
    var self = this;
    if (!m.last) { this.tombBufe = this.tombBufe.concat(m.rows); return; }
    if (this.tombRecibido) return;
    this.tombRecibido = true;
    this.flushTomb();
  };

  Sesion.prototype.flushTomb = function () {
    var self = this;
    var filas = this.tombBufe;
    this.tombBufe = [];
    if (!filas.length) { this.flushTombListo(); return; }
    this.cargarMapas().then(function (maps) {
      var tmap = C.indexarTombstones(leerTomb());
      filas.forEach(function (f) {
        var store = f[1], id = f[0], tts = f[2] || 0;
        var mm = maps[store];
        if (!mm) return;
        var antes = mm.get(id);
        if (C.aplicarTombstone(mm, id, store, tts, tmap)) {
          self.stats.del++;
          self.pendDirty.add(store);
          if (antes) addLog('Borrado remoto aplicado en ' + store);
        }
      });
      guardarTomb(Object.keys(tmap).map(function (k) { var p = k.split('|'); return { id: p[1], store: p[0], ts: tmap[k] }; }));
      self.flushDirty();
      self.flushTombListo();
    });
  };

  Sesion.prototype.flushTombListo = function () {
    this.tombRecibido = true;
    this.revisarEstado();
  };

  Sesion.prototype.recR = function (m) {
    var self = this;
    if (!this.recBufe[m.store]) this.recBufe[m.store] = [];
    if (!m.last) { this.recBufe[m.store] = this.recBufe[m.store].concat(m.items); return; }
    if (this.flagsRec[m.store]) return;
    this.flagsRec[m.store] = true;
    this.flushRec(m.store);
  };

  Sesion.prototype.flushRec = function (s) {
    var self = this;
    var items = this.recBufe[s] || [];
    this.recBufe[s] = [];
    if (!items.length) { this.revisarEstado(); return; }
    this.cargarMapas().then(function (maps) {
      var mm = maps[s];
      items.forEach(function (rec) {
        var r = C.aplicarRegistro(mm, rec);
        if (r === 'add') self.stats.add++;
        else if (r === 'upd') self.stats.upd++;
      });
      self.pendDirty.add(s);
      self.flushDirty();
      addLog('Recibidos ' + items.length + ' de ' + s);
      self.revisarEstado();
    });
  };

  Sesion.prototype.cargarMapas = function () {
    var self = this;
    if (this.maps) return Promise.resolve(this.maps);
    var cargas = TIENDAS.map(function (s) {
      return cargarTienda(s).then(function (arr) { var o = {}; o[s] = mapaStore(arr); return o; });
    });
    return Promise.all(cargas).then(function (outs) {
      var m = {};
      outs.forEach(function (o) { for (var s in o) m[s] = o[s]; });
      self.maps = m;
      return m;
    });
  };

  Sesion.prototype.flushDirty = function () {
    var self = this;
    if (!this.maps || !this.pendDirty.size) return;
    var sucios = Array.from(this.pendDirty);
    this.pendDirty = new Set();
    sucios.forEach(function (s) {
      var arr = Array.from((self.maps[s] || new Map()).values());
      if (D) D[s] = arr;
      if (window.jamSaveIDB) window.jamSaveIDB(s, arr).catch(function (e) { console.warn('[SYNC] save', s, e); });
    });
    if (window.jamRefrescarModuloActual) try { window.jamRefrescarModuloActual(); } catch (e) {}
  };

  Sesion.prototype.revisarEstado = function () {
    if (!this.misIndicesListos || !this.envIdxDone || !this.envTombDone) return;
    var envRecListo = true;
    TIENDAS.forEach(function (s) { if (!this.envRec[s]) envRecListo = false; }, this);
    var recTodos = true;
    TIENDAS.forEach(function (s) { if (!this.flagsRec[s]) recTodos = false; }, this);
    var recibiTodo = this.idxStoresDone >= TIENDAS.length && recTodos && this.tombRecibido;
    if (envRecListo && recibiTodo) {
      this.miDone = true;
      this.enviar({ t: 'done' });
      this.cerrarFinal();
    }
  };

  Sesion.prototype.cerrarFinal = function () {
    var self = this;
    if (this.cerrado) return;
    this.cerrado = true;
    setTimeout(function () {
      try { self.conn.close(); } catch (e) {}
    }, 900);
  };

  Sesion.prototype.doneR = function () {
    if (this.peerDone) return;
    this.peerDone = true;
    this.ultima = Date.now();
    addLog('Sincronización completa (+' + this.stats.add + ' / ~' + this.stats.upd + ' / -' + this.stats.del + ')');
    notificar('Sincronizado: +' + this.stats.add + ' ✔', 'success');
    if (window.SYNC_TEST) window.SYNC_TEST('sync-done', this.stats);
    if (this.dev) vistazo(this.dev, this.nombre, this.ultima);
    if (window.renderSync) window.renderSync();
    this.cerrarFinal();
  };

  function CamaraQR() { this.video = null; this.stream = null; this.fin = false; }

  CamaraQR.prototype.abrir = function (canvas, video, cb) {
    var self = this;
    self.intentos = 0;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addLog('Cámara no disponible en este dispositivo (use el modo manual)', 'error');
      cb(null);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (stream) {
        self.stream = stream;
        video.srcObject = stream;
        video.play();
        var ctx = canvas.getContext('2d');
        var tick = function () {
          if (self.fin) return;
          self.intentos = (self.intentos || 0) + 1;
          if (video.readyState >= 2 && video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
              var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              var out = window.jsQR ? jsQR(img.data, img.width, img.height) : null;
              if (out && out.data) { self.fin = true; cb(out.data, self); return; }
            } catch (e) {}
          }
          if (self.intentos === 50) addLog('Escáner activo: acerca el QR del equipo principal y procura buena luz', 'info');
          setTimeout(tick, 200);
        };
        tick();
      })
      .catch(function () { addLog('No se pudo abrir la cámara (permisos/HTTPS)', 'error'); cb(null, self); });
  };

  CamaraQR.prototype.cerrar = function () {
    this.fin = true;
    if (this.stream) { try { this.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }
  };

  var scanCamara = new CamaraQR();

  function abrirModalQR() {
    var cont = document.getElementById('QRModal');
    return cont;
  }

  function renderSync() {
    if (typeof currentModule === 'undefined' || currentModule !== 'sync') return;
    if (!D) return;
    var accent = D.config.theme || '#3b82f6';
    var root = document.getElementById('appRoot');
    if (!root) return;
    var est = estadoActual();
    var tieneCirculo = !!est.circle;
    var esHub = tieneCirculo && est.circle.soyHub;
    root.innerHTML = `
      <div class="page-header-fixed"><div class="module-header">
        <div class="flex items-center" style="min-width:0">
          <h2 id="tituloModule" class="module-title" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Sincronizar')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Sincronizar</h2>
        </div>
        <div id="btnVolverModule" class="btn-back" onclick="backToHome()"><i class="fas fa-arrow-left"></i> Volver</div>
      </div></div>
      <div class="max-w-xl mx-auto pt-4" style="padding-bottom:120px">
        <div class="rounded-2xl p-4 mb-3" style="border:1px solid ${accent}33;background:${accent}0d">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs opacity-70">ESTE DISPOSITIVO</p>
              <p class="font-bold">${esc(est.dispositivo.nombre)} <span class="text-xs opacity-50">(${esc(est.dispositivo.id)})</span></p>
              <p class="text-xs opacity-70 mt-1">${est.online ? 'Internet: disponible' : 'Internet: sin conexión'}</p>
            </div>
            <div class="text-right">
              <p class="text-xs opacity-70">ID de círculo</p>
              <p class="font-mono text-sm" style="color:${accent}">${tieneCirculo ? esc(idActualCirculo() || 'generando…') : '—'}</p>
            </div>
          </div>
        </div>

        ${!tieneCirculo ? `
          <div class="rounded-2xl p-4 mb-3" style="border:1px solid ${accent}33;background:${accent}0d">
            <h3 class="font-bold mb-2 text-base">No hay círculo aún</h3>
            <p class="text-xs opacity-75 mb-3">Crea el círculo en el equipo que pasará más tiempo encendido (la PC), luego únete desde los demás dispositivos escaneando el QR.</p>
            <div class="flex gap-2" style="flex-wrap:wrap">
              <button class="btn" style="background:${accent};color:#fff" onclick="window.SyncUI.crear()"><i class="fas fa-qrcode"></i> Crear círculo (primer equipo)</button>
              <button class="btn" style="border:1px solid ${accent};color:${accent}" onclick="window.SyncUI.unirse()"><i class="fas fa-camera"></i> Unirme escaneando QR</button>
            </div>
          </div>
        ` : `
          <div class="rounded-2xl p-4 mb-3 text-center" style="border:1px solid ${accent}33;background:#fff">
            <h3 class="font-bold mb-1">${esHub ? 'Tu círculo está activo' : 'Vinculado a: ' + esc(est.circle.nombre || est.circle.hubPeerId)}</h3>
            ${esHub ? `
              <div id="syncQRContainer" class="flex flex-col items-center mt-2">
                <canvas id="syncQR"></canvas>
                <p class="font-mono text-xl font-black mt-2" style="color:${accent}" id="syncQRCode">${esc(est.circle.codigo)}</p>
                <p class="text-xs opacity-60 mt-1">Escanea el QR o escribe el código para unir tu otro dispositivo.</p>
                <div class="flex gap-2 mt-2">
                  <button class="btn" style="font-size:12px;border:1px solid ${accent};color:${accent}" onclick="window.SyncUI.rotar()">Rotar código</button>
                </div>
              </div>
            ` : `
              <p class="text-xs opacity-70 mt-1">Se reconecta automáticamente mientras ambos estén encendidos.</p>
              <button class="btn mt-2" style="background:${accent};color:#fff" onclick="window.SyncUI.sincronizarAhora()"><i class="fas fa-sync-alt"></i> Sincronizar ahora</button>
            `}
          </div>
          <button class="btn w-full mt-1" style="border:1px solid #f87171;color:#f87171" onclick="window.SyncUI.olvidar()"><i class="fas fa-unlink"></i> Olvidar círculo</button>
        `}

        <div class="rounded-2xl p-4 mb-3" style="border:1px solid ${accent}33;background:${accent}0d">
          <div class="flex items-center justify-between">
            <p class="font-bold text-sm">Sincronización automática</p>
            <label class="inline-flex items-center gap-2"><span class="text-xs">${sincAutomatica ? 'Activada' : 'Desactivada'}</span><input type="checkbox" ${sincAutomatica ? 'checked' : ''} onchange="window.SyncUI.auto(this.checked)"></label>
          </div>
        </div>

        <div class="rounded-2xl p-4 mb-3" style="border:1px solid ${accent}33;background:${accent}0d">
          <p class="font-bold text-sm mb-2">Dispositivos del círculo</p>
          ${paresVistos().length ? paresVistos().map(function (p) {
            return `<div class="flex justify-between text-sm py-1"><span>${esc(p.nombre)}</span><span class="text-xs opacity-60">${p.online ? '● online' : ''}</span></div>`;
          }).join('') : '<p class="text-xs opacity-50">Aún ninguno conectado.</p>'}
        </div>

        <div class="rounded-2xl p-3" style="border:1px solid ${accent}33;background:#0b1220;color:#9db4d0">
          <p class="text-xs font-bold mb-1" style="color:#60a5fa">REGISTRO</p>
          <div id="syncLog" class="font-mono text-[10px]" style="max-height:140px;overflow:auto">
            ${logArr.slice(-25).reverse().map(function (l) { return `<div>${l.tipo === 'error' ? '⚠' : '·'} ${esc((l.msg || ''))}</div>`; }).join('') || '<div>Sin eventos.</div>'}
          </div>
        </div>
      </div>
    `;
    window.SYNC_MOSTRAR_LOG = null;
    window.SYNC_MOSTRAR_LOG = function (msg) {
      var el = document.getElementById('syncLog');
      if (el && window.currentModule === 'sync') {
        el.insertAdjacentHTML('afterbegin', '<div>· ' + esc(msg) + '</div>');
      }
    };
    if (esHub) {
      var hubId = idActualCirculo();
      var qrCont = document.getElementById('syncQRContainer');
      if (!hubId) {
        qrCont.insertAdjacentHTML('afterbegin', '<p class="text-xs" style="background:rgba(250,204,21,.12);border:1px dashed #facc15;border-radius:10px;padding:8px">Generando ID de conexión… (espera unos segundos)</p>');
      } else if (typeof qrcode !== 'undefined') {
        try {
          var payload = C.armarQr(hubId, est.circle.codigo, dispositivo.nombre);
          var qr = qrcode(0, 'M');
          qr.addData(payload);
          qr.make();
          var dataUrl = qr.createDataURL(4, 6);
          var img = document.createElement('img');
          img.src = dataUrl;
          img.alt = 'QR';
          img.style.cssText = 'width:184px;height:184px;image-rendering:pixelated';
          qrCont.prepend(img);
        } catch (e) { addLog('QR no disponible aquí (use el ID para unirse manualmente)', 'error'); }
      } else {
        qrCont.insertAdjacentHTML('afterbegin', '<p class="text-xs opacity-70">QR no disponible en esta vista. Usa el ID de abajo en "Escribir ID del círculo".</p>');
      }
      if (hubId) {
        qrCont.insertAdjacentHTML('beforeend', '<p class="text-[10px] opacity-60 mt-2" style="word-break:break-all">ID: <span class="font-mono">' + esc(hubId) + '</span></p>');
        qrCont.insertAdjacentHTML('beforeend', '<button class="btn" style="font-size:12px;border:1px solid ' + accent + ';color:' + accent + '" onclick="window.SyncUI._copiarId()"><i class="fas fa-copy"></i> Copiar ID</button>');
      }
    }
  }

  function esc(x) {
    return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  window.SyncUI = {
    _unirseDirecto: function (qr, id, code) { unirse(qr, id, code); },
    _copiarId: function () {
      var id = idActualCirculo();
      if (!id) { notificar('El ID aún se está generando', 'info'); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          navigator.clipboard.writeText(id).then(function () { notificar('ID copiado al portapapeles', 'success'); }).catch(function () { try { window.prompt('ID del círculo', id); } catch (e) {} });
        } catch (e) {}
      } else {
        try { window.prompt('ID del círculo (cópiame)', id); } catch (e) {}
      }
    },
    crear: function () { crearCirculo(); },
    unirse: function () {
      var puedeCamara = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      var modal = document.createElement('div');
      modal.className = 'backup-popup-fondo';
      var accent = (D && D.config && D.config.theme) || '#3b82f6';
      modal.innerHTML = `
        <div class="backup-popup">
          <h3 class="text-lg" style="color:${accent}">Unirme a un círculo</h3>
          ${puedeCamara ? `<video id="scanQRVideo" muted playsinline style="width:100%;border-radius:12px;max-height:200px;background:#000"></video><canvas id="scanQRCanvas" hidden></canvas>` : ''}
          <p class="text-xs opacity-70 mt-2">${puedeCamara ? 'Escanea el QR del equipo principal…' : 'La cámara no está disponible.'}</p>
          <div class="flex flex-col gap-2 mt-3">
            <button class="btn" style="background:${accent};color:#fff;font-size:14px" onclick="window.SyncUI.unirseTecleando()"><i class="fas fa-keyboard"></i> Escribir ID del círculo</button>
            <button class="btn" style="border:1px solid #666;color:#666;font-size:14px" onclick="window.SyncUI._cerrarModal()">Cancelar</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      window._syncModal = modal;
      window._syncScan = null;
      if (puedeCamara) {
        var vid = modal.querySelector('#scanQRVideo');
        var cv = modal.querySelector('#scanQRCanvas');
        var cb = function (texto, cam) {
          try { modal.remove(); } catch (e) {}
          if (cam) cam.cerrar();
          if (texto) unirse(texto);
          else addLog('No se detectó ningún QR', 'error');
        };
        scanCamara.abrir(cv, vid, cb);
      }
      window.SyncUI._cerrarModal = function () {
        try { if (window._syncScan) window._syncScan.cerrar(); } catch (e) {}
        try { modal.remove(); } catch (e) {}
        if (scanCamara) scanCamara.cerrar();
      };
    },
    unirseTecleando: function () {
      var modal = window._syncModal;
      var accent = (D && D.config && D.config.theme) || '#3b82f6';
      if (modal) { try { modal.remove(); } catch (e) {} } else modal = null;
      scanCamara.cerrar();
      var p2 = document.createElement('div');
      p2.className = 'backup-popup-fondo';
      p2.innerHTML = `
        <div class="backup-popup">
          <h3 class="text-lg" style="color:${accent}">Escribir ID del círculo</h3>
          <p class="text-xs opacity-70">Solo los dispositivos con el código correcto pueden unirse.</p>
          <input id="syncIdInput" placeholder="Ej: fue3k2m9q7 (ID visible en el equipo principal)" class="w-full mt-2 p-2 rounded-xl border-2 font-mono text-sm" style="border-color:${accent}">
          <input id="syncCodeInput" placeholder="Código de 4 caracteres" class="w-full mt-2 p-2 rounded-xl border-2 font-mono text-sm" style="border-color:${accent}">
          <div class="flex gap-2 mt-3">
            <button class="btn" style="background:${accent};color:#fff;font-size:14px" onclick="window.SyncUI._aceptarManual()">Vincular</button>
            <button class="btn" style="border:1px solid #666;color:#666;font-size:14px" onclick="window.SyncUI._cerrarMan()">Cancelar</button>
          </div>
        </div>`;
      document.body.appendChild(p2);
      window._syncModal2 = p2;
      window.SyncUI._aceptarManual = function () {
        var id = (document.getElementById('syncIdInput').value || '').trim();
        var code = (document.getElementById('syncCodeInput').value || '').trim();
        try { p2.remove(); } catch (e) {}
        if (!id) { notificar('El ID no puede estar vacío', 'error'); return; }
        unirse(null, id, code);
      };
      window.SyncUI._cerrarMan = function () { try { p2.remove(); } catch (e) {} };
    },
    auto: function (v) { sincAutomatica = !!v; grabar(K_AUTO, sincAutomatica ? '1' : '0'); if (sincAutomatica) iniciarAuto(); else { romper = true; detenerTodo(); } if (window.renderSync) window.renderSync(); },
    sincronizarAhora: function () { if (circle && !circle.soyHub) conectarse(circle.hubPeerId, circle.codigo, 1); },
    rotar: function () { rotarCodigo(); },
    olvidar: function () { olvidarCirculo(); },
    estado: estadoActual,
    _circ: function () { return circle; }
  };

  window.renderSync = renderSync;

  window.addEventListener('online', function () { addLog('Internet disponible'); if (circle && sincAutomatica) iniciarAuto(); });
  window.addEventListener('offline', function () { addLog('Sin internet (quedan pendientes los cambios locales)'); });

  esperarApp(function () {
    dispositivo = devInit();
    circle = leer(K_CIRCLE, null);
    if (circle && sincAutomatica) iniciarAuto();
    if (window.SYNC_READY) try { window.SYNC_READY(); } catch (e) {}
  });
})();