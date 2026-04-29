import fs from 'fs';
import path from 'path';
import { getContext } from '../context/bus.js';
import { generateContent } from './llm_client.js';
import { executeTool } from '../tools/executor.js';
import { logger } from '../logger.js';
import { AgentDecisionSchema } from '../validation.js';

import { logAgentStep } from './logger.js';

export async function runAgent(agentName: string, inputData: any) {
  const agentPath = path.join(process.cwd(), 'agents', `${agentName}.json`);
  const agentDef = JSON.parse(fs.readFileSync(agentPath, 'utf8'));
  const leadId = inputData.lead_id;
  const name = agentDef.identity.name;

  try {
    logAgentStep(leadId, name, 'CONTEXT', 'Assembling context');
    const context = await getContext(agentDef.context_injection, inputData);
    logger.info('AGENT_PIPELINE', { lead_id: leadId, step: 'CONTEXT_ASSEMBLED' });

    const prompt = `
    You are an AI Agent with identity: ${JSON.stringify(agentDef.identity)}
    Context: ${JSON.stringify(context)}
    Tools available: ${JSON.stringify(agentDef.tools)}
    Your task: ${agentDef.reasoning}. 
    Policy: ${agentDef.decision_policy}
    
    Output ONLY raw JSON matching this schema:
    { "tool": "string", "parameters": { ... } }
  `;
    
    logAgentStep(leadId, name, 'LLM_START', 'Calling Gemini');
    const response = await generateContent(prompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('LLM_MALFORMED_JSON');
    
    const decision = AgentDecisionSchema.parse(JSON.parse(jsonMatch[0]));
    logAgentStep(leadId, name, 'DECISION', `Agent decided to use ${decision.tool}`, decision.parameters);
    logger.info('AGENT_PIPELINE', { lead_id: leadId, step: 'DECISION_VALIDATED', tool: decision.tool });

    const result = await executeTool(decision.tool, decision.parameters, leadId);
    logAgentStep(leadId, name, 'TOOL_EXECUTED', 'Tool executed successfully', { result });
    logger.info('AGENT_PIPELINE', { lead_id: leadId, step: 'TOOL_EXECUTED', result });

    return result;
  } catch (error) {
    logAgentStep(leadId, agentName, 'ERROR', 'Agent execution failed', { error: (error as any).message });
    logger.error('AGENT_PIPELINE_FAILED', error, { lead_id: leadId });
    throw error;
  }
}
