import { EventEmitter } from 'node:events';

export const eventBus = new EventEmitter();

// Event names
export const EVENTS = {
  LEAD_CREATED: 'lead_created',
};
