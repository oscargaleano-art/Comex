// Base de datos local usando localStorage
const DB = {
  _get(key) {
    try { return JSON.parse(localStorage.getItem('semar_' + key) || '[]'); } catch { return []; }
  },
  _set(key, data) {
    localStorage.setItem('semar_' + key, JSON.stringify(data));
  },
  _nextId(key) {
    const items = this._get(key);
    return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
  },
  now() { return new Date().toISOString(); },

  // CRUD genérico
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
  softDelete(table, id) {
    return this.update(table, id, { activo: 0 });
  }
};

// API simulada — misma interfaz que la versión con servidor
const API = {
  // Dashboard
  getDashboard() {
    const proveedores = DB.list('proveedores', { activo: 1 });
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
      totales: {
        proveedores: proveedores.length,
        pedidos_activos: pedidosActivos.length,
        embarques_activos: embarquesActivos.length,
        deuda_total: deudaTotal
      },
      pedidos_por_estado,
      embarques_activos: embActivos,
      facturas_pendientes: factPend,
      documentos_pendientes: documentos.filter(d => d.estado === 'PENDIENTE').length
    };
  },

  // Proveedores
  getProveedores(filters = {}) {
    let items = DB.list('proveedores');
    if (filters.activo !== undefined) items = items.filter(p => p.activo === (filters.activo === 'true' || filters.activo === true ? 1 : 0));
    if (filters.pais) items = items.filter(p => p.pais === filters.pais);
    return items.sort((a, b) => a.razon_social.localeCompare(b.razon_social));
  },
  getProveedor(id) { return DB.get('proveedores', id); },
  saveProveedor(data, id = null) {
    if (id) { DB.update('proveedores', id, data); return id; }
    return DB.insert('proveedores', { ...data, activo: 1 });
  },
  deleteProveedor(id) { DB.softDelete('proveedores', id); },

  // Pedidos
  getPedidos(filters = {}) {
    let items = DB.list('pedidos');
    if (filters.estado) items = items.filter(p => p.estado === filters.estado);
    if (filters.proveedor_id) items = items.filter(p => String(p.proveedor_id) === String(filters.proveedor_id));
    return items.map(p => {
      const prov = p.proveedor_id ? DB.get('proveedores', p.proveedor_id) : null;
      return { ...p, proveedor_nombre: prov?.razon_social, proveedor_pais: prov?.pais };
    }).sort((a, b) => b.fecha_emision < a.fecha_emision ? -1 : 1);
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
    if (items) {
      items.forEach(item => DB.insert('pedido_items', { ...item, pedido_id: id }));
    }
    return id;
  },
  updatePedidoEstado(id, estado) { DB.update('pedidos', id, { estado }); },

  // Embarques
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
  saveEmbarque(data) {
    return DB.insert('embarques', { ...data, estado: 'EN_TRANSITO' });
  },
  updateEmbarqueEstado(id, estado, fecha_arribo_real) {
    DB.update('embarques', id, { estado, ...(fecha_arribo_real ? { fecha_arribo_real } : {}) });
  },

  // Documentos
  getDocumentos(filters = {}) {
    let items = DB.list('documentos');
    if (filters.embarque_id) items = items.filter(d => String(d.embarque_id) === String(filters.embarque_id));
    if (filters.tipo_documento) items = items.filter(d => d.tipo_documento === filters.tipo_documento);
    if (filters.estado) items = items.filter(d => d.estado === filters.estado);
    return items.map(d => {
      const emb = d.embarque_id ? DB.get('embarques', d.embarque_id) : null;
      const ped = d.pedido_id ? DB.get('pedidos', d.pedido_id) : null;
      return { ...d, numero_embarque: emb?.numero_embarque, numero_oc: ped?.numero_oc };
    }).sort((a, b) => b.created_at < a.created_at ? -1 : 1);
  },
  saveDocumento(data) {
    return DB.insert('documentos', { ...data, estado: 'PENDIENTE' });
  },
  updateDocumentoEstado(id, estado) { DB.update('documentos', id, { estado }); },

  // Facturas
  getFacturas(filters = {}) {
    let items = DB.list('facturas');
    if (filters.estado_pago) items = items.filter(f => f.estado_pago === filters.estado_pago);
    if (filters.proveedor_id) items = items.filter(f => String(f.proveedor_id) === String(filters.proveedor_id));
    const pagos = DB.list('pagos');
    return items.map(f => {
      const prov = f.proveedor_id ? DB.get('proveedores', f.proveedor_id) : null;
      const ped = f.pedido_id ? DB.get('pedidos', f.pedido_id) : null;
      const pagado = pagos.filter(p => p.factura_id === f.id).reduce((s, p) => s + p.importe, 0);
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
    const totalPagado = DB.list('pagos').filter(p => p.factura_id === Number(facturaId)).reduce((s, p) => s + p.importe, 0);
    const nuevoEstado = totalPagado >= factura.importe ? 'PAGADO' : 'PARCIAL';
    DB.update('facturas', facturaId, { estado_pago: nuevoEstado });
  }
};
