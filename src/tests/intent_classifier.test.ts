import { runAgent } from '../agent_engine/engine.js';
import db from '../db.js';

/**
 * Intent Classifier Agent Test Suite
 */
async function runTests() {
  console.log('🧪 Starting Intent Classifier Agent Tests...');

  // Setup: Create dummy lead
  db.prepare("DELETE FROM agent_logs WHERE lead_id = 888").run();
  db.prepare("DELETE FROM leads WHERE id = 888").run();
  db.prepare("INSERT INTO leads (id, name, email, phone, message) VALUES (888, 'Test User', 'test@example.com', '1234567890', 'dummy')").run();

  try {
    // 1. Test: Scheduling Intent Detection
    console.log('--- Test 1: Scheduling Intent ---');
    const result1 = await runAgent('intent_classifier_agent', { lead_id: 888, message: "I want to book a call for tomorrow at 10am" }, 'test_corr', 'test_caus');
    console.log('Result 1:', JSON.stringify(result1));
    
    if (result1.primary_intent !== 'schedule_meeting') {
      throw new Error(`Expected primary_intent schedule_meeting, got ${result1.primary_intent}`);
    }
    if (!result1.routing.target_agents.includes('scheduler_agent')) {
      throw new Error(`Expected target_agents to include scheduler_agent, got ${JSON.stringify(result1.routing.target_agents)}`);
    }
    console.log('✅ Scheduling intent correctly classified.');

    // 2. Test: General Inquiry Detection
    console.log('--- Test 2: General Inquiry ---');
    const result2 = await runAgent('intent_classifier_agent', { lead_id: 888, message: "Hi, just checking in to say thanks for the info." }, 'test_corr', 'test_caus');
    console.log('Result 2:', JSON.stringify(result2));
    if (result2.primary_intent !== 'general_inquiry') {
      throw new Error(`Expected primary_intent general_inquiry, got ${result2.primary_intent}`);
    }
    console.log('✅ General inquiry correctly classified.');

    console.log('\n✨ ALL INTENT CLASSIFIER TESTS PASSED ✨');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    db.prepare("DELETE FROM agent_logs WHERE lead_id = 888").run();
    db.prepare("DELETE FROM leads WHERE id = 888").run();
  }
}

runTests();
