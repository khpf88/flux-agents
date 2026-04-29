import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

export interface EventMetadata {
  eventId: string;
  correlationId: string;
  causationId?: string;
  timestamp: string;
}

export interface FluxEvent<T = any> extends EventMetadata {
  event: string;
  payload: T;
}

/**
 * SINGLE Unified Event Bus
 * All modules communicate ONLY via this bus.
 */
class GlobalEventBus extends EventEmitter {
  private processedEvents = new Set<string>();

  /**
   * Enhanced emit with metadata tracking
   */
  emitFluxEvent(eventName: string, payload: any, correlationId: string, causationId?: string): FluxEvent {
    const event: FluxEvent = {
      event: eventName,
      eventId: randomUUID(),
      correlationId,
      causationId,
      timestamp: new Date().toISOString(),
      payload
    };

    super.emit(eventName, event);
    
    // Global Logging
    console.log(JSON.stringify({
      level: 'EVENT',
      ...event
    }));

    return event;
  }

  /**
   * Idempotency wrapper for subscribers
   */
  subscribe(eventName: string, handler: (event: FluxEvent) => Promise<void> | void) {
    this.on(eventName, async (event: FluxEvent) => {
      if (this.processedEvents.has(event.eventId)) {
        console.warn(`[Idempotency] Skipping duplicate event: ${event.eventId} (${event.event})`);
        return;
      }

      try {
        await handler(event);
        this.processedEvents.add(event.eventId);
        
        // Optional: Cleanup old event IDs (TTL)
        if (this.processedEvents.size > 1000) {
          const firstItem = this.processedEvents.values().next().value;
          if (firstItem) this.processedEvents.delete(firstItem);
        }
      } catch (error) {
        console.error(`[Bus] Error processing event ${event.event}:`, error);
      }
    });
  }
}

export const eventBus = new GlobalEventBus();

/**
 * Event Categories
 */
export const EVENTS = {
  INPUT: {
    LEAD_CREATED: 'input:lead_created',
    INCOMING_MESSAGE: 'input:incoming_message',
  },
  PROCESS: {
    AGENT_TRIGGERED: 'process:agent_triggered',
    DECISION_MADE: 'process:decision_made',
  },
  OUTPUT: {
    SMS_SENT: 'output:sms_sent',
    FOLLOWUP_COMPLETED: 'output:followup_completed',
  },
  SYSTEM: {
    AGENT_FAILED: 'system:agent_failed',
    TOOL_FAILED: 'system:tool_failed',
    RETRY_REQUESTED: 'system:retry_requested',
  }
};
