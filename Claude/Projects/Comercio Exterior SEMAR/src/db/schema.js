const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/comercio_exterior.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    -- Proveedores del exterior
    CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      razon_social TEXT NOT NULL,
      pais TEXT NOT NULL,
      moneda TEXT DEFAULT 'USD',
      contacto TEXT,
      email TEXT,
      telefono TEXT,
      condicion_pago TEXT,
      plazo_entrega_dias INTEGER,
      activo INTEGER DEFAULT 1,
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Pedidos / Órdenes de Compra
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_oc TEXT UNIQUE NOT NULL,
      proveedor_id INTEGER NOT NULL REFERENCES proveedores(id),
      fecha_emision TEXT NOT NULL,
      fecha_entrega_estimada TEXT,
      moneda TEXT DEFAULT 'USD',
      incoterm TEXT,
      puerto_origen TEXT,
      puerto_destino TEXT DEFAULT 'Asunción',
      estado TEXT DEFAULT 'BORRADOR',
      importe_total REAL DEFAULT 0,
      observaciones TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Ítems de pedido
    CREATE TABLE IF NOT EXISTS pedido_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      codigo_producto TEXT,
      descripcion TEXT NOT NULL,
      cantidad REAL NOT NULL,
      unidad TEXT DEFAULT 'UN',
      precio_unitario REAL NOT NULL,
      importe REAL GENERATED ALWAYS AS (cantidad * precio_unitario) VIRTUAL
    );

    -- Embarques / Logística
    CREATE TABLE IF NOT EXISTS embarques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_embarque TEXT UNIQUE NOT NULL,
      pedido_id INTEGER REFERENCES pedidos(id),
      tipo_transporte TEXT DEFAULT 'MARITIMO',
      naviera_transportista TEXT,
      numero_bl_awb TEXT,
      contenedor TEXT,
      fecha_embarque TEXT,
      eta TEXT,
      fecha_arribo_real TEXT,
      puerto_origen TEXT,
      puerto_destino TEXT DEFAULT 'Asunción',
      flete_importe REAL,
      flete_moneda TEXT DEFAULT 'USD',
      seguro_importe REAL,
      despachante TEXT,
      estado TEXT DEFAULT 'EN_TRANSITO',
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Documentación aduanera
    CREATE TABLE IF NOT EXISTS documentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      embarque_id INTEGER REFERENCES embarques(id),
      pedido_id INTEGER REFERENCES pedidos(id),
      tipo_documento TEXT NOT NULL,
      numero_documento TEXT,
      fecha_emision TEXT,
      fecha_vencimiento TEXT,
      estado TEXT DEFAULT 'PENDIENTE',
      archivo_nombre TEXT,
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Despachos aduaneros
    CREATE TABLE IF NOT EXISTS despachos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      embarque_id INTEGER REFERENCES embarques(id),
      numero_dua TEXT,
      despachante TEXT,
      fecha_ingreso TEXT,
      fecha_levante TEXT,
      canal TEXT,
      importe_tributos REAL,
      estado TEXT DEFAULT 'EN_PROCESO',
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Facturas del exterior
    CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER REFERENCES pedidos(id),
      numero_factura TEXT NOT NULL,
      proveedor_id INTEGER NOT NULL REFERENCES proveedores(id),
      fecha_factura TEXT NOT NULL,
      fecha_vencimiento TEXT,
      moneda TEXT DEFAULT 'USD',
      importe REAL NOT NULL,
      tipo_cambio REAL,
      importe_gs REAL,
      estado_pago TEXT DEFAULT 'PENDIENTE',
      forma_pago TEXT,
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Pagos
    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factura_id INTEGER REFERENCES facturas(id),
      fecha_pago TEXT NOT NULL,
      importe REAL NOT NULL,
      moneda TEXT DEFAULT 'USD',
      tipo_cambio REAL,
      forma_pago TEXT,
      numero_referencia TEXT,
      banco TEXT,
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Índices para búsquedas frecuentes
    CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
    CREATE INDEX IF NOT EXISTS idx_pedidos_proveedor ON pedidos(proveedor_id);
    CREATE INDEX IF NOT EXISTS idx_embarques_estado ON embarques(estado);
    CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado_pago);
    CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos(tipo_documento);
  `);
}

module.exports = { getDb };
