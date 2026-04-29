"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./db"));
const event_bus_1 = require("./events/event_bus");
const orchestrator_1 = require("./events/orchestrator");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static('public'));
// Initialize Orchestrator
(0, orchestrator_1.initializeOrchestrator)();
// API Routes
app.post('/api/leads', (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and Email are required' });
    }
    try {
        const info = db_1.default.prepare('INSERT INTO leads (name, email, message) VALUES (?, ?, ?)')
            .run(name, email, message);
        const newLead = { id: info.lastInsertRowid, name, email, message };
        // Emit Event
        event_bus_1.eventBus.emit(event_bus_1.EVENTS.LEAD_CREATED, newLead);
        res.status(201).json(newLead);
    }
    catch (error) {
        console.error('DB Error:', error);
        res.status(500).json({ error: 'Failed to create lead' });
    }
});
app.get('/api/leads', (req, res) => {
    const leads = db_1.default.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
    res.json(leads);
});
app.get('/api/logs', (req, res) => {
    const logs = db_1.default.prepare(`
    SELECT l.*, ld.name as lead_name 
    FROM agent_logs l 
    JOIN leads ld ON l.lead_id = ld.id 
    ORDER BY l.created_at DESC
  `).all();
    res.json(logs);
});
// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
app.get('/dashboard', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/dashboard.html'));
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map