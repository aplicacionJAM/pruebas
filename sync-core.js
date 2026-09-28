(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SyncCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var LIMPIAR = /\s+/g;

  function generarCodigo(n) {
    n = n || 4;
    var out = '';
    var arr = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(new Uint32Array(n)) : null;
    for (var i = 0; i < n; i++) {
      var r = arr ? arr[i] % ALFABETO.length : Math.floor(Math.random() * ALFABETO.length);
      out += ALFABETO.charAt(r);
    }
    return out;
  }

  function generarId(pref, len) {
    var s = '';
    var arr = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(new Uint32Array(len || 10)) : null;
    for (var i = 0; i < (len || 10); i++) {
      s += arr ? (arr[i] % 36).toString(36) : Math.floor(Math.random() * 36).toString(36);
    }
    return (pref || 'id') + '-' + s;
  }

  function ts(rec) {
    if (!rec) return 0;
    if (typeof rec.updatedAt === 'number' && rec.updatedAt > 0) return rec.updatedAt;
    var t = Date.parse(rec.updatedAt);
    return isNaN(t) ? 0 : t;
  }

  function construirIndice(storesObj, tombstones) {
    var rows = {};
    for (var s in storesObj) {
      rows[s] = [];
      var lista = storesObj[s] || [];
      for (var i = 0; i < lista.length; i++) {
        var r = lista[i];
        if (r && r.id) rows[s].push([r.id, ts(r)]);
      }
    }
    if (!tombstones) return { rows: rows, tombstones: [] };
    var limpias = [];
    for (var j = 0; j < tombstones.length; j++) {
      var t = tombstones[j];
      if (t && t.id && t.store) limpias.push([t.id, t.store, t.ts || 0]);
    }
    return { rows: rows, tombstones: limpias };
  }

  function indexarTombstones(lista) {
    var mapa = {};
    var arr = lista || [];
    for (var i = 0; i < arr.length; i++) {
      var t = arr[i];
      var clave = t.store + '|' + t.id;
      if (!mapa[clave] || t.ts > mapa[clave]) mapa[clave] = t.ts;
    }
    return mapa;
  }

  function calcularEnvio(idxLocalRows, idxRemotoRows, tombLocal, tombRemoto, tiendasComunes) {
    var enviar = {};
    var tiendas = tiendasComunes || Object.keys(idxRemotoRows || {});
    for (var t = 0; t < tiendas.length; t++) {
      var s = tiendas[t];
      var loc = idxLocalRows[s] || [];
      var rem = idxRemotoRows[s] || [];
      var mapLoc = new Map();
      for (var i = 0; i < loc.length; i++) mapLoc.set(loc[i][0], loc[i][1]);
      var env = [];
      for (var j = 0; j < rem.length; j++) {
        var id = rem[j][0], tsR = rem[j][1];
        var tsL = mapLoc.get(id);
        if (tsL === undefined) env.push(id);
        else if (tsL > tsR) env.push(id);
      }
      for (var k = 0; k < loc.length; k++) {
        var idL = loc[k][0];
        if (!mapLocB(rem, idL)) env.push(idL);
      }
      if (env.length) enviar[s] = env;
    }
    var tombEnviar = [];
    var mapRem = indexarTombstones(tombRemoto);
    var mapLoc = indexarTombstones(tombLocal);
    for (var clave in mapLoc) {
      var partes = clave.split('|');
      var ttsL = mapLoc[clave];
      var ttsR = mapRem[clave];
      if (ttsR === undefined) { tombEnviar.push([partes[1], partes[0], ttsL]); }
      else if (ttsL > ttsR) { tombEnviar.push([partes[1], partes[0], ttsL]); }
    }
    return { enviar: enviar, tombEnviar: tombEnviar };
  }

  function mapLocB(rows, id) {
    for (var i = 0; i < rows.length; i++) if (rows[i][0] === id) return true;
    return false;
  }

  function aplicarRegistro(mapa, rec) {
    if (!rec || !rec.id) return 'skip';
    var actual = mapa.get(rec.id);
    if (!actual) { mapa.set(rec.id, rec); return 'add'; }
    if (ts(rec) > ts(actual)) { mapa.set(rec.id, rec); return 'upd'; }
    return 'skip';
  }

  function aplicarTombstone(mapa, id, store, tts, tombstonesLocalMap) {
    var actual = mapa.get(id);
    var borrado = false;
    if (!actual) { borrado = true; }
    else if (typeof tts === 'number' && tts >= ts(actual)) { mapa.delete(id); borrado = true; }
    else if (tts === 0) { mapa.delete(id); borrado = true; }
    if (borrado) {
      var clave = store + '|' + id;
      var prev = tombstonesLocalMap[clave];
      if (prev === undefined || tts > prev) tombstonesLocalMap[clave] = tts;
    }
    return borrado;
  }

  function dividir(arr, n) {
    var chunks = [];
    for (var i = 0; i < arr.length; i += n) chunks.push(arr.slice(i, i + n));
    return chunks;
  }

  function codigoQr(texto) {
    if (!texto) return null;
    var p = ('' + texto).split('|');
    if (p[0] !== 'JAMPOS1' || p.length < 4) return null;
    return { ver: p[0], hubId: p[1], codigo: (p[2] || '').replace(LIMPIAR, ''), nombre: p[3] };
  }

  function armarQr(hubId, codigo, nombre) {
    return 'JAMPOS1|' + hubId + '|' + codigo + '|' + (nombre || '').replace(/\|/g, ' ');
  }

  function maxTsIdx(idxRows) {
    var max = 0;
    for (var s in idxRows) {
      var filas = idxRows[s];
      for (var i = 0; i < filas.length; i++) if (filas[i][1] > max) max = filas[i][1];
    }
    return max;
  }

  return {
    generarCodigo: generarCodigo,
    generarId: generarId,
    ts: ts,
    construirIndice: construirIndice,
    indexarTombstones: indexarTombstones,
    calcularEnvio: calcularEnvio,
    aplicarRegistro: aplicarRegistro,
    aplicarTombstone: aplicarTombstone,
    dividir: dividir,
    codigoQr: codigoQr,
    armarQr: armarQr,
    maxTsIdx: maxTsIdx
  };
});