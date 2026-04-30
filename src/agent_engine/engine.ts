import fs from 'fs';
import path from 'path';
import { getContext } from '../context/bus.js';
import { generateContent } from './llm_client.js';
import { executeTool } from '../tools/executor.js';
import { logger } from '../logger.js';
import { AgentDecisionSchema } from '../validation.js';
import { logAgentStep } from './logger.js';
import { eventBus, EVENTS } from '../events/event_bus.js';
import db from '../db.js';

/**
 * Agent Engine
 * Responsibilities:
 * - Load Agent Definition
 * - Fetch Context from Context Bus (Synchronous)
 * - Run LLM reasoning loop
 * - Record to Agent Memory
 */
export async function runAgent(agentTemplateId: string, inputData: any, correlationId: string, causationId: string) {
  const agentPath = path.join(process.cwd(), 'agents', `${agentTemplateId}.json`);
  const agentDef = JSON.parse(fs.readFileSync(agentPath, 'utf8'));
  const leadId = inputData.lead_id;
  const name = agentDef.identity.name;
  const startTime = Date.now();

  try {
    // 1. Context Assembly (Synchronous Service Call)
    // NO EVENT EMITTED HERE
    const context = await getContext({ leadId, agentTemplateId });
    
    // 2. Reasoning Prompt
    const prompt = `
      You are an AI Agent: ${JSON.stringify(agentDef.identity)}
      CONTEXT:
      Business: ${JSON.stringify(context.business_profile)}
      Customer: ${JSON.stringify(context.customer_profile)}
      Recent Memory: ${JSON.stringify(context.agent_memory)}
      TOOLS: ${JSON.stringify(agentDef.tools)}
      TASK: ${agentDef.reasoning}
      OUTPUT: JSON ONLY matching { "tool": "string", "parameters": { ... } }
    `;

    logAgentStep(leadId, name, 'REASONING', 'Analyzing context and memory...');
    const response = await generateContent(prompt);
    
    // 3. Decision & Validation
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('LLM_MALFORMED_JSON');
    const decision = AgentDecisionSchema.parse(JSON.parse(jsonMatch[0]));
    
    // Emit Decision Made
    eventBus.emitFluxEvent(EVENTS.PROCESS.DECISION_MADE, { decision }, correlationId, causationId);
    logAgentStep(leadId, name, 'DECISION', `Agent selected tool: ${decision.tool}`, decision.parameters);

    // 4. Tool Execution with internal failure handling
    let toolResult;
    try {
      toolResult = await executeTool(decision.tool, decision.parameters, leadId, correlationId, causationId);
    } catch (toolError: any) {
      eventBus.emitFluxEvent(
        EVENTS.SYSTEM.TOOL_FAILED, 
        { tool: decision.tool, error: toolError.message }, 
        correlationId, 
        causationId
      );
      throw toolError;
    }
    
    // 5. Agent Memory Write
    db.prepare(`
      INSERT INTO agent_memories (agent_template_id, memory_type, content)
      VALUES (?, ?, ?)
    `).run(agentTemplateId, 'EXECUTION_OUTCOME', JSON.stringify({
      leadId,
      tool: decision.tool,
      duration: Date.now() - startTime,
      status: 'success'
    }));

    eventBus.emitFluxEvent(EVENTS.OUTPUT.FOLLOWUP_COMPLETED, { toolResult }, correlationId, causationId);
    
    // Determine step name for logging (e.g. AVAILABILITY_CHECKED)
    const logStep = toolResult.type === 'availability' ? 'AVAILABILITY_CHECKED' : 
                   toolResult.type === 'booking' ? 'BOOKING_CREATED' : 'TOOL_EXECUTED';

    logAgentStep(leadId, name, logStep, 'Action completed', { 
      duration: `${Date.now() - startTime}ms`,
      result: toolResult 
    });

    // Update Lead Status
    try {
      db.prepare("UPDATE leads SET status = 'Followed-up' WHERE id = ?").run(leadId);
    } catch (dbErr) {
      logger.error('STATUS_UPDATE_FAILED', dbErr, { leadId });
    }

    return toolResult;
  } catch (error: any) {
    eventBus.emitFluxEvent(EVENTS.SYSTEM.AGENT_FAILED, { error: error.message }, correlationId, causationId);
    logAgentStep(leadId, name, 'ERROR', 'Execution failed', { error: error.message });
    throw error;
  }
}
