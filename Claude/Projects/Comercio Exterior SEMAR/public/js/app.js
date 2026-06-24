const VIEWS = {
  dashboard: viewDashboard,
  proveedores: viewProveedores,
  pedidos: viewPedidos,
  embarques: viewEmbarques,
  documentos: viewDocumentos,
  facturas: viewFacturas,
};

async function navigate(view) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  const fn = VIEWS[view];
  if (fn) {
    try { await fn(); }
    catch(err) {
      document.getElementById('view-container').innerHTML = `
        <div class="alert alert-danger">Error al cargar la vista: ${err.message}</div>`;
    }
  }
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    navigate(el.dataset.view);
  });
});

// Arrancar: cargar datos de Sheets y luego mostrar dashboard
initDB().then(() => navigate('dashboard'));
