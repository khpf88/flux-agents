import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';
import { eventBus, EVENTS, FluxEvent } from './events/event_bus.js';
import { initializeOrchestrator } from './events/orchestrator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Favicon handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Initialize Event System
import { initializeWorker } from './events/worker.js';
import { coordinator } from './conversation/coordinator.js';
import { executeTool } from './tools/executor.js';

initializeOrchestrator();
initializeWorker();
coordinator.initialize();

// Final Output Listener
// Only the Coordinator's final response event can trigger an actual SMS send
eventBus.subscribe(EVENTS.OUTPUT.FINAL_RESPONSE_READY, async (event: FluxEvent) => {
  const { phone, message, leadId } = event.payload;
  logger.info('FINAL_OUTPUT_DELIVERY_STARTED', { leadId, correlationId: event.correlationId });
  
  try {
    await executeTool('send_sms', { phone, message }, leadId, event.correlationId, event.eventId);
    logger.info('FINAL_OUTPUT_SMS_SENT', { leadId });
    
    // Update Lead Status upon successful final delivery
    const result = db.prepare("UPDATE leads SET status = 'Followed-up' WHERE id = ?").run(leadId);
    logger.info('FINAL_OUTPUT_LEAD_STATUS_UPDATED', { leadId, changes: result.changes });
    
  } catch (error) {
    logger.error('FINAL_OUTPUT_FAILED', error, { leadId });
  }
});

// API Routes
import { LeadSchema } from './validation.js';
import { logger } from './logger.js';

import { logAgentStep } from './agent_engine/logger.js';

app.post('/api/leads', (req, res) => {
  try {
    const result = LeadSchema.safeParse(req.body);
    if (!result.success) {
      const errorDetails = (result.error.issues || []).map(err => ({
        path: err.path,
        message: err.message
      }));
      
      logger.error('VALIDATION_FAILED', { message: 'Validation failed' }, { details: errorDetails, body: req.body });
      return res.status(400).json({ 
        error: 'Validation Error', 
        details: errorDetails 
      });
    }

    const { name, email, phone, message } = result.data;
    
    const info = db.prepare('INSERT INTO leads (name, email, phone, message, status) VALUES (?, ?, ?, ?, ?)')
      .run(name, email, phone, message, 'New');
    
    const newLead = { id: info.lastInsertRowid, name, email, phone, message };
    
    // Write to DB Logs for Dashboard visibility
    logAgentStep(newLead.id as number, 'System', 'LEAD_STORED', `New lead captured: ${email}`, { message }, `lead_${newLead.id}`);
    
    logger.info('LEAD_STORED', { lead_id: newLead.id, email });
    
    // Emit using new standard structure
    eventBus.emitFluxEvent(
      EVENTS.INPUT.LEAD_CREATED, 
      newLead, 
      `lead_${newLead.id}`
    );

    res.status(201).json(newLead);
  } catch (error) {
    logger.error('API_ERROR', error, { body: req.body });
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

app.get('/api/leads', (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  res.json(leads);
});

app.get('/api/stats', (req, res) => {
  const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get() as any;
  const totalResponses = db.prepare("SELECT COUNT(*) as count FROM agent_logs WHERE step = 'TOOL_EXECUTED'").get() as any;
  
  // Calculate average duration from successful completions
  const logs = db.prepare("SELECT details FROM agent_logs WHERE step = 'TOOL_EXECUTED'").all() as any[];
  let avgSpeed = '0s';
  
  if (logs.length > 0) {
    const totalMs = logs.reduce((acc, log) => {
      try {
        const d = JSON.parse(log.details);
        return acc + (parseInt(d.duration) || 0);
      } catch { return acc; }
    }, 0);
    avgSpeed = `${(totalMs / logs.length / 1000).toFixed(1)}s`;
  }
  
  res.json({
    totalLeads: totalLeads.count,
    totalResponses: totalResponses.count,
    avgResponseTime: avgSpeed
  });
});

app.get('/api/logs', (req, res) => {
  const logs = db.prepare(`
    SELECT l.*, ld.name as lead_name 
    FROM agent_logs l 
    JOIN leads ld ON l.lead_id = ld.id 
    ORDER BY l.created_at DESC, l.id DESC
  `).all();
  res.json(logs);
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`Server v1.1 running on http://localhost:${PORT} (Strict Validation Enabled)`);
});
