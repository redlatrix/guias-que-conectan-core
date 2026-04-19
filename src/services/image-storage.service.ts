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

  async download(url: string, filename: string): Promise<string> {
    const filePath = path.join(STORAGE_PATH, filename);

    const response = await axios.get<Buffer>(url, {
      responseType: 'arraybuffer',
      timeout: 30_000,
    });

    fs.writeFileSync(filePath, response.data);

    // URL pública: /storage/images/uuid.png
    return `${PUBLIC_STORAGE_URL}/${filename}`;
  },
};
