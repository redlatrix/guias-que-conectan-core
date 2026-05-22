import 'dotenv/config';
import express from 'express';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger';
import { errorMiddleware } from './middlewares/error.middleware';

import catalogoRoutes from './routes/catalogo.routes';
import sesionRoutes   from './routes/sesion.routes';
import guiaRoutes     from './routes/guia.routes';

// Inicializar storage al arrancar
import './config/storage';

const app = express();
const cors = require('cors');

// CORS_ORIGINS en .env: lista separada por comas de los dominios permitidos.
// Ejemplo: CORS_ORIGINS=http://localhost:5173,https://app.guiasqueconectan.ml-ware.com
const allowedOrigins: string[] = (
  process.env.CORS_ORIGINS ?? 'http://localhost:5173'
).split(',').map((o) => o.trim());

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir peticiones sin origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin no permitido → ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsers ──────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Imágenes estáticas ────────────────────────────────────
// Sirve /storage/images/:filename desde ./storage/images/
const storagePath = path.resolve(process.env.STORAGE_PATH || './storage/images');
app.use('/storage/images', express.static(storagePath));

// ── Health check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:   'ok',
    servicio: 'guias-que-conectan-core',
    timestamp: new Date().toISOString(),
  });
});

// ── Swagger UI ────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Guías que Conectan — Core API',
}));

// ── Rutas de negocio ──────────────────────────────────────
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/sesiones', sesionRoutes);
app.use('/api/guias',    guiaRoutes);

// ── Ruta no encontrada ────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Handler global de errores (debe ir último) ────────────
app.use(errorMiddleware as any);

export default app;
