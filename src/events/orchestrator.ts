import { eventBus, EVENTS } from './event_bus.js';
import { enqueueAgentTask } from './worker.js';
import { logger } from '../logger.js';

export function initializeOrchestrator() {
  eventBus.on(EVENTS.LEAD_CREATED, async (lead) => {
    logger.info('ORCHESTRATOR_TRIGGERED', { lead_id: lead.id });
    enqueueAgentTask('lead_followup_agent', { lead_id: lead.id });
  });
}
