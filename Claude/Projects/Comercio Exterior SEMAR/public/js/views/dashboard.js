async function viewDashboard() {
  document.getElementById('page-title').textContent = 'Dashboard';
  document.getElementById('topbar-actions').innerHTML = '';
  const d = API.getDashboard();
  const t = d.totales;

  const estadosPedido = ['BORRADOR','CONFIRMADO','EN_PRODUCCION','EMBARCADO','EN_ADUANA','ENTREGADO','CANCELADO'];
  const estadosMap = {};
  (d.pedidos_por_estado || []).forEach(e => estadosMap[e.estado] = e);

  document.getElementById('view-container').innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon navy"><svg viewBox="0 0 24 24"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg></div>
        <div><div class="kpi-value">${t.proveedores || 0}</div><div class="kpi-label">Proveedores activos</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon blue"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></div>
        <div><div class="kpi-value">${t.pedidos_activos || 0}</div><div class="kpi-label">Pedidos activos</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon orange"><svg viewBox="0 0 24 24"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/></svg></div>
        <div><div class="kpi-value">${t.embarques_activos || 0}</div><div class="kpi-label">Embarques en tránsito</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon red"><svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg></div>
        <div><div class="kpi-value">${fmtMoney(t.deuda_total, 'USD')}</div><div class="kpi-label">Facturas pendientes</div></div>
      </div>
    </div>

    <div class="grid-2" style="gap:20px">
      <div class="card">
        <div class="card-header"><span class="card-title">Embarques en curso</span></div>
        <div class="table-wrap">
          ${d.embarques_activos && d.embarques_activos.length ? `
          <table><thead><tr><th>N° Embarque</th><th>Proveedor</th><th>Estado</th><th>ETA</th></tr></thead>
          <tbody>${d.embarques_activos.map(e => `
            <tr><td><strong>${e.numero_embarque}</strong></td><td>${e.proveedor_nombre||'—'}</td>
            <td>${badge(e.estado)}</td><td>${fmtDate(e.eta)} ${etaDaysLabel(e.eta)}</td></tr>`).join('')}
          </tbody></table>` : '<div class="empty-state"><p>Sin embarques activos</p></div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Facturas pendientes de pago</span></div>
        <div class="table-wrap">
          ${d.facturas_pendientes && d.facturas_pendientes.length ? `
          <table><thead><tr><th>Factura</th><th>Proveedor</th><th>Importe</th><th>Venc.</th></tr></thead>
          <tbody>${d.facturas_pendientes.map(f => {
            const vencida = f.fecha_vencimiento && f.fecha_vencimiento < new Date().toISOString().slice(0,10);
            return `<tr><td><strong>${f.numero_factura}</strong></td><td>${f.proveedor_nombre||'—'}</td>
            <td>${fmtMoney(f.importe,f.moneda)}</td>
            <td style="${vencida?'color:var(--color-danger);font-weight:600':''}">${fmtDate(f.fecha_vencimiento)}</td></tr>`;
          }).join('')}</tbody></table>` : '<div class="empty-state"><p>Sin facturas pendientes</p></div>'}
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><span class="card-title">Estado de pedidos</span></div>
      <div class="card-body">
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${estadosPedido.map(e => {
            const info = estadosMap[e];
            return `<div style="background:var(--color-bg);border-radius:8px;padding:10px 16px;text-align:center;min-width:100px">
              <div style="font-size:20px;font-weight:700">${info ? info.cantidad : 0}</div>
              <div style="font-size:11px;color:var(--color-text-muted)">${e.replace(/_/g,' ')}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    ${d.documentos_pendientes > 0 ? `
    <div class="alert alert-warning" style="margin-top:16px">
      ⚠ Hay <strong>${d.documentos_pendientes}</strong> documento(s) aduaneros pendientes de recepción.
    </div>` : ''}
  `;
}
