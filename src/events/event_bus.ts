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

import db from '../db.js';

/**
 * SINGLE Unified Event Bus
 * All modules communicate ONLY via this bus.
 */
class GlobalEventBus extends EventEmitter {
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
  subscribe(eventName: string, handlerName: string, handler: (event: FluxEvent) => Promise<void> | void) {
    this.on(eventName, async (event: FluxEvent) => {
      // 1. Atomically mark as processed for THIS handler in DB
      try {
        const stmt = db.prepare('INSERT OR IGNORE INTO processed_events (event_id, handler_name, correlation_id) VALUES (?, ?, ?)');
        const result = stmt.run(event.eventId, handlerName, event.correlationId);
        
        if (result.changes === 0) {
          console.warn(`[Idempotency] Skipping duplicate event (DB): ${event.eventId} for handler: ${handlerName}`);
          return;
        }
      } catch (error) {
        console.error(`[Bus] Error marking event ${event.event} for handler ${handlerName} as processed:`, error);
        return;
      }

      try {
        await handler(event);
      } catch (error) {
        console.error(`[Bus] Error processing event ${event.event} in handler ${handlerName}:`, error);
      }
    });
  }
}

export const eventBus = new GlobalEventBus();

/**
 * Event Categories
 */
export const EVENTS = {
  // Input Events
  INPUT: {
    LEAD_CREATED: 'input:lead_created',
    INCOMING_MESSAGE: 'input:incoming_message',
  },
  // Processing Events
  PROCESS: {
    AGENT_TRIGGERED: 'process:agent_triggered',
    INTENT_CLASSIFIED: 'process:intent_classified',
    DECISION_MADE: 'process:decision_made',
    AVAILABILITY_CHECKED: 'process:availability_checked',
    BOOKING_CREATED: 'process:booking_created',
    AGENT_OUTPUT_READY: 'process:agent_output_ready',
    COMPOSITION_REQUESTED: 'process:composition_requested',
    FINAL_RESPONSE_COMPOSED: 'process:final_response_composed',
  },
  // Output Events
  OUTPUT: {
    SMS_SENT: 'output:sms_sent',
    BOOKING_CONFIRMED: 'output:booking_confirmed',
    FOLLOWUP_COMPLETED: 'output:followup_completed',
    FINAL_RESPONSE_READY: 'output:final_response_ready',
  },
  // System Events
  SYSTEM: {
    AGENT_FAILED: 'system:agent_failed',
    TOOL_FAILED: 'system:tool_failed',
    RETRY_REQUESTED: 'system:retry_requested',
  }
};
