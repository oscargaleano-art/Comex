const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

router.get('/', (req, res) => {
  const db = getDb();
  const { estado } = req.query;
  let query = `
    SELECT e.*, p.numero_oc, pv.razon_social as proveedor_nombre
    FROM embarques e
    LEFT JOIN pedidos p ON p.id = e.pedido_id
    LEFT JOIN proveedores pv ON pv.id = p.proveedor_id
    WHERE 1=1
  `;
  const params = [];
  if (estado) { query += ' AND e.estado = ?'; params.push(estado); }
  query += ' ORDER BY e.eta ASC NULLS LAST, e.fecha_embarque DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const embarque = db.prepare(`
    SELECT e.*, p.numero_oc, pv.razon_social as proveedor_nombre
    FROM embarques e
    LEFT JOIN pedidos p ON p.id = e.pedido_id
    LEFT JOIN proveedores pv ON pv.id = p.proveedor_id
    WHERE e.id = ?
  `).get(req.params.id);
  if (!embarque) return res.status(404).json({ error: 'Embarque no encontrado' });
  embarque.documentos = db.prepare('SELECT * FROM documentos WHERE embarque_id = ?').all(req.params.id);
  embarque.despacho = db.prepare('SELECT * FROM despachos WHERE embarque_id = ?').get(req.params.id);
  res.json(embarque);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { numero_embarque, pedido_id, tipo_transporte, naviera_transportista, numero_bl_awb, contenedor,
    fecha_embarque, eta, puerto_origen, flete_importe, flete_moneda, seguro_importe, despachante, notas } = req.body;
  if (!numero_embarque) return res.status(400).json({ error: 'numero_embarque es requerido' });
  const result = db.prepare(`
    INSERT INTO embarques (numero_embarque, pedido_id, tipo_transporte, naviera_transportista, numero_bl_awb, contenedor,
    fecha_embarque, eta, puerto_origen, flete_importe, flete_moneda, seguro_importe, despachante, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(numero_embarque, pedido_id, tipo_transporte || 'MARITIMO', naviera_transportista, numero_bl_awb, contenedor,
    fecha_embarque, eta, puerto_origen, flete_importe, flete_moneda || 'USD', seguro_importe, despachante, notas);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id/estado', (req, res) => {
  const db = getDb();
  const { estado, fecha_arribo_real } = req.body;
  const estados = ['EN_TRANSITO', 'EN_PUERTO', 'EN_ADUANA', 'LIBERADO', 'ENTREGADO'];
  if (!estados.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  db.prepare("UPDATE embarques SET estado=?, fecha_arribo_real=COALESCE(?, fecha_arribo_real), updated_at=datetime('now') WHERE id=?")
    .run(estado, fecha_arribo_real, req.params.id);
  res.json({ ok: true });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { naviera_transportista, numero_bl_awb, contenedor, fecha_embarque, eta, flete_importe, despachante, notas } = req.body;
  db.prepare(`
    UPDATE embarques SET naviera_transportista=?, numero_bl_awb=?, contenedor=?, fecha_embarque=?,
    eta=?, flete_importe=?, despachante=?, notas=?, updated_at=datetime('now') WHERE id=?
  `).run(naviera_transportista, numero_bl_awb, contenedor, fecha_embarque, eta, flete_importe, despachante, notas, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
