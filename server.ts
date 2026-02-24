import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("pgai.db");
const JWT_SECRET = process.env.JWT_SECRET || "coinrefri-pgai-secret-2026";

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'admin', 'tech', 'read'
    status TEXT DEFAULT 'active',
    last_login DATETIME
  );

  CREATE TABLE IF NOT EXISTS sedes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    manager TEXT,
    contact TEXT
  );

  CREATE TABLE IF NOT EXISTS areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sede_id INTEGER,
    manager TEXT,
    FOREIGN KEY (sede_id) REFERENCES sedes(id)
  );

  CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    hostname TEXT,
    serial TEXT,
    location_type TEXT,
    last_name TEXT,
    first_name TEXT,
    type TEXT, -- PC, Laptop, Impresora, Servidor, Otro
    brand TEXT,
    model TEXT,
    os TEXT,
    cpu TEXT,
    ram TEXT,
    storage TEXT,
    storage_type TEXT,
    office_version TEXT,
    account_type TEXT,
    ocs_status TEXT,
    antivirus TEXT,
    ip TEXT,
    mac TEXT,
    user_assigned TEXT, -- Keep for compatibility or merge with first/last name
    area_id INTEGER,
    status TEXT DEFAULT 'Activo', -- Activo, Mantenimiento, Baja
    acquisition_date DATE,
    notes_1 TEXT,
    notes_2 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id)
  );

  CREATE TABLE IF NOT EXISTS mantenimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id INTEGER,
    type TEXT, -- Preventivo, Correctivo
    date DATE,
    technician TEXT,
    diagnosis TEXT,
    solution TEXT,
    cost REAL,
    next_date DATE,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    target_table TEXT,
    target_id INTEGER,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed initial admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: "Usuario desactivado" });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
    
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });

  // Dashboard Stats
  app.get("/api/stats", authenticateToken, (req, res) => {
    const totalEquipos = db.prepare("SELECT COUNT(*) as count FROM equipos").get() as any;
    const byType = db.prepare("SELECT type, COUNT(*) as count FROM equipos GROUP BY type").all();
    const bySede = db.prepare(`
      SELECT s.name as sede, COUNT(e.id) as count 
      FROM sedes s 
      LEFT JOIN areas a ON s.id = a.sede_id 
      LEFT JOIN equipos e ON a.id = e.area_id 
      GROUP BY s.name
    `).all();
    const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM equipos GROUP BY status").all();
    
    const pendingMaintenance = db.prepare(`
      SELECT COUNT(*) as count FROM equipos e
      WHERE e.id IN (
        SELECT equipo_id FROM mantenimientos 
        WHERE next_date <= date('now', '+7 days')
      ) OR e.status = 'Mantenimiento'
    `).get() as any;

    res.json({
      total: totalEquipos.count,
      byType,
      bySede,
      byStatus,
      pendingMaintenance: pendingMaintenance.count
    });
  });

  // CRUD Equipos
  app.get("/api/equipos", authenticateToken, (req, res) => {
    const equipos = db.prepare(`
      SELECT e.*, a.name as area_name, s.name as sede_name 
      FROM equipos e 
      LEFT JOIN areas a ON e.area_id = a.id 
      LEFT JOIN sedes s ON a.sede_id = s.id
    `).all();
    res.json(equipos);
  });

  app.post("/api/equipos", authenticateToken, (req, res) => {
    const { 
      code, hostname, serial, location_type, last_name, first_name,
      type, brand, model, os, cpu, ram, storage, storage_type,
      office_version, account_type, ocs_status, antivirus,
      ip, mac, user_assigned, area_id, status, acquisition_date, notes_1, notes_2
    } = req.body;

    try {
      const result = db.prepare(`
        INSERT INTO equipos (
          code, hostname, serial, location_type, last_name, first_name,
          type, brand, model, os, cpu, ram, storage, storage_type,
          office_version, account_type, ocs_status, antivirus,
          ip, mac, user_assigned, area_id, status, acquisition_date, notes_1, notes_2
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        code, hostname, serial, location_type, last_name, first_name,
        type, brand, model, os, cpu, ram, storage, storage_type,
        office_version, account_type, ocs_status, antivirus,
        ip, mac, user_assigned, area_id, status, acquisition_date, notes_1, notes_2
      );

      db.prepare("INSERT INTO audit_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)")
        .run((req as any).user.id, 'CREATE', 'equipos', result.lastInsertRowid, `Equipo ${code} creado`);

      res.status(201).json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/equipos/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const fields = Object.keys(req.body).filter(f => f !== 'id' && f !== 'created_at' && f !== 'area_name' && f !== 'sede_name');
    const values = fields.map(f => req.body[f]);
    
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    db.prepare(`UPDATE equipos SET ${setClause} WHERE id = ?`).run(...values, id);

    db.prepare("INSERT INTO audit_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)")
      .run((req as any).user.id, 'UPDATE', 'equipos', id, `Equipo ID ${id} actualizado`);

    res.json({ success: true });
  });

  // Sedes & Areas
  app.get("/api/sedes", authenticateToken, (req, res) => {
    res.json(db.prepare("SELECT * FROM sedes").all());
  });

  app.post("/api/sedes", authenticateToken, (req, res) => {
    const { name, address, manager, contact } = req.body;
    const result = db.prepare("INSERT INTO sedes (name, address, manager, contact) VALUES (?, ?, ?, ?)").run(name, address, manager, contact);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/areas", authenticateToken, (req, res) => {
    res.json(db.prepare("SELECT a.*, s.name as sede_name FROM areas a JOIN sedes s ON a.sede_id = s.id").all());
  });

  app.post("/api/areas", authenticateToken, (req, res) => {
    const { name, sede_id, manager } = req.body;
    const result = db.prepare("INSERT INTO areas (name, sede_id, manager) VALUES (?, ?, ?)").run(name, sede_id, manager);
    res.json({ id: result.lastInsertRowid });
  });

  // Mantenimientos
  app.get("/api/mantenimientos", authenticateToken, (req, res) => {
    const logs = db.prepare(`
      SELECT m.*, e.code as equipo_code, e.hostname 
      FROM mantenimientos m 
      JOIN equipos e ON m.equipo_id = e.id
      ORDER BY m.date DESC
    `).all();
    res.json(logs);
  });

  app.post("/api/mantenimientos", authenticateToken, (req, res) => {
    const { equipo_id, type, date, technician, diagnosis, solution, cost, next_date } = req.body;
    const result = db.prepare(`
      INSERT INTO mantenimientos (equipo_id, type, date, technician, diagnosis, solution, cost, next_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(equipo_id, type, date, technician, diagnosis, solution, cost, next_date);
    
    res.json({ id: result.lastInsertRowid });
  });

  // Bulk Import
  app.post("/api/import/excel", authenticateToken, (req, res) => {
    const { data } = req.body; // Array of objects
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO equipos (
        code, hostname, serial, location_type, last_name, first_name,
        type, brand, model, os, cpu, ram, storage, storage_type,
        office_version, account_type, ocs_status, antivirus,
        ip, mac, user_assigned, area_id, status, acquisition_date, notes_1, notes_2
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items) => {
      for (const item of items) {
        stmt.run(
          item.code, item.hostname, item.serial, item.location_type, item.last_name, item.first_name,
          item.type, item.brand, item.model, item.os, item.cpu, item.ram, item.storage, item.storage_type,
          item.office_version, item.account_type, item.ocs_status, item.antivirus,
          item.ip, item.mac, item.user_assigned, item.area_id, item.status || 'Activo', 
          item.acquisition_date, item.notes_1, item.notes_2
        );
      }
    });

    try {
      transaction(data);
      res.json({ success: true, count: data.length });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Technical Scan Import
  app.post("/api/import/scan", authenticateToken, (req, res) => {
    const { hostname, os, cpu, ram, storage, ip, mac, serial } = req.body;
    
    // Try to find existing by serial or hostname
    let existing: any = null;
    if (serial) {
      existing = db.prepare("SELECT id FROM equipos WHERE serial = ?").get(serial);
    }
    if (!existing && hostname) {
      existing = db.prepare("SELECT id FROM equipos WHERE hostname = ?").get(hostname);
    }

    if (existing) {
      db.prepare(`
        UPDATE equipos SET 
          os = ?, cpu = ?, ram = ?, storage = ?, ip = ?, mac = ?
        WHERE id = ?
      `).run(os, cpu, ram, storage, ip, mac, existing.id);
      
      res.json({ success: true, action: 'updated', id: existing.id });
    } else {
      res.json({ success: false, message: 'Equipo no encontrado para sincronización automática. Regístrelo manualmente primero.' });
    }
  });

  // Audit Logs
  app.get("/api/audit", authenticateToken, (req, res) => {
    if ((req as any).user.role !== 'admin') return res.sendStatus(403);
    const logs = db.prepare(`
      SELECT l.*, u.username 
      FROM audit_logs l 
      JOIN users u ON l.user_id = u.id 
      ORDER BY l.timestamp DESC
    `).all();
    res.json(logs);
  });

  // Users Management
  app.get("/api/users", authenticateToken, (req, res) => {
    if ((req as any).user.role !== 'admin') return res.sendStatus(403);
    res.json(db.prepare("SELECT id, username, role, status, last_login FROM users").all());
  });

  app.post("/api/users", authenticateToken, (req, res) => {
    if ((req as any).user.role !== 'admin') return res.sendStatus(403);
    const { username, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      const result = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, hashedPassword, role);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ message: "Usuario ya existe" });
    }
  });

  app.patch("/api/users/:id/status", authenticateToken, (req, res) => {
    if ((req as any).user.role !== 'admin') return res.sendStatus(403);
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
