import db from '../db.js';

export function logAgentStep(leadId: number, agentName: string, step: string, message: string, details?: any) {
  console.log(`[${agentName}][${step}] ${message}`);
  db.prepare(`
    INSERT INTO agent_logs (lead_id, agent_name, step, message, details) 
    VALUES (?, ?, ?, ?, ?)
  `).run(leadId, agentName, step, message, JSON.stringify(details || {}));
}
