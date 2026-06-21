function viewProveedores() {
  document.getElementById('page-title').textContent = 'Proveedores';
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-primary" onclick="formNuevoProveedor()">
      <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      Nuevo proveedor
    </button>`;
  renderTablaProveedores();
}

function renderTablaProveedores() {
  const proveedores = API.getProveedores({ activo: true });
  window._proveedores = proveedores;
  const paises = [...new Set(proveedores.map(p => p.pais))].sort();

  document.getElementById('view-container').innerHTML = `
    <div class="filter-bar">
      <input type="search" id="buscar-prov" placeholder="Buscar proveedor..." oninput="filtrarProveedores()" style="max-width:260px">
      <select id="filtro-pais" onchange="filtrarProveedores()">
        <option value="">Todos los países</option>
        ${paises.map(p => `<option>${p}</option>`).join('')}
      </select>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table id="tabla-proveedores">
          <thead><tr><th>Código</th><th>Razón Social</th><th>País</th><th>Moneda</th><th>Cond. Pago</th><th>Plazo</th><th>Contacto</th><th></th></tr></thead>
          <tbody>${renderProveedoresRows(proveedores)}</tbody>
        </table>
      </div>
    </div>`;
}

function renderProveedoresRows(provs) {
  if (!provs.length) return `<tr><td colspan="8"><div class="empty-state"><p>No hay proveedores registrados</p></div></td></tr>`;
  return provs.map(p => `
    <tr>
      <td><strong>${p.codigo}</strong></td>
      <td>${p.razon_social}</td>
      <td>${p.pais}</td>
      <td>${p.moneda||'USD'}</td>
      <td>${p.condicion_pago||'—'}</td>
      <td>${p.plazo_entrega_dias ? p.plazo_entrega_dias + 'd' : '—'}</td>
      <td>${p.contacto||'—'}<br><small style="color:var(--color-text-muted)">${p.email||''}</small></td>
      <td><button class="btn btn-ghost btn-sm" onclick="editarProveedor(${p.id})">Editar</button></td>
    </tr>`).join('');
}

function filtrarProveedores() {
  const buscar = document.getElementById('buscar-prov').value.toLowerCase();
  const pais = document.getElementById('filtro-pais').value;
  const filtrado = window._proveedores.filter(p =>
    (!buscar || p.razon_social.toLowerCase().includes(buscar) || p.codigo.toLowerCase().includes(buscar)) &&
    (!pais || p.pais === pais)
  );
  document.querySelector('#tabla-proveedores tbody').innerHTML = renderProveedoresRows(filtrado);
}

function formProveedor(title, prov = {}) {
  openModal(title, `
    <form id="form-prov" onsubmit="guardarProveedor(event,${prov.id||'null'})">
      <div class="form-grid">
        <div class="form-group"><label>Código *</label><input name="codigo" value="${prov.codigo||''}" required ${prov.id?'readonly':''}></div>
        <div class="form-group full"><label>Razón Social *</label><input name="razon_social" value="${prov.razon_social||''}" required></div>
        <div class="form-group"><label>País *</label><input name="pais" value="${prov.pais||''}" required placeholder="Ej: China, Brasil"></div>
        <div class="form-group"><label>Moneda</label>
          <select name="moneda">${['USD','EUR','BRL','CNY','JPY'].map(m=>`<option ${prov.moneda===m?'selected':''}>${m}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Contacto</label><input name="contacto" value="${prov.contacto||''}"></div>
        <div class="form-group"><label>Email</label><input name="email" type="email" value="${prov.email||''}"></div>
        <div class="form-group"><label>Teléfono</label><input name="telefono" value="${prov.telefono||''}"></div>
        <div class="form-group"><label>Condición de pago</label>
          <select name="condicion_pago"><option value="">—</option>
            ${['Contado','30 días','60 días','90 días','LC a la vista','LC 30 días','LC 60 días','Anticipo 30%'].map(c=>`<option ${prov.condicion_pago===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Plazo entrega (días)</label><input name="plazo_entrega_dias" type="number" value="${prov.plazo_entrega_dias||''}"></div>
        <div class="form-group full"><label>Notas</label><textarea name="notas">${prov.notas||''}</textarea></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>`);
}

function formNuevoProveedor() { formProveedor('Nuevo proveedor'); }

function editarProveedor(id) {
  formProveedor('Editar proveedor', API.getProveedor(id));
}

function guardarProveedor(e, id) {
  e.preventDefault();
  const data = formData(e.target);
  if (data.plazo_entrega_dias) data.plazo_entrega_dias = Number(data.plazo_entrega_dias);
  API.saveProveedor(data, id);
  closeModal(); showToast('Proveedor guardado'); renderTablaProveedores();
}
