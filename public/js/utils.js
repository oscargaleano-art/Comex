function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMoney(n, moneda) {
  if (n == null || n === '') return '—';
  const sym = moneda === 'USD' ? 'USD ' : moneda === 'PYG' ? 'Gs. ' : (moneda || '') + ' ';
  if (moneda === 'PYG') return sym + Math.round(n).toLocaleString('es-PY');
  return sym + Number(n).toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function badge(estado) {
  const key = (estado || '').toLowerCase().replace(/ /g, '_');
  return `<span class="badge badge-${key}">${estado}</span>`;
}

function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

function showToast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:20px;right:20px;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:500;z-index:999;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:opacity .3s;`;
  t.style.background = type === 'ok' ? '#27ae60' : '#c0392b';
  t.style.color = '#fff';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2500);
}

function etaDaysLabel(eta) {
  if (!eta) return '';
  const diff = Math.round((new Date(eta) - new Date()) / 86400000);
  if (diff < 0) return `<span style="color:var(--color-danger);font-size:11px">${Math.abs(diff)}d vencido</span>`;
  if (diff === 0) return `<span style="color:var(--color-warning);font-size:11px">Hoy</span>`;
  if (diff <= 7) return `<span style="color:var(--color-warning);font-size:11px">${diff}d</span>`;
  return `<span style="color:var(--color-text-muted);font-size:11px">${diff}d</span>`;
}

function formData(formEl) {
  const data = {};
  new FormData(formEl).forEach((v, k) => { data[k] = v === '' ? null : v; });
  return data;
}
