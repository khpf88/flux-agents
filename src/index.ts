import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';
import { eventBus, EVENTS } from './events/event_bus.js';
import { initializeOrchestrator } from './events/orchestrator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Favicon handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Initialize Orchestrator
initializeOrchestrator();

// API Routes
import { LeadSchema } from './validation.js';
import { logger } from './logger.js';

app.post('/api/leads', (req, res) => {
  try {
    const result = LeadSchema.safeParse(req.body);
    if (!result.success) {
      const errorDetails = (result.error.issues || []).map(err => ({
        path: err.path,
        message: err.message
      }));
      
      logger.error('VALIDATION_FAILED', { details: errorDetails, body: req.body });
      return res.status(400).json({ 
        error: 'Validation Error', 
        details: errorDetails 
      });
    }

    const { name, email, phone, message } = result.data;
    
    const info = db.prepare('INSERT INTO leads (name, email, phone, message) VALUES (?, ?, ?, ?)')
      .run(name, email, phone, message);
    
    const newLead = { id: info.lastInsertRowid, name, email, phone, message };
    
    logger.info('LEAD_STORED', { lead_id: newLead.id, email });
    eventBus.emit(EVENTS.LEAD_CREATED, newLead);

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
  
  res.json({
    totalLeads: totalLeads.count,
    totalResponses: totalResponses.count,
    avgResponseTime: '1.2s' // Mocked for MVP
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
