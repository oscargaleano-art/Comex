const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

router.get('/', (req, res) => {
  const db = getDb();

  const pedidos_por_estado = db.prepare(`
    SELECT estado, COUNT(*) as cantidad, SUM(importe_total) as total
    FROM pedidos GROUP BY estado
  `).all();

  const embarques_activos = db.prepare(`
    SELECT e.*, p.numero_oc, pv.razon_social as proveedor_nombre
    FROM embarques e
    LEFT JOIN pedidos p ON p.id = e.pedido_id
    LEFT JOIN proveedores pv ON pv.id = p.proveedor_id
    WHERE e.estado NOT IN ('ENTREGADO')
    ORDER BY e.eta ASC
    LIMIT 10
  `).all();

  const facturas_pendientes = db.prepare(`
    SELECT f.*, pv.razon_social as proveedor_nombre,
    COALESCE((SELECT SUM(pg.importe) FROM pagos pg WHERE pg.factura_id = f.id), 0) as pagado
    FROM facturas f
    LEFT JOIN proveedores pv ON pv.id = f.proveedor_id
    WHERE f.estado_pago IN ('PENDIENTE', 'PARCIAL')
    ORDER BY f.fecha_vencimiento ASC
    LIMIT 10
  `).all();

  const documentos_pendientes = db.prepare(`
    SELECT COUNT(*) as cantidad FROM documentos WHERE estado = 'PENDIENTE'
  `).get();

  const totales = db.prepare(`
    SELECT
    (SELECT COUNT(*) FROM proveedores WHERE activo=1) as proveedores,
    (SELECT COUNT(*) FROM pedidos WHERE estado NOT IN ('ENTREGADO','CANCELADO')) as pedidos_activos,
    (SELECT COUNT(*) FROM embarques WHERE estado NOT IN ('ENTREGADO')) as embarques_activos,
    (SELECT SUM(importe) FROM facturas WHERE estado_pago IN ('PENDIENTE','PARCIAL')) as deuda_total
  `).get();

  res.json({
    totales,
    pedidos_por_estado,
    embarques_activos,
    facturas_pendientes,
    documentos_pendientes: documentos_pendientes.cantidad
  });
});

module.exports = router;
