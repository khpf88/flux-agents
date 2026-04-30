import { logger } from '../logger.js';
import { eventBus, EVENTS } from '../events/event_bus.js';

import db from '../db.js';

/**
 * Tool Registry
 * All modular tools are registered here.
 */
const ToolRegistry: Record<string, Function> = {
  send_sms: async (parameters: any, leadId: number, correlationId: string, causationId: string) => {
    // Logic for SMS tool
    const result = {
      success: true,
      type: 'sms',
      recipient: parameters.phone || 'customer',
      message: parameters.message,
      raw: `SMS Sent to ${parameters.phone || 'customer'}: "${parameters.message}"`
    };
    
    eventBus.emitFluxEvent(EVENTS.OUTPUT.SMS_SENT, { leadId, recipient: result.recipient }, correlationId, causationId);
    return result;
  },

  check_availability: async (parameters: any, leadId: number, correlationId: string, causationId: string) => {
    const targetDate = parameters.date; // Expecting YYYY-MM-DD
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    // Mock Business Hours for the specific date: 10am, 2pm, 4pm
    const potentialSlots = [
      `${dateStr}T10:00:00.000Z`,
      `${dateStr}T14:00:00.000Z`,
      `${dateStr}T16:00:00.000Z`
    ];

    // Filter out already booked slots
    const existing = db.prepare(`
      SELECT start_time FROM bookings 
      WHERE date(start_time) = date(?) AND status != 'cancelled'
    `).all(dateStr) as { start_time: string }[];

    const bookedSlots = existing.map(b => new Date(b.start_time).toISOString());
    const availableSlots = potentialSlots.filter(s => !bookedSlots.includes(new Date(s).toISOString()));

    const result = {
      success: true,
      type: 'availability',
      slots: availableSlots,
      raw: `Found ${availableSlots.length} available slots for ${dateStr}`
    };

    eventBus.emitFluxEvent(EVENTS.PROCESS.AVAILABILITY_CHECKED, { leadId, slots: availableSlots }, correlationId, causationId);
    return result;
  },

  create_booking: async (parameters: any, leadId: number, correlationId: string, causationId: string) => {
    const { startTime, durationMinutes = 30 } = parameters;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    // Hardening: Double-booking protection
    const conflict = db.prepare(`
      SELECT id FROM bookings 
      WHERE status != 'cancelled' 
      AND (
        (start_time <= ? AND end_time > ?) OR
        (start_time < ? AND end_time >= ?)
      )
    `).get(start.toISOString(), start.toISOString(), end.toISOString(), end.toISOString());

    if (conflict) {
      throw new Error(`DOUBLE_BOOKING_PREVENTED: Slot ${startTime} is already taken.`);
    }

    const info = db.prepare(`
      INSERT INTO bookings (lead_id, start_time, end_time, status)
      VALUES (?, ?, ?, ?)
    `).run(leadId, start.toISOString(), end.toISOString(), 'confirmed');

    const result = {
      success: true,
      type: 'booking',
      bookingId: info.lastInsertRowid,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      raw: `Booking created for lead ${leadId} at ${start.toISOString()}`
    };

    eventBus.emitFluxEvent(EVENTS.OUTPUT.BOOKING_CONFIRMED, { leadId, bookingId: result.bookingId }, correlationId, causationId);
    return result;
  }
};

/**
 * Tool Executor
 * Responsibilities:
 * - Validate tool availability
 * - Execute tool logic
 */
export async function executeTool(toolName: string, parameters: any, leadId: number, correlationId: string, causationId: string) {
  const tool = ToolRegistry[toolName];

  if (!tool) {
    logger.error('TOOL_NOT_FOUND', new Error(`Tool ${toolName} not registered`), { leadId, correlationId });
    throw new Error(`TOOL_NOT_ALLOWED: ${toolName}`);
  }

  logger.info('TOOL_EXECUTOR_START', { tool: toolName, lead_id: leadId, correlationId });

  try {
    return await tool(parameters, leadId, correlationId, causationId);
  } catch (error: any) {
    logger.error('TOOL_EXECUTION_FAILED', error, { tool: toolName, leadId, correlationId });
    throw error;
  }
}
