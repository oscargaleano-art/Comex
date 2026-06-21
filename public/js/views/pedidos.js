function viewPedidos() {
  document.getElementById('page-title').textContent = 'Pedidos / Órdenes de Compra';
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-primary" onclick="formNuevoPedido()">
      <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      Nueva OC
    </button>`;
  renderTablaPedidos();
}

function renderTablaPedidos() {
  const pedidos = API.getPedidos();
  window._pedidos = pedidos;
  const estados = ['','BORRADOR','CONFIRMADO','EN_PRODUCCION','EMBARCADO','EN_ADUANA','ENTREGADO','CANCELADO'];

  document.getElementById('view-container').innerHTML = `
    <div class="filter-bar">
      <input type="search" id="buscar-ped" placeholder="Buscar OC o proveedor..." oninput="filtrarPedidos()" style="max-width:260px">
      <select id="filtro-estado-ped" onchange="filtrarPedidos()">
        ${estados.map(e=>`<option value="${e}">${e||'Todos los estados'}</option>`).join('')}
      </select>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table id="tabla-pedidos">
          <thead><tr><th>N° OC</th><th>Proveedor</th><th>País</th><th>Fecha</th><th>Entrega est.</th><th>Incoterm</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>${renderPedidosRows(pedidos)}</tbody>
        </table>
      </div>
    </div>`;
}

function renderPedidosRows(peds) {
  if (!peds.length) return `<tr><td colspan="9"><div class="empty-state"><p>No hay pedidos registrados</p></div></td></tr>`;
  return peds.map(p=>`
    <tr>
      <td><strong>${p.numero_oc}</strong></td><td>${p.proveedor_nombre||'—'}</td><td>${p.proveedor_pais||'—'}</td>
      <td>${fmtDate(p.fecha_emision)}</td><td>${fmtDate(p.fecha_entrega_estimada)}</td>
      <td>${p.incoterm||'—'}</td><td>${fmtMoney(p.importe_total,p.moneda)}</td>
      <td>${badge(p.estado)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="verPedido(${p.id})">Ver</button>
        <button class="btn btn-ghost btn-sm" onclick="cambiarEstadoPedido(${p.id},'${p.estado}')">Estado</button>
      </td>
    </tr>`).join('');
}

function filtrarPedidos() {
  const buscar = document.getElementById('buscar-ped').value.toLowerCase();
  const estado = document.getElementById('filtro-estado-ped').value;
  const filtrado = window._pedidos.filter(p=>
    (!buscar||p.numero_oc.toLowerCase().includes(buscar)||(p.proveedor_nombre||'').toLowerCase().includes(buscar))&&
    (!estado||p.estado===estado));
  document.querySelector('#tabla-pedidos tbody').innerHTML = renderPedidosRows(filtrado);
}

function verPedido(id) {
  const p = API.getPedido(id);
  const itemsHtml = p.items&&p.items.length ? `
    <table style="margin-top:8px">
      <thead><tr><th>Código</th><th>Descripción</th><th>Cant.</th><th>Unidad</th><th>P.Unit.</th><th>Importe</th></tr></thead>
      <tbody>${p.items.map(i=>`<tr><td>${i.codigo_producto||'—'}</td><td>${i.descripcion}</td>
        <td>${i.cantidad}</td><td>${i.unidad||'UN'}</td>
        <td>${fmtMoney(i.precio_unitario,p.moneda)}</td>
        <td>${fmtMoney(i.cantidad*i.precio_unitario,p.moneda)}</td></tr>`).join('')}</tbody>
    </table>` : '<p style="color:var(--color-text-muted);font-size:13px">Sin ítems</p>';

  openModal(`OC ${p.numero_oc}`, `
    <div class="detail-grid" style="margin-bottom:16px">
      <div class="detail-item"><div class="detail-label">Proveedor</div><div class="detail-value">${p.proveedor_nombre||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Estado</div><div class="detail-value">${badge(p.estado)}</div></div>
      <div class="detail-item"><div class="detail-label">Fecha emisión</div><div class="detail-value">${fmtDate(p.fecha_emision)}</div></div>
      <div class="detail-item"><div class="detail-label">Entrega estimada</div><div class="detail-value">${fmtDate(p.fecha_entrega_estimada)}</div></div>
      <div class="detail-item"><div class="detail-label">Incoterm</div><div class="detail-value">${p.incoterm||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Puerto origen</div><div class="detail-value">${p.puerto_origen||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Total</div><div class="detail-value" style="font-weight:700">${fmtMoney(p.importe_total,p.moneda)}</div></div>
    </div>
    ${p.observaciones?`<p style="margin-bottom:12px;font-size:13px;color:var(--color-text-muted)">${p.observaciones}</p>`:''}
    <div class="card-title" style="margin-bottom:8px">Ítems</div>${itemsHtml}`);
}

function cambiarEstadoPedido(id, estadoActual) {
  const estados = ['BORRADOR','CONFIRMADO','EN_PRODUCCION','EMBARCADO','EN_ADUANA','ENTREGADO','CANCELADO'];
  openModal('Cambiar estado', `
    <div class="form-group" style="margin-bottom:16px">
      <label>Estado actual: ${badge(estadoActual)}</label>
      <select id="nuevo-estado-ped" style="margin-top:8px">
        ${estados.map(e=>`<option value="${e}" ${e===estadoActual?'selected':''}>${e}</option>`).join('')}
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="aplicarEstadoPedido(${id})">Actualizar</button>
    </div>`);
}

function aplicarEstadoPedido(id) {
  API.updatePedidoEstado(id, document.getElementById('nuevo-estado-ped').value);
  closeModal(); showToast('Estado actualizado'); renderTablaPedidos();
}

function formNuevoPedido() {
  const provs = API.getProveedores({ activo: true });
  openModal('Nueva Orden de Compra', `
    <form id="form-oc" onsubmit="guardarPedido(event)">
      <div class="form-grid">
        <div class="form-group"><label>N° OC *</label><input name="numero_oc" required placeholder="OC-2026-001"></div>
        <div class="form-group"><label>Proveedor *</label>
          <select name="proveedor_id" required><option value="">— Seleccionar —</option>
            ${provs.map(p=>`<option value="${p.id}">${p.codigo} — ${p.razon_social}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Fecha emisión *</label><input name="fecha_emision" type="date" required value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Entrega estimada</label><input name="fecha_entrega_estimada" type="date"></div>
        <div class="form-group"><label>Incoterm</label>
          <select name="incoterm"><option value="">—</option>
            ${['FOB','CIF','CFR','EXW','DAP','DDP','FCA'].map(i=>`<option>${i}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Moneda</label>
          <select name="moneda">${['USD','EUR','BRL','CNY'].map(m=>`<option>${m}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Puerto origen</label><input name="puerto_origen" placeholder="Ej: Shanghai, Santos"></div>
        <div class="form-group full"><label>Observaciones</label><textarea name="observaciones"></textarea></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Crear OC</button>
      </div>
    </form>`);
}

function guardarPedido(e) {
  e.preventDefault();
  const data = formData(e.target);
  API.savePedido(data);
  closeModal(); showToast('OC creada'); renderTablaPedidos();
}
