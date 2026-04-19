import path from 'path';
import fs from 'fs';

/**
 * Ruta absoluta a la carpeta de imágenes generadas por DALL-E.
 * Se crea automáticamente si no existe.
 */
export const STORAGE_PATH = path.resolve(
  process.env.STORAGE_PATH || './storage/images'
);

/**
 * Prefijo de URL para servir imágenes estáticas al cliente.
 * Ejemplo: /storage/images/uuid.png
 */
export const PUBLIC_STORAGE_URL = process.env.PUBLIC_STORAGE_URL || '/storage/images';

// Asegurar que la carpeta exista al iniciar
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
  console.log(`📁 Carpeta de almacenamiento creada: ${STORAGE_PATH}`);
}
