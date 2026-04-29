"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeOrchestrator = initializeOrchestrator;
const event_bus_1 = require("./event_bus");
const engine_1 = require("../agent_engine/engine");
function initializeOrchestrator() {
    event_bus_1.eventBus.on(event_bus_1.EVENTS.LEAD_CREATED, async (lead) => {
        console.log(`Orchestrator: Catching event ${event_bus_1.EVENTS.LEAD_CREATED} for lead ${lead.id}`);
        try {
            await (0, engine_1.runAgent)('lead_followup_agent', { lead_id: lead.id });
        }
        catch (error) {
            console.error('Orchestrator Error:', error);
        }
    });
}
//# sourceMappingURL=orchestrator.js.map