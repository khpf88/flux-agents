import { eventBus, EVENTS, FluxEvent } from './event_bus.js';
import { logger } from '../logger.js';

/**
 * Orchestrator
 * Responsibilities:
 * - Subscribe to Input Events
 * - Determine Agent triggers
 * - Emit Processing Events (with correlation and causation)
 */
export function initializeOrchestrator() {
  
  // 1. Lead Created -> Trigger Agent
  eventBus.subscribe(EVENTS.INPUT.LEAD_CREATED, (event: FluxEvent) => {
    const lead = event.payload;
    logger.info('ORCHESTRATOR_MAPPING', { lead_id: lead.id, correlationId: event.correlationId });

    // Intent Detection (Simple Keyword-based for MVP)
    const schedulingKeywords = ['book', 'schedule', 'appointment', 'call', 'available', 'tomorrow', 'meeting'];
    const message = (lead.message || '').toLowerCase();
    const hasSchedulingIntent = schedulingKeywords.some(keyword => message.includes(keyword));

    // Decide which agent to trigger
    const agentId = hasSchedulingIntent ? 'scheduler_agent' : 'lead_followup_agent';

    eventBus.emitFluxEvent(
      EVENTS.PROCESS.AGENT_TRIGGERED,
      { agentId, inputData: { lead_id: lead.id } },
      event.correlationId,
      event.eventId // Causation
    );
  });

  // 2. Retry Logic (Simple MVP)
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
