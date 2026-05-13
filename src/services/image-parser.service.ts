import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { openaiService } from './openai.service';
import { imageStorageService } from './image-storage.service';
import { recursoRepository } from '../repositories/recurso.repository';

export const imageParserService = {

  /** Genera una sola imagen DALL-E y la persiste. Devuelve la URL local. */
  async generarImagen(prompt: string, guiaId: number): Promise<string> {
    const dallePrompt = `Colorful educational infographic illustration, flat design, isometric style, soft pastel colors, clean and simple composition, no text labels, no photorealism, no real people. Visual elements related to: ${prompt}`;
    const b64      = await openaiService.generateImage(dallePrompt);
    const filename = `${uuidv4()}.png`;
    const localUrl = await imageStorageService.saveBase64(b64, filename);
    await recursoRepository.create({
      guia_id: guiaId,
      tipo: 'IMAGEN',
      url_almacenamiento: localUrl,
      prompt_generacion: prompt,
    });
    return localUrl;
  },

  async process(rawText: string, guiaId: number): Promise<string> {
    const IMAGE_TAG = /\[IMAGE:\s*"([^"]+)"\]/g;
    let processedText = rawText;
    const matches = [...rawText.matchAll(IMAGE_TAG)];

    for (const match of matches) {
      const fullTag = match[0];
      const prompt  = match[1].trim();

      // 0. Respetar flag de habilitación de imágenes
      const imageEnabled = process.env.OPENAI_IMAGE_ENABLED !== 'false';

      // 1. Buscar recursos siempre — independiente de si la imagen funciona
      const recursos = await buscarRecursos(prompt);
      const recursosBlock = recursos.length > 0
        ? '\n\n**📚 Recursos para profundizar:**\n' + recursos.join('\n')
        : '';

      // 2. Generar imagen (puede fallar sin afectar los recursos)
      let imagenMarkdown = ''; // vacío si imagen deshabilitada o falla
      if (imageEnabled) try {
        console.log(`🎨 Generando imagen: "${prompt}"`);

        const dallePrompt = `Colorful educational infographic illustration, flat design, isometric style, soft pastel colors, clean and simple composition, no text labels, no photorealism, no real people. Visual elements related to: ${prompt}`;
        const b64      = await openaiService.generateImage(dallePrompt);
        const filename = `${uuidv4()}.png`;
        const localUrl = await imageStorageService.saveBase64(b64, filename);

        await recursoRepository.create({
          guia_id: guiaId,
          tipo: 'IMAGEN',
          url_almacenamiento: localUrl,
          prompt_generacion: prompt,
        });

        imagenMarkdown = `![${prompt}](${localUrl})`;
        console.log(`✅ Imagen guardada: ${localUrl} | ${recursos.length} recursos encontrados`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error procesando imagen "${prompt}": ${errMsg}`);
      }

      // 3. Reemplazar etiqueta — recursos aparecen siempre
      processedText = processedText.replace(fullTag, imagenMarkdown + recursosBlock);
    }

    return processedText;
  },
};

/**
 * Busca recursos reales del tema: artículos de Wikipedia en español,
 * Google Scholar y Colombia Aprende.
 * Retorna hasta 5 links en formato Markdown.
 */
async function buscarRecursos(tema: string): Promise<string[]> {
  const recursos: string[] = [];

  // 1. Artículos de Wikipedia en español (API real, sin alucinaciones)
  try {
    const { data } = await axios.get('https://es.wikipedia.org/w/api.php', {
      params: {
        action:   'query',
        list:     'search',
        srsearch: tema,
        srlimit:  '4',
        srprop:   'title',
        format:   'json',
      },
      timeout: 6000,
    });

    const resultados: Array<{ title: string }> = data?.query?.search ?? [];
    for (const r of resultados.slice(0, 3)) {
      const url = `https://es.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`;
      recursos.push(`- 📖 [${r.title} — Wikipedia](${url})`);
    }
  } catch {
    console.warn('⚠️  Wikipedia API no respondió');
  }

  // 2. Artículos académicos — Google Scholar
  const scholarQ = encodeURIComponent(`${tema} colombia educación`);
  recursos.push(`- 🎓 [Artículos académicos sobre este tema — Google Scholar](https://scholar.google.com/scholar?q=${scholarQ})`);

  return recursos;
}
