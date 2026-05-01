import fs from 'fs';
import path from 'path';
import { getContext } from '../context/bus.js';
import { generateContent } from './llm_client.js';
import { executeTool } from '../tools/executor.js';
import { logger } from '../logger.js';
import { AgentDecisionSchema, IntentClassificationSchema } from '../validation.js';
import { logAgentStep } from './logger.js';
import { eventBus, EVENTS } from '../events/event_bus.js';
import db from '../db.js';

/**
 * Agent Engine
 * Responsibilities:
 * - Load Agent Definition
 * - Fetch Context from Context Bus (Synchronous)
 * - Run LLM reasoning loop
 * - Validate structured output (Decision or Classification)
 * - Record to Agent Memory
 */
export async function runAgent(agentTemplateId: string, inputData: any, correlationId: string, causationId: string) {
  const agentPath = path.join(process.cwd(), 'agents', `${agentTemplateId}.json`);
  
  // Validation: Check if agent definition exists physically
  if (!fs.existsSync(agentPath)) {
    logger.error('AGENT_DEFINITION_NOT_FOUND', new Error(`File not found: ${agentPath}`), { agentId: agentTemplateId });
    throw new Error(`AGENT_NOT_LOADABLE: ${agentTemplateId}`);
  }

  const agentDef = JSON.parse(fs.readFileSync(agentPath, 'utf8'));
  const leadId = inputData.lead_id;
  
  // 0. Hard Execution Guard
  const { state: conversationState } = await getContext({ leadId });
  if (conversationState?.phase === 'finalized') {
    logger.warn('AGENT_EXECUTION_SKIPPED', { agentId: agentTemplateId, leadId, reason: 'System finalized' });
    return { status: 'skipped', reason: 'finalized' };
  }

  const name = agentDef.identity.name;
  const startTime = Date.now();

  try {
    // 1. Context Assembly
    const context = await getContext({ leadId, agentTemplateId });
    
    // 2. Reasoning Prompt
    const prompt = `
      You are an AI Agent: ${JSON.stringify(agentDef.identity)}
      
      SYSTEM TIME (UTC): ${new Date().toISOString()}
      BUSINESS TIMEZONE: ${context.business_profile.timezone || 'UTC'}
      
      INPUT DATA: ${JSON.stringify(inputData)}
      
      CONTEXT:
      Business: ${JSON.stringify(context.business_profile)}
      Customer: ${JSON.stringify(context.customer_profile)}
      Conversation State: ${JSON.stringify(context.conversation_state)}
      History Summary: ${JSON.stringify(context.memory_summary)}
      Recent Memory: ${JSON.stringify(context.agent_memory)}
      Schedule Info: ${JSON.stringify(context.schedule)}
      
      TASK: ${agentDef.objective || agentDef.reasoning}
      REASONING RULES: ${JSON.stringify(agentDef.reasoning_rules || [])}
      
      OUTPUT FORMAT: JSON ONLY matching this schema:
      ${JSON.stringify(agentDef.output_schema)}
    `;

    logAgentStep(leadId, name, 'REASONING', 'Analyzing data for structured output...', undefined, correlationId);
    const response = await generateContent(prompt);
    
    // 3. Decision/Classification & Validation
    let rawResult;
    try {
      // Try parsing the whole response first (standard for JSON mode)
      rawResult = JSON.parse(response);
    } catch (e) {
      // Fallback: Try extracting JSON if model included text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`LLM_MALFORMED_JSON: ${response}`);
      rawResult = JSON.parse(jsonMatch[0]);
    }

    let validatedResult;
    if (agentTemplateId === 'intent_classifier_agent') {
      // 3.1 Intent Healing (Local LLM Resilience)
      const intentMap: Record<string, string> = {
        'scheduling': 'schedule_meeting',
        'schedule': 'schedule_meeting',
        'appointment': 'schedule_meeting',
        'booking': 'schedule_meeting',
        'inquiry': 'general_inquiry',
        'question': 'general_inquiry',
        'support': 'urgent_support',
        'pricing': 'pricing_question',
        'ack': 'acknowledgement',
        'confirm': 'acknowledgement'
      };

      if (rawResult.primary_intent && intentMap[rawResult.primary_intent.toLowerCase()]) {
        rawResult.primary_intent = intentMap[rawResult.primary_intent.toLowerCase()];
      }

      // Normalize target_agents
      if (rawResult.routing && Array.isArray(rawResult.routing.target_agents)) {
        rawResult.routing.target_agents = rawResult.routing.target_agents.map((a: string) => 
          a.toLowerCase().replace(/ /g, '_')
        );
      }

      const parseResult = IntentClassificationSchema.safeParse(rawResult);
      if (!parseResult.success) {
        throw new Error(`INTENT_CLASSIFICATION_VALIDATION_FAILED: ${JSON.stringify(parseResult.error.issues)}`);
      }
      validatedResult = parseResult.data;
      
      // Emit Intent Classified Event
      eventBus.emitFluxEvent(EVENTS.PROCESS.INTENT_CLASSIFIED, { leadId, intent: validatedResult }, correlationId, causationId);
      logAgentStep(leadId, name, 'INTENT_CLASSIFIED', `Classified as ${validatedResult.primary_intent}`, validatedResult, correlationId);
      
      // Update Lead with Intent info for Dashboard
      try {
        db.prepare("UPDATE leads SET intent = ?, intent_confidence = ? WHERE id = ?")
          .run(validatedResult.primary_intent, validatedResult.confidence, leadId);
      } catch (dbErr) {
        logger.error('DB_UPDATE_INTENT_FAILED', dbErr, { leadId });
      }

      return validatedResult;
    } else {
      // Standard Agent Decision (Tool Call)
      const parseResult = AgentDecisionSchema.safeParse(rawResult);
      if (!parseResult.success) {
        throw new Error(`AGENT_DECISION_VALIDATION_FAILED: ${JSON.stringify(parseResult.error.issues)}`);
      }
      const decision = parseResult.data;
      
      eventBus.emitFluxEvent(EVENTS.PROCESS.DECISION_MADE, { decision }, correlationId, causationId);
      logAgentStep(leadId, name, 'DECISION', `Agent selected tool: ${decision.tool}`, decision.parameters, correlationId);

      // 4. Tool Execution / Output Proposal
      if (decision.tool === 'send_sms') {
        // INTERCEPT: Propose action to Coordinator instead of executing
        eventBus.emitFluxEvent(EVENTS.PROCESS.AGENT_OUTPUT_READY, {
          agentId: agentTemplateId,
          proposed_action: {
            type: 'sms',
            priority: agentTemplateId === 'scheduler_agent' ? 'high' : 'medium',
            content: decision.parameters.message,
            data: decision.parameters
          }
        }, correlationId, causationId);
        
        logAgentStep(leadId, name, 'OUTPUT_PROPOSED', 'Proposed SMS response to Coordinator', { message: decision.parameters.message }, correlationId);

        // Record to Agent Memory even for proposals
        db.prepare(`
          INSERT INTO agent_memories (agent_template_id, memory_type, content)
          VALUES (?, ?, ?)
        `).run(agentTemplateId, 'EXECUTION_OUTCOME', JSON.stringify({
          leadId,
          tool: decision.tool,
          type: 'proposal',
          duration: Date.now() - startTime,
          status: 'success'
        }));

        return { status: 'proposed', type: 'sms' };
    } else if (agentTemplateId === 'response_composer_agent') {
      const decision = rawResult; // Composer outputs object with message
      
      // Update phase to finalized
      await MemoryAgent.handleSystemTransition(leadId, 'PHASE_FINALIZED', {}, correlationId);

      eventBus.emitFluxEvent(EVENTS.OUTPUT.FINAL_RESPONSE_READY, {
        phone: context.customer_profile?.phone,
        message: decision.message,
        leadId
      }, correlationId, causationId);
      
      logAgentStep(leadId, name, 'COMPOSITION_COMPLETED', 'Final SMS composed and sent', { message: decision.message }, correlationId);
      return { status: 'finalized' };
    }

    // Standard internal Tool Execution (e.g. check_availability, create_booking)
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
      
      const logStep = toolResult.type === 'availability' ? 'AVAILABILITY_CHECKED' : 
                     toolResult.type === 'booking' ? 'BOOKING_CREATED' : 'TOOL_EXECUTED';

      logAgentStep(leadId, name, logStep, 'Action completed', { 
        duration: `${Date.now() - startTime}ms`,
        result: toolResult 
      }, correlationId);

      return toolResult;

    }
  } catch (error: any) {
    eventBus.emitFluxEvent(EVENTS.SYSTEM.AGENT_FAILED, { error: error.message }, correlationId, causationId);
    logAgentStep(leadId, name, 'ERROR', 'Execution failed', { error: error.message }, correlationId);
    throw error;
  }
}
