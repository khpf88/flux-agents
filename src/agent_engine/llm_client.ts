import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import db from '../db.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Cache Helpers
 */
function getCachedResponse(prompt: string, provider: string, model: string) {
  const hash = crypto.createHash('sha256').update(prompt).digest('hex');
  return db.prepare('SELECT response FROM llm_cache WHERE prompt_hash = ? AND provider = ? AND model = ?')
    .get(hash, provider, model) as { response: string } | undefined;
}

function saveToCache(prompt: string, response: string, provider: string, model: string) {
  const hash = crypto.createHash('sha256').update(prompt).digest('hex');
  db.prepare('INSERT OR REPLACE INTO llm_cache (prompt_hash, prompt, response, provider, model) VALUES (?, ?, ?, ?, ?)')
    .run(hash, prompt, response, provider, model);
}

/**
 * Gemini Provider Implementation
 */
async function generateGemini(prompt: string) {
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  // Cache Check
  const cached = getCachedResponse(prompt, 'gemini', modelName);
  if (cached) return cached.response;

  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  saveToCache(prompt, text, 'gemini', modelName);
  return text;
}

/**
 * Ollama Provider Implementation
 */
async function generateOllama(prompt: string) {
  const url = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2';

  // Cache Check
  const cached = getCachedResponse(prompt, 'ollama', model);
  if (cached) return cached.response;

  try {
    const response = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        format: "json"
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP Error: ${response.status}`);
    }

    const data: any = await response.json();
    const text = data.response;

    saveToCache(prompt, text, 'ollama', model);
    return text;
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
