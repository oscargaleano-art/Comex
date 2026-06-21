const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

router.get('/', (req, res) => {
  const db = getDb();
  const { activo, pais } = req.query;
  let query = 'SELECT * FROM proveedores WHERE 1=1';
  const params = [];
  if (activo !== undefined) { query += ' AND activo = ?'; params.push(activo === 'true' ? 1 : 0); }
  if (pais) { query += ' AND pais = ?'; params.push(pais); }
  query += ' ORDER BY razon_social';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const prov = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(req.params.id);
  if (!prov) return res.status(404).json({ error: 'Proveedor no encontrado' });
  res.json(prov);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { codigo, razon_social, pais, moneda, contacto, email, telefono, condicion_pago, plazo_entrega_dias, notas } = req.body;
  if (!codigo || !razon_social || !pais) return res.status(400).json({ error: 'codigo, razon_social y pais son requeridos' });
  const result = db.prepare(`
    INSERT INTO proveedores (codigo, razon_social, pais, moneda, contacto, email, telefono, condicion_pago, plazo_entrega_dias, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(codigo, razon_social, pais, moneda || 'USD', contacto, email, telefono, condicion_pago, plazo_entrega_dias, notas);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { razon_social, pais, moneda, contacto, email, telefono, condicion_pago, plazo_entrega_dias, activo, notas } = req.body;
  db.prepare(`
    UPDATE proveedores SET razon_social=?, pais=?, moneda=?, contacto=?, email=?, telefono=?,
    condicion_pago=?, plazo_entrega_dias=?, activo=?, notas=?, updated_at=datetime('now')
    WHERE id=?
  `).run(razon_social, pais, moneda, contacto, email, telefono, condicion_pago, plazo_entrega_dias, activo, notas, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE proveedores SET activo=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
