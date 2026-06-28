# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the home directory git repo for SEMAR S.R.L. projects, containing multiple business applications under `Claude/Projects/`. The primary active codebase is **Comercio Exterior SEMAR**.

---

## Comercio Exterior SEMAR

`Claude/Projects/Comercio Exterior SEMAR/`

A Node.js + Express + SQLite SPA for managing international trade: purchase orders, shipments, customs documentation, supplier invoices, and payments.

### Commands

```bash
cd "Claude/Projects/Comercio Exterior SEMAR"
npm start         # production
npm run dev       # dev with nodemon hot reload (port 3000)
```

### Architecture

```
src/
  server.js          # Express entry point, mounts all routes
  db/schema.js       # Single getDb() function; creates DB and runs initSchema() once
  routes/            # One file per entity: proveedores, pedidos, embarques,
                     #   documentos, facturas, dashboard
public/
  index.html         # SPA shell
  js/
    app.js           # Router/navigation controller
    api.js           # All fetch() calls to /api/*
    views/           # One file per route view (mirrors routes/)
    utils.js         # Shared formatting/helpers
data/
  comercio_exterior.db   # SQLite file, auto-created on first run
```

The server serves `public/` as static files and falls back to `index.html` for all non-API routes (SPA pattern). The database singleton lives in `schema.js`; every route file calls `getDb()` to get the shared connection.

### Database Conventions

- **Soft deletes:** set `activo = 0` (INTEGER 1/0), never DELETE rows. Filters must include `WHERE activo = 1` (or `= 0` for inactive).
- **State machines:** `pedidos.estado` → `BORRADOR → CONFIRMADO → EN_TRANSITO → ENTREGADO`; `embarques.estado` → `EN_TRANSITO → ARRIBADO → DESPACHADO → ENTREGADO`; `facturas.estado_pago` → `PENDIENTE → PARCIAL → PAGADO`.
- **Timestamps:** `created_at` / `updated_at` stored as ISO text via `datetime('now')`.
- **Currency:** amounts stored as REAL; `moneda` TEXT field alongside. Guaraníes amounts use `_gs` suffix (e.g. `importe_gs`).
- WAL mode and foreign keys are enabled on every connection.

### Google Sheets Integration

`migracion_apps_script.gs` — one-time import of 16 suppliers + 33 shipments from Sheets into the app.  
`sincronizar_apps_script.gs` — ongoing sync; handles Spanish locale date parsing (`dd/mm/yyyy`) and number parsing (dot-thousand, comma-decimal).

The standalone `Dashboard COMEX (standalone).html` is a self-contained single-file build (all JS/CSS inlined) used when the Node server is not available.

---

## BSC Semar

`Claude/Projects/BSC Semar/`

Google Apps Script web app (6 HTML pages). No local server — deployed directly to Google Sites. Pages: Resumen, Mapa Estratégico, Ruta Crítica, KPIs, Iniciativas, Directorio. Strategic plan covers 2026–2030.

---

## Brand / Promociones SEMAR

`Claude/Projects/Promociones SEMAR/`

- Brand colors: `#004481` (navy), `#85C226` (green)
- Typography: Poppins
- See `FORMATO_SEMAR.md` for full brand identity spec before creating any UI.

---

## General Patterns

- All projects target Google Workspace (Sheets, Drive, Sites, Apps Script) as cloud backend.
- HTML dashboards are built as single self-contained files when a server isn't practical.
- Spanish locale throughout: dates `dd/mm/yyyy`, numbers with `.` thousands separator and `,` decimal.
