import db from '../db.js';

export function logAgentStep(leadId: number, agentName: string, step: string, message: string, details?: any, correlationId?: string) {
  console.log(`[${agentName}][${step}] ${message}`);
  db.prepare(`
    INSERT INTO agent_logs (lead_id, agent_name, step, message, details, correlation_id) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(leadId, agentName, step, message, JSON.stringify(details || {}), correlationId || null);
}
