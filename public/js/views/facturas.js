function viewFacturas() {
  document.getElementById('page-title').textContent = 'Facturas y Pagos';
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-primary" onclick="formNuevaFactura()">
      <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      Nueva factura
    </button>`;
  renderTablaFacturas();
}

function renderTablaFacturas() {
  const facturas = API.getFacturas();
  window._facturas = facturas;
  const totalPendiente = facturas.filter(f=>['PENDIENTE','PARCIAL'].includes(f.estado_pago)).reduce((s,f)=>s+f.importe,0);

  document.getElementById('view-container').innerHTML = `
    <div class="filter-bar">
      <input type="search" id="buscar-fact" placeholder="Buscar factura o proveedor..." oninput="filtrarFacturas()" style="max-width:260px">
      <select id="filtro-estado-fact" onchange="filtrarFacturas()">
        <option value="">Todos los estados</option>
        ${['PENDIENTE','PARCIAL','PAGADO'].map(e=>`<option>${e}</option>`).join('')}
      </select>
      <div class="spacer"></div>
      <div style="font-size:13px;color:var(--color-text-muted)">Total pendiente: <strong style="color:var(--color-danger)">${fmtMoney(totalPendiente,'USD')}</strong></div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table id="tabla-facturas">
          <thead><tr><th>N° Factura</th><th>Proveedor</th><th>OC</th><th>Fecha</th><th>Vencimiento</th><th>Importe</th><th>Pagado</th><th>Saldo</th><th>Estado</th><th></th></tr></thead>
          <tbody>${renderFacturasRows(facturas)}</tbody>
        </table>
      </div>
    </div>`;
}

function renderFacturasRows(facts) {
  if (!facts.length) return `<tr><td colspan="10"><div class="empty-state"><p>No hay facturas registradas</p></div></td></tr>`;
  return facts.map(f => {
    const saldo = f.importe - (f.pagado||0);
    const vencida = f.fecha_vencimiento && f.fecha_vencimiento < new Date().toISOString().slice(0,10) && f.estado_pago !== 'PAGADO';
    return `<tr>
      <td><strong>${f.numero_factura}</strong></td><td>${f.proveedor_nombre||'—'}</td><td>${f.numero_oc||'—'}</td>
      <td>${fmtDate(f.fecha_factura)}</td>
      <td style="${vencida?'color:var(--color-danger);font-weight:600':''}">${fmtDate(f.fecha_vencimiento)}</td>
      <td>${fmtMoney(f.importe,f.moneda)}</td>
      <td>${fmtMoney(f.pagado||0,f.moneda)}</td>
      <td style="${saldo>0?'color:var(--color-danger)':'color:var(--color-success)'}">${fmtMoney(saldo,f.moneda)}</td>
      <td>${badge(f.estado_pago)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="verFactura(${f.id})">Ver</button>
        ${f.estado_pago!=='PAGADO'?`<button class="btn btn-accent btn-sm" onclick="formRegistrarPago(${f.id})">Pagar</button>`:''}
      </td>
    </tr>`;
  }).join('');
}

function filtrarFacturas() {
  const buscar = document.getElementById('buscar-fact').value.toLowerCase();
  const estado = document.getElementById('filtro-estado-fact').value;
  const filtrado = window._facturas.filter(f=>
    (!buscar||f.numero_factura.toLowerCase().includes(buscar)||(f.proveedor_nombre||'').toLowerCase().includes(buscar))&&
    (!estado||f.estado_pago===estado));
  document.querySelector('#tabla-facturas tbody').innerHTML = renderFacturasRows(filtrado);
}

function verFactura(id) {
  const f = API.getFactura(id);
  const totalPagado = (f.pagos||[]).reduce((s,p)=>s+p.importe,0);
  const pagosHtml = f.pagos&&f.pagos.length ? `
    <table><thead><tr><th>Fecha</th><th>Forma</th><th>Referencia</th><th>Banco</th><th>Importe</th></tr></thead>
    <tbody>${f.pagos.map(p=>`<tr><td>${fmtDate(p.fecha_pago)}</td><td>${p.forma_pago||'—'}</td><td>${p.numero_referencia||'—'}</td><td>${p.banco||'—'}</td><td>${fmtMoney(p.importe,p.moneda||'USD')}</td></tr>`).join('')}</tbody>
    </table>` : '<p style="font-size:13px;color:var(--color-text-muted)">Sin pagos registrados</p>';

  openModal(`Factura ${f.numero_factura}`, `
    <div class="detail-grid" style="margin-bottom:16px">
      <div class="detail-item"><div class="detail-label">Proveedor</div><div class="detail-value">${f.proveedor_nombre||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Estado</div><div class="detail-value">${badge(f.estado_pago)}</div></div>
      <div class="detail-item"><div class="detail-label">Fecha factura</div><div class="detail-value">${fmtDate(f.fecha_factura)}</div></div>
      <div class="detail-item"><div class="detail-label">Vencimiento</div><div class="detail-value">${fmtDate(f.fecha_vencimiento)}</div></div>
      <div class="detail-item"><div class="detail-label">Importe total</div><div class="detail-value" style="font-weight:700">${fmtMoney(f.importe,f.moneda)}</div></div>
      <div class="detail-item"><div class="detail-label">Pagado</div><div class="detail-value" style="color:var(--color-success)">${fmtMoney(totalPagado,f.moneda)}</div></div>
      <div class="detail-item"><div class="detail-label">Saldo</div><div class="detail-value" style="color:var(--color-danger);font-weight:700">${fmtMoney(f.importe-totalPagado,f.moneda)}</div></div>
      <div class="detail-item"><div class="detail-label">T/C</div><div class="detail-value">${f.tipo_cambio?'Gs. '+Number(f.tipo_cambio).toLocaleString('es-PY'):'—'}</div></div>
    </div>
    <div class="card-title" style="margin-bottom:8px">Historial de pagos</div>${pagosHtml}
    ${f.estado_pago!=='PAGADO'?`<div style="margin-top:12px"><button class="btn btn-accent" onclick="closeModal();formRegistrarPago(${f.id})">Registrar pago</button></div>`:''}`);
}

function formRegistrarPago(facturaId) {
  openModal('Registrar pago', `
    <form id="form-pago" onsubmit="guardarPago(event,${facturaId})">
      <div class="form-grid">
        <div class="form-group"><label>Fecha de pago *</label><input name="fecha_pago" type="date" required value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Importe *</label><input name="importe" type="number" step="0.01" required></div>
        <div class="form-group"><label>Moneda</label>
          <select name="moneda">${['USD','EUR','PYG'].map(m=>`<option>${m}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Tipo de cambio (Gs.)</label><input name="tipo_cambio" type="number" step="1" placeholder="Ej: 7500"></div>
        <div class="form-group"><label>Forma de pago</label>
          <select name="forma_pago"><option value="">—</option>
            ${['Transferencia','Carta de crédito','Cheque','Contado'].map(f=>`<option>${f}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>N° Referencia</label><input name="numero_referencia"></div>
        <div class="form-group"><label>Banco</label><input name="banco"></div>
        <div class="form-group full"><label>Notas</label><textarea name="notas"></textarea></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar pago</button>
      </div>
    </form>`);
}

function guardarPago(e, facturaId) {
  e.preventDefault();
  const data = formData(e.target);
  data.importe = Number(data.importe);
  if (data.tipo_cambio) data.tipo_cambio = Number(data.tipo_cambio);
  API.registrarPago(facturaId, data);
  closeModal(); showToast('Pago registrado'); renderTablaFacturas();
}

function formNuevaFactura() {
  const provs = API.getProveedores({ activo: true });
  const pedidos = API.getPedidos();
  openModal('Nueva factura del exterior', `
    <form id="form-factura" onsubmit="guardarFactura(event)">
      <div class="form-grid">
        <div class="form-group"><label>N° Factura *</label><input name="numero_factura" required></div>
        <div class="form-group"><label>Proveedor *</label>
          <select name="proveedor_id" required><option value="">— Seleccionar —</option>
            ${provs.map(p=>`<option value="${p.id}">${p.razon_social}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>OC vinculada</label>
          <select name="pedido_id"><option value="">— Sin OC —</option>
            ${pedidos.map(p=>`<option value="${p.id}">${p.numero_oc}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Fecha factura *</label><input name="fecha_factura" type="date" required></div>
        <div class="form-group"><label>Fecha vencimiento</label><input name="fecha_vencimiento" type="date"></div>
        <div class="form-group"><label>Moneda</label>
          <select name="moneda">${['USD','EUR','BRL','CNY'].map(m=>`<option>${m}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Importe *</label><input name="importe" type="number" step="0.01" required></div>
        <div class="form-group"><label>Tipo de cambio (Gs.)</label><input name="tipo_cambio" type="number" step="1"></div>
        <div class="form-group"><label>Forma de pago</label>
          <select name="forma_pago"><option value="">—</option>
            ${['Transferencia','Carta de crédito','Cheque','Contado'].map(f=>`<option>${f}</option>`).join('')}
          </select>
        </div>
        <div class="form-group full"><label>Notas</label><textarea name="notas"></textarea></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar factura</button>
      </div>
    </form>`);
}

function guardarFactura(e) {
  e.preventDefault();
  const data = formData(e.target);
  data.importe = Number(data.importe);
  if (data.tipo_cambio) data.tipo_cambio = Number(data.tipo_cambio);
  if (data.proveedor_id) data.proveedor_id = Number(data.proveedor_id);
  if (data.pedido_id) data.pedido_id = Number(data.pedido_id);
  API.saveFactura(data);
  closeModal(); showToast('Factura guardada'); renderTablaFacturas();
}
