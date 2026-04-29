"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContext = getContext;
const db_1 = __importDefault(require("../db"));
async function getContext(injectionPoints, data) {
    const context = {};
    if (injectionPoints.includes('business_profile')) {
        const config = db_1.default.prepare('SELECT * FROM business_config').all();
        context.business_profile = config.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
    }
    if (injectionPoints.includes('customer_profile')) {
        const lead = db_1.default.prepare('SELECT * FROM leads WHERE id = ?').get(data.lead_id);
        context.customer_profile = lead;
    }
    // Conversation history and system state could be added here
    context.conversation_history = [];
    context.system_state = { date: new Date().toISOString() };
    return context;
}
//# sourceMappingURL=bus.js.map