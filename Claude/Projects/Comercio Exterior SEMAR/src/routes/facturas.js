const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

router.get('/', (req, res) => {
  const db = getDb();
  const { estado_pago, proveedor_id } = req.query;
  let query = `
    SELECT f.*, pv.razon_social as proveedor_nombre, p.numero_oc,
    COALESCE((SELECT SUM(pg.importe) FROM pagos pg WHERE pg.factura_id = f.id), 0) as pagado
    FROM facturas f
    LEFT JOIN proveedores pv ON pv.id = f.proveedor_id
    LEFT JOIN pedidos p ON p.id = f.pedido_id
    WHERE 1=1
  `;
  const params = [];
  if (estado_pago) { query += ' AND f.estado_pago = ?'; params.push(estado_pago); }
  if (proveedor_id) { query += ' AND f.proveedor_id = ?'; params.push(proveedor_id); }
  query += ' ORDER BY f.fecha_vencimiento ASC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const factura = db.prepare(`
    SELECT f.*, pv.razon_social as proveedor_nombre, p.numero_oc
    FROM facturas f
    LEFT JOIN proveedores pv ON pv.id = f.proveedor_id
    LEFT JOIN pedidos p ON p.id = f.pedido_id
    WHERE f.id = ?
  `).get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
  factura.pagos = db.prepare('SELECT * FROM pagos WHERE factura_id = ? ORDER BY fecha_pago').all(req.params.id);
  res.json(factura);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { pedido_id, numero_factura, proveedor_id, fecha_factura, fecha_vencimiento, moneda, importe, tipo_cambio, forma_pago, notas } = req.body;
  if (!numero_factura || !proveedor_id || !fecha_factura || !importe) return res.status(400).json({ error: 'Faltan campos requeridos' });
  const importe_gs = tipo_cambio ? importe * tipo_cambio : null;
  const result = db.prepare(`
    INSERT INTO facturas (pedido_id, numero_factura, proveedor_id, fecha_factura, fecha_vencimiento, moneda, importe, tipo_cambio, importe_gs, forma_pago, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(pedido_id, numero_factura, proveedor_id, fecha_factura, fecha_vencimiento, moneda || 'USD', importe, tipo_cambio, importe_gs, forma_pago, notas);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/:id/pagos', (req, res) => {
  const db = getDb();
  const { fecha_pago, importe, moneda, tipo_cambio, forma_pago, numero_referencia, banco, notas } = req.body;
  if (!fecha_pago || !importe) return res.status(400).json({ error: 'fecha_pago e importe son requeridos' });

  const registrarPago = db.transaction(() => {
    db.prepare(`
      INSERT INTO pagos (factura_id, fecha_pago, importe, moneda, tipo_cambio, forma_pago, numero_referencia, banco, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, fecha_pago, importe, moneda || 'USD', tipo_cambio, forma_pago, numero_referencia, banco, notas);

    const factura = db.prepare('SELECT importe FROM facturas WHERE id = ?').get(req.params.id);
    const totalPagado = db.prepare('SELECT SUM(importe) as total FROM pagos WHERE factura_id = ?').get(req.params.id).total || 0;
    const nuevoEstado = totalPagado >= factura.importe ? 'PAGADO' : 'PARCIAL';
    db.prepare("UPDATE facturas SET estado_pago=?, updated_at=datetime('now') WHERE id=?").run(nuevoEstado, req.params.id);
  });

  registrarPago();
  res.status(201).json({ ok: true });
});

module.exports = router;
