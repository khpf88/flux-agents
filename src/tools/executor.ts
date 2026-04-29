import { logger } from '../logger.js';

const ALLOWED_TOOLS = ['send_sms'];

export async function executeTool(toolName: string, parameters: any, leadId: number) {
  if (!ALLOWED_TOOLS.includes(toolName)) {
    throw new Error(`TOOL_NOT_ALLOWED: ${toolName}`);
  }

  logger.info('TOOL_EXECUTOR_START', { tool: toolName, lead_id: leadId });

  if (toolName === 'send_sms') {
    return {
      success: true,
      type: 'sms',
      recipient: parameters.phone || 'customer',
      message: parameters.message,
      raw: `SMS Sent to ${parameters.phone || 'customer'}: "${parameters.message}"`
    };
  }
  
  throw new Error(`TOOL_EXECUTION_FAILED: ${toolName}`);
}
