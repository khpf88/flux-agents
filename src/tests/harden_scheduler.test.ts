import db from '../db.js';
import { executeTool } from '../tools/executor.js';
import assert from 'node:assert';

/**
 * Hardening Test Suite for Scheduler Agent
 */
async function runTests() {
  console.log('🧪 Starting Scheduler Hardening Tests...');

  // Setup: Clear test data and create dummy lead
  db.prepare("DELETE FROM bookings WHERE lead_id = 999").run();
  db.prepare("DELETE FROM agent_logs WHERE lead_id = 999").run();
  db.prepare("DELETE FROM leads WHERE id = 999").run();
  db.prepare("INSERT INTO leads (id, name, email, phone, message) VALUES (999, 'Test Lead', 'test@example.com', '1234567890', 'test message')").run();

  try {
    // 1. Unit Test: Availability Logic
    console.log('--- Test 1: Availability Logic ---');
    const availResult = await executeTool('check_availability', { days_ahead: 1 }, 999, 'test_corr', 'test_caus');
    assert.strictEqual(availResult.success, true);
    assert.ok(availResult.slots.length > 0, 'Should return available slots');
    console.log('✅ Availability Logic passed.');

    // 2. Unit Test: Booking Creation
    console.log('--- Test 2: Booking Creation ---');
    const slot = availResult.slots[0];
    const bookingResult = await executeTool('create_booking', { startTime: slot }, 999, 'test_corr', 'test_caus');
    assert.strictEqual(bookingResult.success, true);
    assert.ok(bookingResult.bookingId, 'Should return a booking ID');
    console.log('✅ Booking Creation passed.');

    // 3. Unit Test: Double-Booking Protection
    console.log('--- Test 3: Double-Booking Protection ---');
    try {
      await executeTool('create_booking', { startTime: slot }, 999, 'test_corr', 'test_caus');
      assert.fail('Should have thrown a double-booking error');
    } catch (err: any) {
      assert.ok(err.message.includes('DOUBLE_BOOKING_PREVENTED'), 'Error message should indicate double-booking');
      console.log('✅ Double-Booking Protection passed.');
    }

    // 4. Unit Test: Tool Registry Guard
    console.log('--- Test 4: Tool Registry Guard ---');
    try {
      await executeTool('invalid_tool', {}, 999, 'test_corr', 'test_caus');
      assert.fail('Should have thrown a tool not found error');
    } catch (err: any) {
      assert.ok(err.message.includes('TOOL_NOT_ALLOWED'), 'Error message should indicate restricted tool');
      console.log('✅ Tool Registry Guard passed.');
    }

    console.log('\n✨ ALL SCHEDULER HARDENING TESTS PASSED ✨');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    db.prepare("DELETE FROM bookings WHERE lead_id = 999").run();
    db.prepare("DELETE FROM agent_logs WHERE lead_id = 999").run();
  }
}

runTests();
