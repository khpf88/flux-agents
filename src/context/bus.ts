import db from '../db.js';

export interface AgentContext {
  business_profile: Record<string, string>;
  customer_profile: Record<string, any> | null;
  conversation_history: any[];
  system_state: Record<string, any>;
}

export async function getContext(injectionPoints: string[], data: any): Promise<AgentContext> {
  const context: AgentContext = {
    business_profile: {},
    customer_profile: null,
    conversation_history: [],
    system_state: { timestamp: new Date().toISOString() }
  };

  if (injectionPoints.includes('business_profile')) {
    const config = db.prepare('SELECT * FROM business_config').all() as { key: string, value: string }[];
    context.business_profile = config.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
  }

  if (injectionPoints.includes('customer_profile') && data.lead_id) {
    context.customer_profile = db.prepare('SELECT * FROM leads WHERE id = ?').get(data.lead_id) as any;
  }

  return context;
}
