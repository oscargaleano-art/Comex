const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwMM3g96L1ThGD6lXgO3Y9EmE3QGruBrSsO48PRl8Tm43gwIh--AL-yeCiuyfupSzyRRQ/exec';
const TABLAS = ['proveedores','pedidos','pedido_items','embarques','documentos','facturas','pagos','despachos'];

// Cache en memoria — todas las lecturas son síncronas desde aquí
const _cache = {};
TABLAS.forEach(t => _cache[t] = []);

function _parseRow(row) {
  const obj = {};
  for (const k in row) {
    let v = row[k];
    if (v === '' || v === null || v === undefined) { obj[k] = v === '' ? '' : null; continue; }
    if (['id','proveedor_id','pedido_id','embarque_id','factura_id',
         'importe','pagado','flete_importe','precio_unitario','cantidad',
         'importe_total','tipo_cambio','importe_gs'].includes(k)) {
      obj[k] = v === '' || v === null ? null : Number(v);
    } else if (k === 'activo') {
      obj[k] = v === true || v === 1 || v === '1' || v === 'true';
    } else {
      obj[k] = v;
    }
  }
  return obj;
}

async function _syncTabla(tabla) {
  await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ accion: 'guardar', tabla, datos: _cache[tabla] }),
    headers: { 'Content-Type': 'text/plain' }
  });
}

const DB = {
  _get(key) { return _cache[key] || []; },
  _set(key, data) {
    _cache[key] = data;
    _syncTabla(key).catch(err => console.warn('Sync Sheets error:', err));
  },
  _nextId(key) {
    const items = this._get(key);
    return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
  },
  now() { return new Date().toISOString(); },
  list(table, filters = {}) {
    let items = this._get(table);
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== '') items = items.filter(i => String(i[k]) === String(v));
    }
    return items;
  },
  get(table, id) {
    return this._get(table).find(i => i.id === Number(id)) || null;
  },
  insert(table, data) {
    const items = this._get(table);
    const item = { ...data, id: this._nextId(table), created_at: this.now(), updated_at: this.now() };
    items.push(item);
    this._set(table, items);
    return item.id;
  },
  update(table, id, data) {
    const items = this._get(table);
    const idx = items.findIndex(i => i.id === Number(id));
    if (idx >= 0) { items[idx] = { ...items[idx], ...data, updated_at: this.now() }; this._set(table, items); }
    return idx >= 0;
  },
  softDelete(table, id) { return this.update(table, id, { activo: false }); }
};

// Carga inicial desde Google Sheets
async function initDB() {
  const container = document.getElementById('view-container');
  if (container) container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:16px">
      <div style="width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#1a3a5c;border-radius:50%;animation:spin 0.8s linear infinite"></div>
      <p style="color:#64748b;font-size:14px">Conectando con Google Sheets...</p>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;

  try {
    const resultados = await Promise.all(
      TABLAS.map(tabla =>
        fetch(`${SCRIPT_URL}?tabla=${tabla}`)
          .then(r => r.json())
          .then(rows => ({ tabla, rows: rows.map(_parseRow) }))
          .catch(() => ({ tabla, rows: [] }))
      )
    );
    resultados.forEach(({ tabla, rows }) => {
      // Deduplicar por id
      const seen = new Set();
      _cache[tabla] = rows.filter(r => {
        if (!r.id || seen.has(r.id)) return false;
        seen.add(r.id); return true;
      });
    });
    console.log('Datos cargados desde Google Sheets');
  } catch (err) {
    console.warn('Error al cargar Sheets, usando caché local:', err);
    // Fallback: intentar localStorage
    TABLAS.forEach(t => {
      try {
        const local = localStorage.getItem('semar_' + t);
        if (local && !_cache[t].length) _cache[t] = JSON.parse(local);
      } catch {}
    });
  }
}

// API — misma interfaz para todas las vistas
const API = {
  getDashboard() {
    const proveedores = DB.list('proveedores').filter(p => p.activo);
    const pedidos = DB.list('pedidos');
    const embarques = DB.list('embarques');
    const facturas = DB.list('facturas');
    const documentos = DB.list('documentos');

    const pedidosActivos = pedidos.filter(p => !['ENTREGADO','CANCELADO'].includes(p.estado));
    const embarquesActivos = embarques.filter(e => e.estado !== 'ENTREGADO');
    const facturasPendientes = facturas.filter(f => ['PENDIENTE','PARCIAL'].includes(f.estado_pago));
    const deudaTotal = facturasPendientes.reduce((s, f) => s + (f.importe || 0), 0);

    const estadosCount = {};
    pedidos.forEach(p => { estadosCount[p.estado] = (estadosCount[p.estado] || 0) + 1; });
    const pedidos_por_estado = Object.entries(estadosCount).map(([estado, cantidad]) => ({ estado, cantidad }));

    const embActivos = embarquesActivos.slice(0, 10).map(e => {
      const pedido = e.pedido_id ? DB.get('pedidos', e.pedido_id) : null;
      const prov = pedido?.proveedor_id ? DB.get('proveedores', pedido.proveedor_id) : null;
      return { ...e, numero_oc: pedido?.numero_oc, proveedor_nombre: prov?.razon_social };
    }).sort((a, b) => (a.eta || '9999') < (b.eta || '9999') ? -1 : 1);

    const factPend = facturasPendientes.slice(0, 10).map(f => ({
      ...f,
      proveedor_nombre: f.proveedor_id ? DB.get('proveedores', f.proveedor_id)?.razon_social : null
    })).sort((a, b) => (a.fecha_vencimiento || '9999') < (b.fecha_vencimiento || '9999') ? -1 : 1);

    return {
      totales: { proveedores: proveedores.length, pedidos_activos: pedidosActivos.length, embarques_activos: embarquesActivos.length, deuda_total: deudaTotal },
      pedidos_por_estado, embarques_activos: embActivos, facturas_pendientes: factPend,
      documentos_pendientes: documentos.filter(d => d.estado === 'PENDIENTE').length
    };
  },

  getProveedores(filters = {}) {
    let items = DB.list('proveedores').filter(p => p.activo);
    if (filters.pais) items = items.filter(p => p.pais === filters.pais);
    return items.sort((a, b) => (a.razon_social||'').localeCompare(b.razon_social||''));
  },
  getProveedor(id) { return DB.get('proveedores', id); },
  saveProveedor(data, id = null) {
    if (id) { DB.update('proveedores', id, data); return id; }
    return DB.insert('proveedores', { ...data, activo: true });
  },
  deleteProveedor(id) { DB.softDelete('proveedores', id); },

  getPedidos(filters = {}) {
    let items = DB.list('pedidos');
    if (filters.estado) items = items.filter(p => p.estado === filters.estado);
    if (filters.proveedor_id) items = items.filter(p => String(p.proveedor_id) === String(filters.proveedor_id));
    return items.map(p => {
      const prov = p.proveedor_id ? DB.get('proveedores', p.proveedor_id) : null;
      return { ...p, proveedor_nombre: prov?.razon_social, proveedor_pais: prov?.pais };
    }).sort((a, b) => (b.fecha_emision||'') < (a.fecha_emision||'') ? -1 : 1);
  },
  getPedido(id) {
    const p = DB.get('pedidos', id);
    if (!p) return null;
    const prov = p.proveedor_id ? DB.get('proveedores', p.proveedor_id) : null;
    p.proveedor_nombre = prov?.razon_social; p.proveedor_pais = prov?.pais;
    p.items = DB.list('pedido_items').filter(i => i.pedido_id === Number(id));
    return p;
  },
  savePedido(data) {
    const { items, ...pedidoData } = data;
    const total = (items || []).reduce((s, i) => s + (i.cantidad * i.precio_unitario), 0);
    const id = DB.insert('pedidos', { ...pedidoData, estado: 'BORRADOR', importe_total: total });
    if (items) items.forEach(item => DB.insert('pedido_items', { ...item, pedido_id: id }));
    return id;
  },
  updatePedidoEstado(id, estado) { DB.update('pedidos', id, { estado }); },

  getEmbarques(filters = {}) {
    let items = DB.list('embarques');
    if (filters.estado) items = items.filter(e => e.estado === filters.estado);
    return items.map(e => {
      const pedido = e.pedido_id ? DB.get('pedidos', e.pedido_id) : null;
      const prov = pedido?.proveedor_id ? DB.get('proveedores', pedido.proveedor_id) : null;
      return { ...e, numero_oc: pedido?.numero_oc, proveedor_nombre: prov?.razon_social };
    }).sort((a, b) => (a.eta || '9999') < (b.eta || '9999') ? -1 : 1);
  },
  getEmbarque(id) {
    const e = DB.get('embarques', id);
    if (!e) return null;
    const pedido = e.pedido_id ? DB.get('pedidos', e.pedido_id) : null;
    const prov = pedido?.proveedor_id ? DB.get('proveedores', pedido.proveedor_id) : null;
    e.numero_oc = pedido?.numero_oc; e.proveedor_nombre = prov?.razon_social;
    e.documentos = DB.list('documentos').filter(d => d.embarque_id === Number(id));
    e.despacho = DB.list('despachos').find(d => d.embarque_id === Number(id)) || null;
    return e;
  },
  saveEmbarque(data) { return DB.insert('embarques', { ...data, estado: 'EN_TRANSITO' }); },
  updateEmbarqueEstado(id, estado, fecha_arribo_real) {
    DB.update('embarques', id, { estado, ...(fecha_arribo_real ? { fecha_arribo_real } : {}) });
  },

  getDocumentos(filters = {}) {
    let items = DB.list('documentos');
    if (filters.embarque_id) items = items.filter(d => String(d.embarque_id) === String(filters.embarque_id));
    if (filters.tipo_documento) items = items.filter(d => d.tipo_documento === filters.tipo_documento);
    if (filters.estado) items = items.filter(d => d.estado === filters.estado);
    return items.map(d => {
      const emb = d.embarque_id ? DB.get('embarques', d.embarque_id) : null;
      const ped = d.pedido_id ? DB.get('pedidos', d.pedido_id) : null;
      return { ...d, numero_embarque: emb?.numero_embarque, numero_oc: ped?.numero_oc };
    }).sort((a, b) => (b.created_at||'') < (a.created_at||'') ? -1 : 1);
  },
  saveDocumento(data) { return DB.insert('documentos', { ...data, estado: 'PENDIENTE' }); },
  updateDocumentoEstado(id, estado) { DB.update('documentos', id, { estado }); },

  getFacturas(filters = {}) {
    let items = DB.list('facturas');
    if (filters.estado_pago) items = items.filter(f => f.estado_pago === filters.estado_pago);
    if (filters.proveedor_id) items = items.filter(f => String(f.proveedor_id) === String(filters.proveedor_id));
    const pagos = DB.list('pagos');
    return items.map(f => {
      const prov = f.proveedor_id ? DB.get('proveedores', f.proveedor_id) : null;
      const ped = f.pedido_id ? DB.get('pedidos', f.pedido_id) : null;
      const pagado = pagos.filter(p => p.factura_id === f.id).reduce((s, p) => s + (p.importe||0), 0);
      return { ...f, proveedor_nombre: prov?.razon_social, numero_oc: ped?.numero_oc, pagado };
    }).sort((a, b) => (a.fecha_vencimiento || '9999') < (b.fecha_vencimiento || '9999') ? -1 : 1);
  },
  getFactura(id) {
    const f = DB.get('facturas', id);
    if (!f) return null;
    const prov = f.proveedor_id ? DB.get('proveedores', f.proveedor_id) : null;
    const ped = f.pedido_id ? DB.get('pedidos', f.pedido_id) : null;
    f.proveedor_nombre = prov?.razon_social; f.numero_oc = ped?.numero_oc;
    f.pagos = DB.list('pagos').filter(p => p.factura_id === Number(id));
    return f;
  },
  saveFactura(data) {
    const importe_gs = data.tipo_cambio ? data.importe * data.tipo_cambio : null;
    return DB.insert('facturas', { ...data, importe_gs, estado_pago: 'PENDIENTE' });
  },
  registrarPago(facturaId, pagoData) {
    DB.insert('pagos', { ...pagoData, factura_id: Number(facturaId) });
    const factura = DB.get('facturas', facturaId);
    const totalPagado = DB.list('pagos').filter(p => p.factura_id === Number(facturaId)).reduce((s, p) => s + (p.importe||0), 0);
    DB.update('facturas', facturaId, { estado_pago: totalPagado >= factura.importe ? 'PAGADO' : 'PARCIAL' });
  }
};
