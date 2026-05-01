import Database from 'better-sqlite3';

const dbPath = process.env.DATABASE_URL || './database.sqlite';
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    agent_name TEXT NOT NULL,
    step TEXT NOT NULL,
    message TEXT,
    details TEXT,
    correlation_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS business_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_template_id TEXT,
    agent_instance_id TEXT,
    memory_type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id TEXT,
    lead_id INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT,
    handler_name TEXT,
    correlation_id TEXT,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, handler_name)
  );

  CREATE TABLE IF NOT EXISTS conversation_turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    correlation_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS conversation_memory (
    lead_id INTEGER PRIMARY KEY,
    state TEXT, -- Stored as JSON string
    summary TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS llm_cache (
    prompt_hash TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed config
const count = db.prepare('SELECT COUNT(*) as count FROM business_config').get() as { count: number };
if (count.count === 0) {
  const stmt = db.prepare('INSERT INTO business_config (key, value) VALUES (?, ?)');
  stmt.run('business_name', 'Flux Solutions');
  stmt.run('owner_name', 'Kian');
  stmt.run('timezone', 'America/New_York'); // Default timezone
} else {
  // Ensure timezone exists even if seeded before
  const tz = db.prepare('SELECT value FROM business_config WHERE key = ?').get('timezone');
  if (!tz) {
    db.prepare('INSERT INTO business_config (key, value) VALUES (?, ?)').run('timezone', 'America/New_York');
  }
}

export default db;
