function viewEmbarques() {
  document.getElementById('page-title').textContent = 'Embarques y Logística';
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-primary" onclick="formNuevoEmbarque()">
      <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      Nuevo embarque
    </button>`;
  renderTablaEmbarques();
}

function renderTablaEmbarques() {
  const embarques = API.getEmbarques();
  window._embarques = embarques;

  document.getElementById('view-container').innerHTML = `
    <div class="filter-bar">
      <input type="search" id="buscar-emb" placeholder="Buscar embarque, BL, naviera..." oninput="filtrarEmbarques()" style="max-width:260px">
      <select id="filtro-estado-emb" onchange="filtrarEmbarques()">
        <option value="">Todos los estados</option>
        ${['EN_TRANSITO','EN_PUERTO','EN_ADUANA','LIBERADO','ENTREGADO'].map(e=>`<option>${e}</option>`).join('')}
      </select>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table id="tabla-embarques">
          <thead><tr><th>N° Embarque</th><th>OC</th><th>Proveedor</th><th>Tipo</th><th>BL/AWB</th><th>Naviera</th><th>Salida</th><th>ETA</th><th>Estado</th><th></th></tr></thead>
          <tbody>${renderEmbarquesRows(embarques)}</tbody>
        </table>
      </div>
    </div>`;
}

function renderEmbarquesRows(embs) {
  if (!embs.length) return `<tr><td colspan="10"><div class="empty-state"><p>No hay embarques registrados</p></div></td></tr>`;
  return embs.map(e=>`
    <tr>
      <td><strong>${e.numero_embarque}</strong></td><td>${e.numero_oc||'—'}</td><td>${e.proveedor_nombre||'—'}</td>
      <td>${e.tipo_transporte}</td><td>${e.numero_bl_awb||'—'}</td><td>${e.naviera_transportista||'—'}</td>
      <td>${fmtDate(e.fecha_embarque)}</td><td>${fmtDate(e.eta)} ${etaDaysLabel(e.eta)}</td>
      <td>${badge(e.estado)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="verEmbarque(${e.id})">Ver</button>
        <button class="btn btn-ghost btn-sm" onclick="cambiarEstadoEmbarque(${e.id},'${e.estado}')">Estado</button>
      </td>
    </tr>`).join('');
}

function filtrarEmbarques() {
  const buscar = document.getElementById('buscar-emb').value.toLowerCase();
  const estado = document.getElementById('filtro-estado-emb').value;
  const filtrado = window._embarques.filter(e=>
    (!buscar||e.numero_embarque.toLowerCase().includes(buscar)||(e.numero_bl_awb||'').toLowerCase().includes(buscar)||(e.naviera_transportista||'').toLowerCase().includes(buscar))&&
    (!estado||e.estado===estado));
  document.querySelector('#tabla-embarques tbody').innerHTML = renderEmbarquesRows(filtrado);
}

function verEmbarque(id) {
  const e = API.getEmbarque(id);
  const docsHtml = e.documentos&&e.documentos.length ? `
    <table><thead><tr><th>Tipo</th><th>N° Doc.</th><th>Fecha</th><th>Estado</th></tr></thead>
    <tbody>${e.documentos.map(d=>`<tr><td>${d.tipo_documento.replace(/_/g,' ')}</td><td>${d.numero_documento||'—'}</td><td>${fmtDate(d.fecha_emision)}</td><td>${badge(d.estado)}</td></tr>`).join('')}</tbody>
    </table>` : '<p style="font-size:13px;color:var(--color-text-muted)">Sin documentos</p>';

  openModal(`Embarque ${e.numero_embarque}`, `
    <div class="detail-grid" style="margin-bottom:16px">
      <div class="detail-item"><div class="detail-label">OC vinculada</div><div class="detail-value">${e.numero_oc||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Proveedor</div><div class="detail-value">${e.proveedor_nombre||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Estado</div><div class="detail-value">${badge(e.estado)}</div></div>
      <div class="detail-item"><div class="detail-label">Transporte</div><div class="detail-value">${e.tipo_transporte}</div></div>
      <div class="detail-item"><div class="detail-label">BL / AWB</div><div class="detail-value">${e.numero_bl_awb||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Contenedor</div><div class="detail-value">${e.contenedor||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Naviera</div><div class="detail-value">${e.naviera_transportista||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Puerto origen</div><div class="detail-value">${e.puerto_origen||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Fecha embarque</div><div class="detail-value">${fmtDate(e.fecha_embarque)}</div></div>
      <div class="detail-item"><div class="detail-label">ETA</div><div class="detail-value">${fmtDate(e.eta)} ${etaDaysLabel(e.eta)}</div></div>
      <div class="detail-item"><div class="detail-label">Arribo real</div><div class="detail-value">${fmtDate(e.fecha_arribo_real)}</div></div>
      <div class="detail-item"><div class="detail-label">Despachante</div><div class="detail-value">${e.despachante||'—'}</div></div>
      <div class="detail-item"><div class="detail-label">Flete</div><div class="detail-value">${fmtMoney(e.flete_importe,e.flete_moneda||'USD')}</div></div>
    </div>
    <div class="card-title" style="margin-bottom:8px">Documentación</div>${docsHtml}`);
}

function cambiarEstadoEmbarque(id, estadoActual) {
  const estados = ['EN_TRANSITO','EN_PUERTO','EN_ADUANA','LIBERADO','ENTREGADO'];
  openModal('Actualizar estado de embarque', `
    <div class="form-group" style="margin-bottom:12px"><label>Nuevo estado</label>
      <select id="nuevo-estado-emb" style="margin-top:6px">
        ${estados.map(e=>`<option value="${e}" ${e===estadoActual?'selected':''}>${e.replace(/_/g,' ')}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Fecha arribo real (opcional)</label><input type="date" id="fecha-arribo"></div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="aplicarEstadoEmbarque(${id})">Actualizar</button>
    </div>`);
}

function aplicarEstadoEmbarque(id) {
  const estado = document.getElementById('nuevo-estado-emb').value;
  const fecha = document.getElementById('fecha-arribo').value || null;
  API.updateEmbarqueEstado(id, estado, fecha);
  closeModal(); showToast('Estado actualizado'); renderTablaEmbarques();
}

function formNuevoEmbarque() {
  const pedidos = API.getPedidos().filter(p=>!['ENTREGADO','CANCELADO'].includes(p.estado));
  openModal('Nuevo embarque', `
    <form id="form-emb" onsubmit="guardarEmbarque(event)">
      <div class="form-grid">
        <div class="form-group"><label>N° Embarque *</label><input name="numero_embarque" required placeholder="EMB-2026-001"></div>
        <div class="form-group"><label>OC vinculada</label>
          <select name="pedido_id"><option value="">— Sin OC —</option>
            ${pedidos.map(p=>`<option value="${p.id}">${p.numero_oc} — ${p.proveedor_nombre}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Tipo transporte</label>
          <select name="tipo_transporte">${['MARITIMO','AEREO','TERRESTRE','FLUVIAL'].map(t=>`<option>${t}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Naviera / Transportista</label><input name="naviera_transportista"></div>
        <div class="form-group"><label>BL / AWB</label><input name="numero_bl_awb"></div>
        <div class="form-group"><label>Contenedor</label><input name="contenedor"></div>
        <div class="form-group"><label>Puerto origen</label><input name="puerto_origen"></div>
        <div class="form-group"><label>Fecha embarque</label><input name="fecha_embarque" type="date"></div>
        <div class="form-group"><label>ETA</label><input name="eta" type="date"></div>
        <div class="form-group"><label>Flete (USD)</label><input name="flete_importe" type="number" step="0.01"></div>
        <div class="form-group"><label>Despachante</label><input name="despachante"></div>
        <div class="form-group full"><label>Notas</label><textarea name="notas"></textarea></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar embarque</button>
      </div>
    </form>`);
}

function guardarEmbarque(e) {
  e.preventDefault();
  const data = formData(e.target);
  if (data.flete_importe) data.flete_importe = Number(data.flete_importe);
  API.saveEmbarque(data);
  closeModal(); showToast('Embarque registrado'); renderTablaEmbarques();
}
