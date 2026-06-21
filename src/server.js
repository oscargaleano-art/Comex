const express = require('express');
const path = require('path');
const { getDb } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Inicializar DB al arrancar
getDb();

// Rutas API
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/proveedores', require('./routes/proveedores'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/embarques', require('./routes/embarques'));
app.use('/api/documentos', require('./routes/documentos'));
app.use('/api/facturas', require('./routes/facturas'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  SEMAR Comercio Exterior corriendo en http://localhost:${PORT}\n`);
});
