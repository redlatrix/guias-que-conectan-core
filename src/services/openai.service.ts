import openaiClient from '../config/openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Wrapper del SDK de OpenAI v4.
 * Expone chat completions y generación de imágenes con DALL-E.
 */
export const openaiService = {

  /**
   * Llama a ChatGPT con una lista de mensajes.
   * Retorna el texto de la respuesta.
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const completion = await openaiClient.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('OpenAI no devolvió contenido en la respuesta');
    return content;
  },

  /**
   * Genera una imagen con DALL-E a partir de un prompt.
   * Retorna la URL temporal (válida ~60 minutos).
   */
  /**
   * Genera una imagen con gpt-image-1 / gpt-image-1-mini.
   * Los modelos nuevos devuelven base64 (b64_json), no URL temporal.
   * Retorna el string base64 para que el caller lo persista en disco.
   */
  async generateImage(prompt: string): Promise<string> {
    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini';

    const response = await openaiClient.images.generate({
      model,
      prompt,
      n: 1,
      size: '1024x1024',
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error('gpt-image-1 no devolvió imagen en base64');
    return b64;
  },
};
