import OpenAI from 'openai';

/**
 * Cliente OpenAI inicializado con la API key de la universidad.
 * Se usa en openai.service.ts para chat completions y DALL-E.
 */
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export default openaiClient;
