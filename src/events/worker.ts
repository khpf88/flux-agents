import PQueue from 'p-queue';
import { runAgent } from '../agent_engine/engine.js';
import { logger } from '../logger.js';
import { eventBus, EVENTS, FluxEvent } from './event_bus.js';

const queue = new PQueue({ concurrency: 1 });

/**
 * Background Worker
 * Responsibilities:
 * - Listen to Processing Events
 * - Execute long-running AI tasks
 */
export function initializeWorker() {
  eventBus.subscribe(EVENTS.PROCESS.AGENT_TRIGGERED, async (event: FluxEvent) => {
    const { agentId, inputData, attempt = 0 } = event.payload;
    const correlationId = event.correlationId;

    queue.add(async () => {
      try {
        await runAgent(agentId, inputData, correlationId, event.eventId);
      } catch (error: any) {
        logger.error('WORKER_JOB_FAILED', error, { agentId, correlationId });
        
        // Request Retry
        eventBus.emitFluxEvent(
          EVENTS.SYSTEM.RETRY_REQUESTED,
          { agentId, inputData, attempt, error: error.message },
          correlationId,
          event.eventId
        );
      }
    });
  });
}
