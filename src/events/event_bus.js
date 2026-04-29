"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENTS = exports.eventBus = void 0;
const events_1 = require("events");
class EventBus extends events_1.EventEmitter {
}
exports.eventBus = new EventBus();
// Event names
exports.EVENTS = {
    LEAD_CREATED: 'lead_created',
};
//# sourceMappingURL=event_bus.js.map