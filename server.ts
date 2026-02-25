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
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_LOCK_MINUTES = 15;

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return value;
  return value.trim();
};

const addColumnIfNotExists = (table: string, column: string, definition: string) => {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!info.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const createAuditLog = (userId: number | null, action: string, targetTable: string, targetId: number | null, details: string) => {
  db.prepare("INSERT INTO audit_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)")
    .run(userId, action, targetTable, targetId, details);
};

// Initialize Database Schema
// NOTE: This schema keeps compatibility with current frontend while adding security fields.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'admin', 'tech', 'read'
    status TEXT DEFAULT 'active',
    failed_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    last_login DATETIME
  );

  CREATE TABLE IF NOT EXISTS sedes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    manager TEXT,
    contact TEXT,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sede_id INTEGER,
    manager TEXT,
    status TEXT DEFAULT 'active',
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
    user_assigned TEXT,
    area_id INTEGER,
    status TEXT DEFAULT 'Activo', -- Activo, Mantenimiento, Baja
    acquisition_date DATE,
    notes_1 TEXT,
    notes_2 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

addColumnIfNotExists("users", "failed_attempts", "INTEGER DEFAULT 0");
addColumnIfNotExists("users", "locked_until", "DATETIME");
addColumnIfNotExists("sedes", "status", "TEXT DEFAULT 'active'");
addColumnIfNotExists("areas", "status", "TEXT DEFAULT 'active'");
addColumnIfNotExists("equipos", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");

// Seed default admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
}

// Seed required initial sites
const defaultSedes = ["PAITA", "LIMA", "TACNA"];
for (const sedeName of defaultSedes) {
  db.prepare("INSERT OR IGNORE INTO sedes (name) VALUES (?)").run(sedeName);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  const authorizeRoles = (...roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.user?.role)) return res.sendStatus(403);
    next();
  };

  // API docs (OpenAPI-lite for future mobile/API integrations)
  app.get("/api/docs.json", (_req, res) => {
    res.json({
      openapi: "3.0.0",
      info: {
        title: "PGAI COINREFRI API",
        version: "1.0.0",
        description: "API REST para inventario, mantenimiento y auditoría"
      },
      servers: [{ url: "http://localhost:3000" }],
      paths: {
        "/api/login": { post: { summary: "Autenticación" } },
        "/api/equipos": { get: { summary: "Listar equipos" }, post: { summary: "Registrar equipo" } },
        "/api/mantenimientos": { get: { summary: "Listar mantenimientos" }, post: { summary: "Registrar mantenimiento" } },
        "/api/import/excel": { post: { summary: "Carga masiva de inventario" } },
        "/api/import/scan": { post: { summary: "Sincronización por escaneo técnico" } }
      }
    });
  });

  // API Routes
  app.post("/api/login", (req, res) => {
    const username = normalizeText(req.body?.username);
    const password = req.body?.password;

    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (!user) {
      createAuditLog(null, "LOGIN_FAILED", "users", null, `Intento fallido para usuario inexistente: ${username || "(vacío)"}`);
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      createAuditLog(user.id, "LOGIN_BLOCKED", "users", user.id, `Usuario bloqueado temporalmente: ${user.username}`);
      return res.status(423).json({ message: "Cuenta bloqueada temporalmente por intentos fallidos. Intente más tarde." });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      const failedAttempts = (user.failed_attempts || 0) + 1;
      if (failedAttempts >= LOGIN_ATTEMPT_LIMIT) {
        db.prepare("UPDATE users SET failed_attempts = ?, locked_until = datetime('now', ?) WHERE id = ?")
          .run(failedAttempts, `+${LOGIN_LOCK_MINUTES} minutes`, user.id);
        createAuditLog(user.id, "LOGIN_LOCKED", "users", user.id, `Usuario bloqueado por ${LOGIN_ATTEMPT_LIMIT} intentos fallidos`);
        return res.status(423).json({ message: `Cuenta bloqueada por ${LOGIN_ATTEMPT_LIMIT} intentos fallidos.` });
      }

      db.prepare("UPDATE users SET failed_attempts = ? WHERE id = ?").run(failedAttempts, user.id);
      createAuditLog(user.id, "LOGIN_FAILED", "users", user.id, `Intento fallido ${failedAttempts}/${LOGIN_ATTEMPT_LIMIT}`);
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    if (user.status !== "active") {
      createAuditLog(user.id, "LOGIN_DENIED", "users", user.id, "Usuario desactivado");
      return res.status(403).json({ message: "Usuario desactivado" });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "8h" });
    db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP, failed_attempts = 0, locked_until = NULL WHERE id = ?").run(user.id);
    createAuditLog(user.id, "LOGIN_SUCCESS", "users", user.id, `Inicio de sesión exitoso (${user.role})`);

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
      WHERE s.status = 'active'
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

  app.post("/api/equipos", authenticateToken, authorizeRoles("admin", "tech"), (req, res) => {
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
        normalizeText(code), normalizeText(hostname), normalizeText(serial), normalizeText(location_type), normalizeText(last_name), normalizeText(first_name),
        normalizeText(type), normalizeText(brand), normalizeText(model), normalizeText(os), normalizeText(cpu), normalizeText(ram), normalizeText(storage), normalizeText(storage_type),
        normalizeText(office_version), normalizeText(account_type), normalizeText(ocs_status), normalizeText(antivirus),
        normalizeText(ip), normalizeText(mac), normalizeText(user_assigned), area_id, normalizeText(status), acquisition_date, normalizeText(notes_1), normalizeText(notes_2)
      );

      createAuditLog((req as any).user.id, "CREATE", "equipos", Number(result.lastInsertRowid), `Equipo ${code} creado`);

      res.status(201).json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/equipos/:id", authenticateToken, authorizeRoles("admin", "tech"), (req, res) => {
    const { id } = req.params;
    const fields = Object.keys(req.body).filter((f) => !["id", "created_at", "area_name", "sede_name"].includes(f));
    const values = fields.map((f) => normalizeText(req.body[f]));

    if (fields.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    const setClause = [...fields.map((f) => `${f} = ?`), "updated_at = CURRENT_TIMESTAMP"].join(", ");
    db.prepare(`UPDATE equipos SET ${setClause} WHERE id = ?`).run(...values, id);

    createAuditLog((req as any).user.id, "UPDATE", "equipos", Number(id), `Equipo ID ${id} actualizado`);

    res.json({ success: true });
  });

  // Sedes & Areas
  app.get("/api/sedes", authenticateToken, (req, res) => {
    res.json(db.prepare("SELECT * FROM sedes ORDER BY name").all());
  });

  app.post("/api/sedes", authenticateToken, authorizeRoles("admin"), (req, res) => {
    const { name, address, manager, contact } = req.body;
    const result = db.prepare("INSERT INTO sedes (name, address, manager, contact) VALUES (?, ?, ?, ?)")
      .run(normalizeText(name), normalizeText(address), normalizeText(manager), normalizeText(contact));
    createAuditLog((req as any).user.id, "CREATE", "sedes", Number(result.lastInsertRowid), `Sede ${name} creada`);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/sedes/:id/status", authenticateToken, authorizeRoles("admin"), (req, res) => {
    const { id } = req.params;
    const status = req.body?.status === "inactive" ? "inactive" : "active";
    db.prepare("UPDATE sedes SET status = ? WHERE id = ?").run(status, id);
    createAuditLog((req as any).user.id, "UPDATE", "sedes", Number(id), `Sede ${id} -> ${status}`);
    res.json({ success: true });
  });

  app.get("/api/areas", authenticateToken, (req, res) => {
    res.json(db.prepare("SELECT a.*, s.name as sede_name FROM areas a JOIN sedes s ON a.sede_id = s.id ORDER BY s.name, a.name").all());
  });

  app.post("/api/areas", authenticateToken, authorizeRoles("admin"), (req, res) => {
    const { name, sede_id, manager } = req.body;
    const result = db.prepare("INSERT INTO areas (name, sede_id, manager) VALUES (?, ?, ?)").run(normalizeText(name), sede_id, normalizeText(manager));
    createAuditLog((req as any).user.id, "CREATE", "areas", Number(result.lastInsertRowid), `Área ${name} creada`);
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

  app.post("/api/mantenimientos", authenticateToken, authorizeRoles("admin", "tech"), (req, res) => {
    const { equipo_id, type, date, technician, diagnosis, solution, cost, next_date } = req.body;
    const result = db.prepare(`
      INSERT INTO mantenimientos (equipo_id, type, date, technician, diagnosis, solution, cost, next_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(equipo_id, normalizeText(type), date, normalizeText(technician), normalizeText(diagnosis), normalizeText(solution), cost, next_date);

    createAuditLog((req as any).user.id, "CREATE", "mantenimientos", Number(result.lastInsertRowid), `Mantenimiento registrado para equipo ${equipo_id}`);

    res.json({ id: result.lastInsertRowid });
  });

  // Bulk Import
  app.post("/api/import/excel", authenticateToken, authorizeRoles("admin", "tech"), (req, res) => {
    const { data } = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ message: "Formato inválido" });

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO equipos (
        code, hostname, serial, location_type, last_name, first_name,
        type, brand, model, os, cpu, ram, storage, storage_type,
        office_version, account_type, ocs_status, antivirus,
        ip, mac, user_assigned, area_id, status, acquisition_date, notes_1, notes_2
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items: any[]) => {
      for (const item of items) {
        stmt.run(
          normalizeText(item.code), normalizeText(item.hostname), normalizeText(item.serial), normalizeText(item.location_type), normalizeText(item.last_name), normalizeText(item.first_name),
          normalizeText(item.type), normalizeText(item.brand), normalizeText(item.model), normalizeText(item.os), normalizeText(item.cpu), normalizeText(item.ram), normalizeText(item.storage), normalizeText(item.storage_type),
          normalizeText(item.office_version), normalizeText(item.account_type), normalizeText(item.ocs_status), normalizeText(item.antivirus),
          normalizeText(item.ip), normalizeText(item.mac), normalizeText(item.user_assigned), item.area_id, normalizeText(item.status || "Activo"),
          item.acquisition_date, normalizeText(item.notes_1), normalizeText(item.notes_2)
        );
      }
    });

    try {
      transaction(data);
      createAuditLog((req as any).user.id, "IMPORT", "equipos", null, `Carga masiva de ${data.length} registros`);
      res.json({ success: true, count: data.length });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Technical Scan Import
  app.post("/api/import/scan", authenticateToken, authorizeRoles("admin", "tech"), (req, res) => {
    const { hostname, os, cpu, ram, storage, ip, mac, serial } = req.body;

    let existing: any = null;
    if (serial) {
      existing = db.prepare("SELECT id FROM equipos WHERE serial = ?").get(normalizeText(serial));
    }
    if (!existing && hostname) {
      existing = db.prepare("SELECT id FROM equipos WHERE hostname = ?").get(normalizeText(hostname));
    }

    if (existing) {
      db.prepare(`
        UPDATE equipos SET
          os = ?, cpu = ?, ram = ?, storage = ?, ip = ?, mac = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(normalizeText(os), normalizeText(cpu), normalizeText(ram), normalizeText(storage), normalizeText(ip), normalizeText(mac), existing.id);

      createAuditLog((req as any).user.id, "SYNC", "equipos", existing.id, `Sincronización técnica para equipo ${existing.id}`);
      res.json({ success: true, action: "updated", id: existing.id });
    } else {
      res.json({ success: false, message: "Equipo no encontrado para sincronización automática. Regístrelo manualmente primero." });
    }
  });

  // Audit Logs
  app.get("/api/audit", authenticateToken, authorizeRoles("admin"), (req, res) => {
    const logs = db.prepare(`
      SELECT l.*, u.username
      FROM audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.timestamp DESC
    `).all();
    res.json(logs);
  });

  // Users Management
  app.get("/api/users", authenticateToken, authorizeRoles("admin"), (req, res) => {
    res.json(db.prepare("SELECT id, username, role, status, last_login FROM users").all());
  });

  app.post("/api/users", authenticateToken, authorizeRoles("admin"), (req, res) => {
    const username = normalizeText(req.body?.username);
    const password = req.body?.password;
    const role = normalizeText(req.body?.role);

    if (!username || !password || !role) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      const result = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, hashedPassword, role);
      createAuditLog((req as any).user.id, "CREATE", "users", Number(result.lastInsertRowid), `Usuario ${username} creado con rol ${role}`);
      res.json({ id: result.lastInsertRowid });
    } catch {
      res.status(400).json({ message: "Usuario ya existe" });
    }
  });

  app.patch("/api/users/:id/status", authenticateToken, authorizeRoles("admin"), (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE users SET status = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?").run(status, id);
    createAuditLog((req as any).user.id, "UPDATE", "users", Number(id), `Estado de usuario cambiado a ${status}`);
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
