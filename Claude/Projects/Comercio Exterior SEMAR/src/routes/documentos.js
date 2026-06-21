const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

const TIPOS_DOCUMENTO = ['FACTURA_COMERCIAL', 'PACKING_LIST', 'BL_AWB', 'CERTIFICADO_ORIGEN', 'DUA', 'LC', 'POLIZA_SEGURO', 'FITOSANITARIO', 'OTROS'];

router.get('/', (req, res) => {
  const db = getDb();
  const { embarque_id, tipo_documento, estado } = req.query;
  let query = `
    SELECT d.*, e.numero_embarque, p.numero_oc
    FROM documentos d
    LEFT JOIN embarques e ON e.id = d.embarque_id
    LEFT JOIN pedidos p ON p.id = d.pedido_id
    WHERE 1=1
  `;
  const params = [];
  if (embarque_id) { query += ' AND d.embarque_id = ?'; params.push(embarque_id); }
  if (tipo_documento) { query += ' AND d.tipo_documento = ?'; params.push(tipo_documento); }
  if (estado) { query += ' AND d.estado = ?'; params.push(estado); }
  query += ' ORDER BY d.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const db = getDb();
  const { embarque_id, pedido_id, tipo_documento, numero_documento, fecha_emision, fecha_vencimiento, notas } = req.body;
  if (!tipo_documento) return res.status(400).json({ error: 'tipo_documento es requerido' });
  const result = db.prepare(`
    INSERT INTO documentos (embarque_id, pedido_id, tipo_documento, numero_documento, fecha_emision, fecha_vencimiento, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(embarque_id, pedido_id, tipo_documento, numero_documento, fecha_emision, fecha_vencimiento, notas);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id/estado', (req, res) => {
  const db = getDb();
  const { estado } = req.body;
  db.prepare('UPDATE documentos SET estado=? WHERE id=?').run(estado, req.params.id);
  res.json({ ok: true });
});

router.get('/tipos', (req, res) => {
  res.json(TIPOS_DOCUMENTO);
});

module.exports = router;
