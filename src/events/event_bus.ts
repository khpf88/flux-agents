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
  subscribe(eventName: string, handler: (event: FluxEvent) => Promise<void> | void) {
    this.on(eventName, async (event: FluxEvent) => {
      // 1. Check persistent DB for idempotency
      const alreadyProcessed = db.prepare('SELECT 1 FROM processed_events WHERE event_id = ?').get(event.eventId);
      
      if (alreadyProcessed) {
        console.warn(`[Idempotency] Skipping duplicate event (DB): ${event.eventId} (${event.event})`);
        return;
      }

      try {
        await handler(event);
        
        // 2. Mark as processed in DB
        db.prepare('INSERT INTO processed_events (event_id, correlation_id) VALUES (?, ?)')
          .run(event.eventId, event.correlationId);
          
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
  },
  // Output Events
  OUTPUT: {
    SMS_SENT: 'output:sms_sent',
    BOOKING_CONFIRMED: 'output:booking_confirmed',
    FOLLOWUP_COMPLETED: 'output:followup_completed',
  },
  // System Events
  SYSTEM: {
    AGENT_FAILED: 'system:agent_failed',
    TOOL_FAILED: 'system:tool_failed',
    RETRY_REQUESTED: 'system:retry_requested',
  }
};
