import { v4 as uuidv4 } from 'uuid';
import { openaiService } from './openai.service';
import { imageStorageService } from './image-storage.service';
import { recursoRepository } from '../repositories/recurso.repository';

/**
 * Parser de imágenes.
 *
 * Busca etiquetas [IMAGE: "descripción"] en el texto generado por ChatGPT,
 * llama a DALL-E por cada una, descarga la imagen a disco local,
 * crea un registro en recurso_complementario y reemplaza la etiqueta
 * por la ruta local en formato Markdown.
 *
 * Patrón: [IMAGE: "mapa político de Colombia"]
 */
export const imageParserService = {

  /**
   * Procesa el texto raw de IA y devuelve el texto con las rutas locales de imagen.
   * También crea los registros de recurso_complementario en BD.
   *
   * @param rawText  Texto generado por ChatGPT con posibles etiquetas [IMAGE: "..."]
   * @param guiaId   ID de la guía ya persistida
   */
  async process(rawText: string, guiaId: number): Promise<string> {
    // Regex que captura el prompt dentro de [IMAGE: "..."]
    const IMAGE_TAG = /\[IMAGE:\s*"([^"]+)"\]/g;
    let processedText = rawText;
    const matches = [...rawText.matchAll(IMAGE_TAG)];

    for (const match of matches) {
      const fullTag = match[0];       // e.g. [IMAGE: "mapa de Colombia"]
      const prompt  = match[1].trim(); // e.g. "mapa de Colombia"

      try {
        console.log(`🎨 Generando imagen: "${prompt}"`);

        // 1. Llamar a DALL-E
        const tempUrl = await openaiService.generateImage(prompt);

        // 2. Descargar y guardar en disco
        const filename = `${uuidv4()}.png`;
        const localUrl = await imageStorageService.download(tempUrl, filename);

        // 3. Registrar en BD como recurso complementario
        await recursoRepository.create({
          guia_id: guiaId,
          tipo: 'IMAGEN',
          url_almacenamiento: localUrl,
          prompt_generacion: prompt,
        });

        // 4. Reemplazar la etiqueta por imagen Markdown con ruta local
        const markdownImg = `![${prompt}](${localUrl})`;
        processedText = processedText.replace(fullTag, markdownImg);

        console.log(`✅ Imagen guardada: ${localUrl}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error generando imagen "${prompt}": ${errMsg}`);
        // Si falla una imagen, dejar la etiqueta con un comentario de error
        processedText = processedText.replace(
          fullTag,
          `[⚠️ Imagen no disponible: ${prompt}]`
        );
      }
    }

    return processedText;
  },
};
