import { MemoryAgent } from '../memory/memory_agent.js';
import db from '../db.js';
import { eventBus, EVENTS } from '../events/event_bus.js';

// Simple Test Runner
async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ TEST PASSED: ${name}`);
  } catch (error) {
    console.error(`❌ TEST FAILED: ${name}`);
    console.error(error);
    process.exit(1);
  }
}

async function setup() {
  // Clean up DB for test (Order matters due to foreign keys)
  db.prepare('DELETE FROM conversation_memory').run();
  db.prepare('DELETE FROM conversation_turns').run();
  db.prepare('DELETE FROM agent_logs').run();
  db.prepare('DELETE FROM agent_memories').run();
  db.prepare('DELETE FROM bookings').run();
  db.prepare('DELETE FROM leads').run();
  
  // Create a test lead
  db.prepare('INSERT INTO leads (id, name, email, message) VALUES (?, ?, ?, ?)').run(1004, "Test User", "test@example.com", "Hello");
}

await runTest('Initial state is correct', async () => {
  await setup();
  const { state, memory } = await MemoryAgent.loadMemory(1004);
  
  if (state.state !== 'new_lead') throw new Error(`Expected new_lead, got ${state.state}`);
  if (state.lead_id !== 1004) throw new Error('Incorrect lead_id');
  if (memory.summary !== 'New lead. No conversation yet.') throw new Error('Incorrect initial summary');
});

await runTest('State transition on intent: schedule_meeting', async () => {
  await setup();
  const correlationId = 'test_corr_1';
  const intent = { primary_intent: 'schedule_meeting', confidence: 0.9 };
  
  const newState = await MemoryAgent.updateState(1004, intent, correlationId);
  
  if (newState.state !== 'scheduling_requested') throw new Error(`Expected scheduling_requested, got ${newState.state}`);
  
  // Verify persistence
  const { state: persistedState } = await MemoryAgent.loadMemory(1004);
  if (persistedState.state !== 'scheduling_requested') throw new Error('Persistence failed');
});

await runTest('System transition: AVAILABILITY_PROVIDED', async () => {
  await setup();
  const correlationId = 'test_corr_2';
  const slots = ['2026-05-01T10:00:00Z', '2026-05-01T14:00:00Z'];
  
  await MemoryAgent.handleSystemTransition(1004, 'AVAILABILITY_PROVIDED', { slots }, correlationId);
  
  const { state } = await MemoryAgent.loadMemory(1004);
  if (state.state !== 'awaiting_time_selection') throw new Error(`Expected awaiting_time_selection, got ${state.state}`);
  if (state.proposed_slots.length !== 2) throw new Error('Slots not stored correctly');
});

await runTest('System transition: BOOKING_CREATED', async () => {
  await setup();
  const correlationId = 'test_corr_3';
  const startTime = '2026-05-01T10:00:00Z';
  
  await MemoryAgent.handleSystemTransition(1004, 'BOOKING_CREATED', { startTime }, correlationId);
  
  const { state } = await MemoryAgent.loadMemory(1004);
  if (state.state !== 'booking_confirmed') throw new Error(`Expected booking_confirmed, got ${state.state}`);
  if (state.booking_confirmed !== true) throw new Error('booking_confirmed flag not set');
  if (state.selected_slot !== startTime) throw new Error('Selected slot not stored');
});

await runTest('Recording turns works', async () => {
  await setup();
  await MemoryAgent.recordTurn(1004, 'user', 'I want to book a massage', 'corr_1');
  await MemoryAgent.recordTurn(1004, 'assistant', 'Sure! When would you like to come in?', 'corr_2');
  
  const turns = db.prepare('SELECT * FROM conversation_turns WHERE lead_id = 1004').all();
  if (turns.length !== 2) throw new Error('Turns not recorded correctly');
});

console.log('\n--- ALL MEMORY AGENT TESTS PASSED ---');
