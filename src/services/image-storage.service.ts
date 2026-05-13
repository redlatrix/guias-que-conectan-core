import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { STORAGE_PATH, PUBLIC_STORAGE_URL } from '../config/storage';

/**
 * Descarga una imagen desde una URL temporal (como las de DALL-E)
 * y la guarda en disco local.
 *
 * Retorna la URL pública local para servir la imagen al cliente.
 */
export const imageStorageService = {

  /** Descarga desde URL temporal (legacy — DALL-E 2/3, ya retirados) */
  async download(url: string, filename: string): Promise<string> {
    const filePath = path.join(STORAGE_PATH, filename);

    const response = await axios.get<Buffer>(url, {
      responseType: 'arraybuffer',
      timeout: 30_000,
    });

    fs.writeFileSync(filePath, response.data);
    return `${PUBLIC_STORAGE_URL}/${filename}`;
  },

  /** Guarda imagen desde string base64 (gpt-image-1 / gpt-image-1-mini) */
  async saveBase64(b64: string, filename: string): Promise<string> {
    const filePath = path.join(STORAGE_PATH, filename);
    fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
    return `${PUBLIC_STORAGE_URL}/${filename}`;
  },
};
