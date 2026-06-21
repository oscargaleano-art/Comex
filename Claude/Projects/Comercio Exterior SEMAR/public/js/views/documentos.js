const TIPOS_DOC = ['FACTURA_COMERCIAL','PACKING_LIST','BL_AWB','CERTIFICADO_ORIGEN','DUA','LC','POLIZA_SEGURO','FITOSANITARIO','OTROS'];

function viewDocumentos() {
  document.getElementById('page-title').textContent = 'Documentación Aduanera';
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-primary" onclick="formNuevoDocumento()">
      <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      Registrar documento
    </button>`;
  renderTablaDocumentos();
}

function renderTablaDocumentos() {
  const docs = API.getDocumentos();
  window._docs = docs;

  document.getElementById('view-container').innerHTML = `
    <div class="filter-bar">
      <select id="filtro-tipo-doc" onchange="filtrarDocs()">
        <option value="">Todos los tipos</option>
        ${TIPOS_DOC.map(t=>`<option>${t}</option>`).join('')}
      </select>
      <select id="filtro-estado-doc" onchange="filtrarDocs()">
        <option value="">Todos los estados</option>
        ${['PENDIENTE','RECIBIDO','VERIFICADO','OBSERVADO'].map(e=>`<option>${e}</option>`).join('')}
      </select>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table id="tabla-docs">
          <thead><tr><th>Tipo</th><th>N° Documento</th><th>Embarque</th><th>OC</th><th>Fecha emisión</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
          <tbody>${renderDocsRows(docs)}</tbody>
        </table>
      </div>
    </div>`;
}

function renderDocsRows(docs) {
  if (!docs.length) return `<tr><td colspan="8"><div class="empty-state"><p>No hay documentos registrados</p></div></td></tr>`;
  return docs.map(d => {
    const vence = d.fecha_vencimiento && d.fecha_vencimiento < new Date().toISOString().slice(0,10);
    return `<tr>
      <td><strong>${d.tipo_documento.replace(/_/g,' ')}</strong></td>
      <td>${d.numero_documento||'—'}</td><td>${d.numero_embarque||'—'}</td><td>${d.numero_oc||'—'}</td>
      <td>${fmtDate(d.fecha_emision)}</td>
      <td style="${vence?'color:var(--color-danger);font-weight:600':''}">${fmtDate(d.fecha_vencimiento)}</td>
      <td>${badge(d.estado)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="cambiarEstadoDoc(${d.id},'${d.estado}')">Estado</button></td>
    </tr>`;
  }).join('');
}

function filtrarDocs() {
  const tipo = document.getElementById('filtro-tipo-doc').value;
  const estado = document.getElementById('filtro-estado-doc').value;
  const filtrado = window._docs.filter(d=>(!tipo||d.tipo_documento===tipo)&&(!estado||d.estado===estado));
  document.querySelector('#tabla-docs tbody').innerHTML = renderDocsRows(filtrado);
}

function cambiarEstadoDoc(id, estadoActual) {
  const estados = ['PENDIENTE','RECIBIDO','VERIFICADO','OBSERVADO'];
  openModal('Actualizar estado', `
    <div class="form-group" style="margin-bottom:12px"><label>Nuevo estado</label>
      <select id="nuevo-estado-doc" style="margin-top:6px">
        ${estados.map(e=>`<option value="${e}" ${e===estadoActual?'selected':''}>${e}</option>`).join('')}
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="aplicarEstadoDoc(${id})">Actualizar</button>
    </div>`);
}

function aplicarEstadoDoc(id) {
  API.updateDocumentoEstado(id, document.getElementById('nuevo-estado-doc').value);
  closeModal(); showToast('Estado actualizado'); renderTablaDocumentos();
}

function formNuevoDocumento() {
  const embarques = API.getEmbarques();
  openModal('Registrar documento', `
    <form id="form-doc" onsubmit="guardarDocumento(event)">
      <div class="form-grid">
        <div class="form-group"><label>Tipo de documento *</label>
          <select name="tipo_documento" required><option value="">— Seleccionar —</option>
            ${TIPOS_DOC.map(t=>`<option>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Embarque vinculado</label>
          <select name="embarque_id"><option value="">— Sin embarque —</option>
            ${embarques.map(e=>`<option value="${e.id}">${e.numero_embarque}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>N° Documento</label><input name="numero_documento"></div>
        <div class="form-group"><label>Fecha emisión</label><input name="fecha_emision" type="date"></div>
        <div class="form-group"><label>Fecha vencimiento</label><input name="fecha_vencimiento" type="date"></div>
        <div class="form-group full"><label>Notas</label><textarea name="notas"></textarea></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar</button>
      </div>
    </form>`);
}

function guardarDocumento(e) {
  e.preventDefault();
  const data = formData(e.target);
  if (data.embarque_id) data.embarque_id = Number(data.embarque_id);
  API.saveDocumento(data);
  closeModal(); showToast('Documento registrado'); renderTablaDocumentos();
}
