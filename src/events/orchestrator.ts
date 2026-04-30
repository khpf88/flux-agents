import { eventBus, EVENTS, FluxEvent } from './event_bus.js';
import { enqueueAgentTask } from './worker.js';
import { logger } from '../logger.js';
import { classifyIntent } from '../agent_engine/intent.js';
import { logAgentStep } from '../agent_engine/logger.js';

/**
 * Orchestrator
 * Responsibilities:
 * - Subscribe to Input Events
 * - Determine Agent triggers via Intent Classification
 * - Emit Processing Events (with correlation and causation)
 */
export function initializeOrchestrator() {
  
  // 1. Lead Created -> Classify Intent
  eventBus.subscribe(EVENTS.INPUT.LEAD_CREATED, async (event: FluxEvent) => {
    const lead = event.payload;
    logger.info('ORCHESTRATOR_CLASSIFYING', { lead_id: lead.id, correlationId: event.correlationId });

    // AI Intent Classification
    const { intent, confidence } = await classifyIntent(lead.message || '');

    // Log for Dashboard
    logAgentStep(lead.id, 'System', 'INTENT_CLASSIFIED', `Classified as ${intent} (Confidence: ${Math.round(confidence * 100)}%)`, { intent, confidence }, event.correlationId);

    eventBus.emitFluxEvent(
      EVENTS.PROCESS.INTENT_CLASSIFIED,
      { intent, confidence, lead_id: lead.id },
      event.correlationId,
      event.eventId
    );
  });

  // 2. Intent Classified -> Route to Agent
  eventBus.subscribe(EVENTS.PROCESS.INTENT_CLASSIFIED, (event: FluxEvent) => {
    const { intent, lead_id } = event.payload;
    
    const agentId = intent === 'scheduling' ? 'scheduler_agent' : 'lead_followup_agent';

    eventBus.emitFluxEvent(
      EVENTS.PROCESS.AGENT_TRIGGERED,
      { agentId, inputData: { lead_id } },
      event.correlationId,
      event.eventId
    );
  });

  // 3. Availability Checked -> Re-trigger Scheduler for Step 2 (Send SMS)
  eventBus.subscribe(EVENTS.PROCESS.AVAILABILITY_CHECKED, (event: FluxEvent) => {
    const { leadId, slots } = event.payload;
    
    logger.info('AVAILABILITY_READY', { leadId, slotCount: slots.length });

    eventBus.emitFluxEvent(
      EVENTS.PROCESS.AGENT_TRIGGERED,
      { 
        agentId: 'scheduler_agent', 
        inputData: { lead_id: leadId, available_slots: slots } 
      },
      event.correlationId,
      event.eventId
    );
  });

  // 4. Retry Logic (Simple MVP)
  eventBus.subscribe(EVENTS.SYSTEM.RETRY_REQUESTED, (event: FluxEvent) => {
    const { agentId, inputData, attempt } = event.payload;
    
    if (attempt > 1) {
      logger.error('RETRY_EXCEEDED', new Error('Max retries reached'), { agentId, correlationId: event.correlationId });
      return;
    }

    logger.info('RETRYING_JOB', { agentId, attempt: attempt + 1, correlationId: event.correlationId });
    
    eventBus.emitFluxEvent(
      EVENTS.PROCESS.AGENT_TRIGGERED,
      { agentId, inputData, attempt: attempt + 1 },
      event.correlationId,
      event.eventId
    );
  });
}
