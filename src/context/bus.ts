import db from '../db.js';
import { logger } from '../logger.js';
import { MemoryAgent, ConversationState, ConversationMemory } from '../memory/memory_agent.js';

export interface AgentContext {
  business_profile: Record<string, string>;
  customer_profile: Record<string, any> | null;
  conversation_history: any[];
  system_state: Record<string, any>;
  agent_memory?: any[];
  conversation_state?: ConversationState;
  memory_summary?: ConversationMemory;
  agent_outputs?: any[];
  schedule?: {
    existing_bookings: any[];
    business_hours: any;
  };
}

/**
 * Context Bus Service
 * Responsibilities: Aggregate data from DB and system state synchronously at request-time.
 */
export async function getContext(params: { leadId?: number, agentTemplateId?: string }): Promise<AgentContext> {
  const context: AgentContext = {
    business_profile: {},
    customer_profile: null,
    conversation_history: [],
    system_state: { 
      timestamp: new Date().toISOString(),
      platform: 'Flux Agents v1.2'
    },
    schedule: {
      existing_bookings: [],
      business_hours: { mon_fri: "9am-5pm", sat_sun: "closed" }
    }
  };

  // 1. Fetch Business Profile
  try {
    const config = db.prepare('SELECT * FROM business_config').all() as { key: string, value: string }[];
    context.business_profile = config.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
  } catch (error) {
    logger.error('CONTEXT_BUS_ERROR', error, { step: 'business_profile' });
  }

  // 2. Fetch Customer Profile & Conversation Memory
  if (params.leadId) {
    try {
      context.customer_profile = db.prepare('SELECT * FROM leads WHERE id = ?').get(params.leadId) as any;
      
      // Memory Agent Integration
      const { state, memory } = await MemoryAgent.loadMemory(params.leadId);
      context.conversation_state = state;
      context.memory_summary = memory;

      // Raw history (turns) - Trimmed for latency
      context.conversation_history = db.prepare(`
        SELECT role, content FROM conversation_turns 
        WHERE lead_id = ? 
        ORDER BY created_at DESC LIMIT 3
      `).all(params.leadId);

    } catch (error) {
      logger.error('CONTEXT_BUS_ERROR', error, { step: 'customer_profile_and_memory', leadId: params.leadId });
    }
  }

  // 3. Fetch Agent Memory (Insights/Patterns)
  if (params.agentTemplateId) {
    try {
      context.agent_memory = db.prepare(`
        SELECT * FROM agent_memories 
        WHERE agent_template_id = ? 
        ORDER BY created_at DESC LIMIT 5
      `).all(params.agentTemplateId);
    } catch (error) {
      logger.error('CONTEXT_BUS_ERROR', error, { step: 'agent_memory', agentTemplateId: params.agentTemplateId });
    }
  }

  // 4. Fetch Existing Bookings
  try {
    context.schedule!.existing_bookings = db.prepare(`
      SELECT * FROM bookings 
      WHERE start_time > datetime('now')
      ORDER BY start_time ASC
    `).all();
  } catch (error) {
    logger.error('CONTEXT_BUS_ERROR', error, { step: 'existing_bookings' });
  }

  return context;
}
