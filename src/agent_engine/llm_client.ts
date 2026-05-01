import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Gemini Provider Implementation
 */
async function generateGemini(prompt: string) {
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const model = genAI.getGenerativeModel({ model: modelName });
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * Ollama Provider Implementation
 */
async function generateOllama(prompt: string) {
  const url = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2';

  try {
    const response = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP Error: ${response.status}`);
    }

    const data: any = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama API Error:', error);
    throw error;
  }
}

/**
 * Unified Entry Point
 */
export async function generateContent(prompt: string) {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

  try {
    if (provider === 'ollama') {
      return await generateOllama(prompt);
    }
    return await generateGemini(prompt);
  } catch (error) {
    console.error(`LLM Provider Error (${provider}):`, error);
    throw error;
  }
}
