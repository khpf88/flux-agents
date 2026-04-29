"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTool = executeTool;
const db_1 = __importDefault(require("../db"));
async function executeTool(toolName, parameters, leadId) {
    console.log(`Executing Tool: ${toolName}`, parameters);
    let result = '';
    if (toolName === 'send_sms') {
        // Mocking SMS send
        result = `MOCK SMS SENT to ${parameters.phone || 'Unknown'}: "${parameters.message}"`;
        console.log(result);
        // Log to DB
        if (leadId) {
            db_1.default.prepare('INSERT INTO agent_logs (lead_id, agent_name, action, details) VALUES (?, ?, ?, ?)')
                .run(leadId, 'Lead Follow-up Agent', 'send_sms', result);
        }
    }
    else {
        result = `Tool ${toolName} not found.`;
    }
    return result;
}
//# sourceMappingURL=executor.js.map