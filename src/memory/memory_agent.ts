import db from '../db.js';
import { logger } from '../logger.js';
import { generateContent } from '../agent_engine/llm_client.js';
import { eventBus, EVENTS } from '../events/event_bus.js';

export interface ConversationState {
  lead_id: number;
  state: 'new_lead' | 'scheduling_requested' | 'awaiting_availability' | 'awaiting_time_selection' | 'booking_confirmed' | 'general_inquiry';
  phase: 'collecting' | 'coordinating' | 'finalized';
  active_intent: string | null;
  last_agent: string | null;
  proposed_slots: string[];
  selected_slot: string | null;
  booking_confirmed: boolean;
  last_updated: string;
}

export interface ConversationMemory {
  summary: string;
  key_facts: string[];
  sentiment: string;
}

/**
 * Conversation Memory Agent
 * Responsibilities:
 * - Manage conversation state machine
 * - Summarize conversation history
 * - Provide persistent context for agents
 */
export class MemoryAgent {
  
  static async loadMemory(leadId: number): Promise<{ state: ConversationState, memory: ConversationMemory }> {
    const row = db.prepare('SELECT * FROM conversation_memory WHERE lead_id = ?').get(leadId) as any;
    
    if (!row) {
      const initialState: ConversationState = {
        lead_id: leadId,
        state: 'new_lead',
        phase: 'collecting',
        active_intent: null,
        last_agent: null,
        proposed_slots: [],
        selected_slot: null,
        booking_confirmed: false,
        last_updated: new Date().toISOString()
      };
      const initialMemory: ConversationMemory = {
        summary: "New lead. No conversation yet.",
        key_facts: [],
        sentiment: "neutral"
      };
      return { state: initialState, memory: initialMemory };
    }

    return {
      state: JSON.parse(row.state),
      memory: JSON.parse(row.summary)
    };
  }

  static async persistMemory(leadId: number, state: ConversationState, memory: ConversationMemory) {
    db.prepare(`
      INSERT INTO conversation_memory (lead_id, state, summary, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(lead_id) DO UPDATE SET
        state = excluded.state,
        summary = excluded.summary,
        updated_at = excluded.updated_at
    `).run(
      leadId, 
      JSON.stringify(state), 
      JSON.stringify(memory), 
      new Date().toISOString()
    );
  }

  static async recordTurn(leadId: number, role: 'user' | 'assistant', content: string, correlationId: string) {
    db.prepare(`
      INSERT INTO conversation_turns (lead_id, role, content, correlation_id)
      VALUES (?, ?, ?, ?)
    `).run(leadId, role, content, correlationId);
  }

  static async updateState(leadId: number, intent: any, correlationId: string): Promise<ConversationState> {
    const { state: currentState, memory } = await this.loadMemory(leadId);
    const newState = { ...currentState, last_updated: new Date().toISOString() };
    const oldStateName = currentState.state;

    // Transition Logic
    if (intent.primary_intent === 'schedule_meeting') {
      newState.state = 'scheduling_requested';
      newState.active_intent = 'schedule_meeting';
    } else if (intent.primary_intent === 'acknowledgement' && currentState.state === 'awaiting_time_selection') {
      // Logic for confirming a slot would happen after user picks one, 
      // but for now let's handle the transition to booking_confirmed if they seem to agree
      // (This is a simplified transition for the agent to refine later)
    } else if (intent.primary_intent === 'general_inquiry') {
      newState.state = 'general_inquiry';
    }

    // System-triggered transitions (e.g. availability provided) are handled via events
    
    if (oldStateName !== newState.state) {
      logger.info('STATE_TRANSITION', { from: oldStateName, to: newState.state, leadId });
      eventBus.emitFluxEvent(EVENTS.PROCESS.MEMORY_UPDATED, { leadId, state: newState }, correlationId);
    }

    await this.persistMemory(leadId, newState, memory);
    return newState;
  }

  static async handleSystemTransition(leadId: number, transition: string, data: any, correlationId: string) {
    const { state: currentState, memory } = await this.loadMemory(leadId);
    const newState = { ...currentState, last_updated: new Date().toISOString() };
    const oldStateName = currentState.state;

    if (transition === 'AVAILABILITY_PROVIDED') {
      newState.state = 'awaiting_time_selection';
      newState.proposed_slots = data.slots || [];
    } else if (transition === 'BOOKING_CREATED') {
      newState.state = 'booking_confirmed';
      newState.booking_confirmed = true;
      newState.selected_slot = data.startTime;
    } else if (transition === 'PHASE_FINALIZED') {
      newState.phase = 'finalized';
    }

    if (oldStateName !== newState.state) {
      logger.info('STATE_TRANSITION', { from: oldStateName, to: newState.state, leadId });
      eventBus.emitFluxEvent(EVENTS.PROCESS.MEMORY_UPDATED, { leadId, state: newState }, correlationId);
    }

    await this.persistMemory(leadId, newState, memory);
  }

  static async summarizeConversation(leadId: number): Promise<ConversationMemory> {
    const turns = db.prepare(`
      SELECT role, content FROM conversation_turns 
      WHERE lead_id = ? 
      ORDER BY created_at ASC 
      LIMIT 20
    `).all(leadId) as { role: string, content: string }[];

    if (turns.length === 0) {
      return { summary: "No conversation history.", key_facts: [], sentiment: "neutral" };
    }

    const historyStr = turns.map(t => `${t.role.toUpperCase()}: ${t.content}`).join('\n');
    
    const prompt = `
      Summarize the following conversation between an AI assistant and a customer.
      Identify key facts (preferences, names, services mentioned) and the current sentiment.
      
      CONVERSATION:
      ${historyStr}
      
      OUTPUT FORMAT: JSON ONLY
      {
        "summary": "Short 1-2 sentence summary",
        "key_facts": ["fact 1", "fact 2"],
        "sentiment": "positive/neutral/negative"
      }
    `;

    try {
      const response = await generateContent(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('MALFORMED_SUMMARY_JSON');
      const memory = JSON.parse(jsonMatch[0]) as ConversationMemory;
      
      logger.info('MEMORY_SUMMARY_CREATED', { leadId, summary: memory.summary });
      return memory;
    } catch (error) {
      logger.error('SUMMARIZATION_FAILED', error, { leadId });
      return { summary: "Error generating summary.", key_facts: [], sentiment: "unknown" };
    }
  }
}
