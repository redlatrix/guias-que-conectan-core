import openaiClient from '../config/openai';
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const openaiService = {
  /**
   * Llama a ChatGPT con una lista de mensajes.
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const model = process.env.OPENAI_MODEL || 'gpt-5o-mini';

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
   * Genera una imagen con gpt-image-1 / gpt-image-1-mini.
   */
  async generateImage(prompt: string): Promise<string> {
    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini';

    const response = await openaiClient.images.generate({
      model,
      prompt,
      n: 1,
      size: '512x512',
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error('gpt-image-1 no devolvió imagen en base64');
    return b64;
  },
};
