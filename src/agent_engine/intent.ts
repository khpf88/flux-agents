import { generateContent } from './llm_client.js';
import { logger } from '../logger.js';

export async function classifyIntent(message: string): Promise<{ intent: 'scheduling' | 'general'; confidence: number }> {
  const prompt = `
    Analyze the following customer message and classify its intent.
    Intent categories:
    - 'scheduling': Customer wants to book a meeting, schedule a call, check availability, or see an appointment.
    - 'general': General inquiries, greetings, or other questions.

    Message: "${message}"

    Output ONLY raw JSON:
    { "intent": "scheduling" | "general", "confidence": number }
  `;

  try {
    const response = await generateContent(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('INTENT_MALFORMED_JSON');
    
    const result = JSON.parse(jsonMatch[0]);
    return {
      intent: result.intent || 'general',
      confidence: result.confidence || 0
    };
  } catch (error) {
    logger.error('INTENT_CLASSIFICATION_FAILED', error, { message });
    return { intent: 'general', confidence: 0 };
  }
}
