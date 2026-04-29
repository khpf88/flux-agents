"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dbPath = process.env.DATABASE_URL || './database.sqlite';
const db = new better_sqlite3_1.default(dbPath);
// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS business_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);
// Seed initial config if empty
const configCount = db.prepare('SELECT COUNT(*) as count FROM business_config').get();
if (configCount.count === 0) {
    db.prepare('INSERT INTO business_config (key, value) VALUES (?, ?)').run('business_name', 'Flux Solutions');
    db.prepare('INSERT INTO business_config (key, value) VALUES (?, ?)').run('owner_name', 'Kian');
}
exports.default = db;
//# sourceMappingURL=db.js.map