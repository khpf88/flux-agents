import { logger } from '../logger.js';
import { eventBus, EVENTS } from '../events/event_bus.js';

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
