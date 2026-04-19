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
  async generateImage(prompt: string): Promise<string> {
    const model = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';

    const response = await openaiClient.images.generate({
      model,
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    });

    const url = response.data?.[0]?.url;
    if (!url) throw new Error('DALL-E no devolvió URL de imagen');
    return url;
  },
};
