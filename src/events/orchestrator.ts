import { eventBus, EVENTS, FluxEvent } from './event_bus.js';
import { enqueueAgentTask } from './worker.js';
import { logger } from '../logger.js';
import { logAgentStep } from '../agent_engine/logger.js';

/**
 * Orchestrator
 * Responsibilities:
 * - Subscribe to Input Events
 * - Route to Intent Classifier
 * - Handle Intent Routing Decisions
 * - Manage Retries
 */
export function initializeOrchestrator() {
  
  // 1. Lead Created -> Trigger Intent Classifier Agent
  eventBus.subscribe(EVENTS.INPUT.LEAD_CREATED, async (event: FluxEvent) => {
    const lead = event.payload;
    logger.info('ORCHESTRATOR_START', { lead_id: lead.id, correlationId: event.correlationId });

    // Step 1: Trigger the central Classifier Agent
    enqueueAgentTask('intent_classifier_agent', { lead_id: lead.id, message: lead.message });
  });

  // 2. Intent Classified -> Route to Downstream Agent(s)
  eventBus.subscribe(EVENTS.PROCESS.INTENT_CLASSIFIED, (event: FluxEvent) => {
    const { intent, leadId } = event.payload;
    const { primary_intent, confidence, routing } = intent;
    
    logger.info('ROUTING_DECISION', { leadId, primary_intent, confidence });

    // Hardening: Confidence Threshold Check
    const CONFIDENCE_THRESHOLD = 0.6;
    let targetAgents = routing.target_agents || [];

    if (confidence < CONFIDENCE_THRESHOLD) {
      logger.info('LOW_CONFIDENCE_FALLBACK', { leadId, confidence });
      logAgentStep(leadId, 'System', 'ROUTING', `Low confidence (${Math.round(confidence * 100)}%). Falling back to general follow-up.`, { primary_intent }, event.correlationId);
      targetAgents = ['lead_followup_agent'];
    }

    if (targetAgents.length === 0) {
      logAgentStep(leadId, 'System', 'ROUTING', 'Unknown intent. Routing to general follow-up.', { primary_intent }, event.correlationId);
      targetAgents = ['lead_followup_agent'];
    }

    // Trigger each target agent
    targetAgents.forEach((agentId: string) => {
      logAgentStep(leadId, 'System', 'ROUTING', `Routing to ${agentId}`, { primary_intent, confidence }, event.correlationId);
      enqueueAgentTask(agentId, { lead_id: leadId });
    });
  });

  // 3. Availability Checked -> Re-trigger Scheduler for Step 2 (Send SMS)
  eventBus.subscribe(EVENTS.PROCESS.AVAILABILITY_CHECKED, (event: FluxEvent) => {
    const { leadId, slots } = event.payload;
    logger.info('AVAILABILITY_READY', { leadId, slotCount: slots.length });

    enqueueAgentTask('scheduler_agent', { lead_id: leadId, available_slots: slots });
  });

  // 4. Retry Logic (Simple MVP)
  eventBus.subscribe(EVENTS.SYSTEM.RETRY_REQUESTED, (event: FluxEvent) => {
    const { agentId, inputData, attempt } = event.payload;
    
    if (attempt > 1) {
      logger.error('RETRY_EXCEEDED', new Error('Max retries reached'), { agentId, correlationId: event.correlationId });
      return;
    }

    logger.info('RETRYING_JOB', { agentId, attempt: attempt + 1, correlationId: event.correlationId });
    enqueueAgentTask(agentId, { ...inputData, attempt: attempt + 1 });
  });
}
