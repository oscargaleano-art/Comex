const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

router.get('/', (req, res) => {
  const db = getDb();
  const { estado, proveedor_id } = req.query;
  let query = `
    SELECT p.*, pv.razon_social as proveedor_nombre, pv.pais as proveedor_pais
    FROM pedidos p
    LEFT JOIN proveedores pv ON pv.id = p.proveedor_id
    WHERE 1=1
  `;
  const params = [];
  if (estado) { query += ' AND p.estado = ?'; params.push(estado); }
  if (proveedor_id) { query += ' AND p.proveedor_id = ?'; params.push(proveedor_id); }
  query += ' ORDER BY p.fecha_emision DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const pedido = db.prepare(`
    SELECT p.*, pv.razon_social as proveedor_nombre, pv.pais as proveedor_pais, pv.moneda as proveedor_moneda
    FROM pedidos p LEFT JOIN proveedores pv ON pv.id = p.proveedor_id WHERE p.id = ?
  `).get(req.params.id);
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  pedido.items = db.prepare('SELECT * FROM pedido_items WHERE pedido_id = ?').all(req.params.id);
  res.json(pedido);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { numero_oc, proveedor_id, fecha_emision, fecha_entrega_estimada, moneda, incoterm, puerto_origen, observaciones, items } = req.body;
  if (!numero_oc || !proveedor_id || !fecha_emision) return res.status(400).json({ error: 'numero_oc, proveedor_id y fecha_emision son requeridos' });

  const insertPedido = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO pedidos (numero_oc, proveedor_id, fecha_emision, fecha_entrega_estimada, moneda, incoterm, puerto_origen, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(numero_oc, proveedor_id, fecha_emision, fecha_entrega_estimada, moneda || 'USD', incoterm, puerto_origen, observaciones);

    const pedidoId = result.lastInsertRowid;
    let total = 0;
    if (items && items.length > 0) {
      const insertItem = db.prepare(`
        INSERT INTO pedido_items (pedido_id, codigo_producto, descripcion, cantidad, unidad, precio_unitario)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const item of items) {
        insertItem.run(pedidoId, item.codigo_producto, item.descripcion, item.cantidad, item.unidad || 'UN', item.precio_unitario);
        total += item.cantidad * item.precio_unitario;
      }
      db.prepare('UPDATE pedidos SET importe_total = ? WHERE id = ?').run(total, pedidoId);
    }
    return pedidoId;
  });

  const id = insertPedido();
  res.status(201).json({ id });
});

router.put('/:id/estado', (req, res) => {
  const db = getDb();
  const { estado } = req.body;
  const estados = ['BORRADOR', 'CONFIRMADO', 'EN_PRODUCCION', 'EMBARCADO', 'EN_ADUANA', 'ENTREGADO', 'CANCELADO'];
  if (!estados.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  db.prepare("UPDATE pedidos SET estado=?, updated_at=datetime('now') WHERE id=?").run(estado, req.params.id);
  res.json({ ok: true });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { fecha_entrega_estimada, moneda, incoterm, puerto_origen, observaciones } = req.body;
  db.prepare(`
    UPDATE pedidos SET fecha_entrega_estimada=?, moneda=?, incoterm=?, puerto_origen=?, observaciones=?, updated_at=datetime('now')
    WHERE id=?
  `).run(fecha_entrega_estimada, moneda, incoterm, puerto_origen, observaciones, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
