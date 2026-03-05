import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("delivery.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL,
    order_date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_contact TEXT NOT NULL,
    delivery_charges REAL NOT NULL,
    outsource_charges REAL NOT NULL,
    customer_address TEXT,
    map_pin TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    company_name TEXT DEFAULT 'MS Delivery Services',
    company_email TEXT DEFAULT 'admin@msdelivery.com',
    company_phone TEXT DEFAULT '+1234567890',
    company_logo TEXT
  );

  INSERT OR IGNORE INTO profile (id, company_name) VALUES (1, 'MS Delivery Services');
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/orders", (req, res) => {
    const { start, end } = req.query;
    let query = "SELECT *, (delivery_charges - outsource_charges) as profit FROM orders";
    const params = [];

    if (start && end) {
      query += " WHERE order_date BETWEEN ? AND ?";
      params.push(start, end);
    }

    query += " ORDER BY order_date DESC, created_at DESC";
    const orders = db.prepare(query).all(...params);
    res.json(orders);
  });

  app.get("/api/orders/recent", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 15").all();
    res.json(orders);
  });

  app.post("/api/orders", (req, res) => {
    const { 
      order_number, order_date, customer_name, customer_contact, 
      delivery_charges, outsource_charges, customer_address, map_pin 
    } = req.body;

    try {
      const info = db.prepare(`
        INSERT INTO orders (
          order_number, order_date, customer_name, customer_contact, 
          delivery_charges, outsource_charges, customer_address, map_pin
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        order_number, order_date, customer_name, customer_contact, 
        delivery_charges, outsource_charges, customer_address, map_pin
      );
      res.json({ id: info.lastInsertRowid, message: "Order registered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to register order" });
    }
  });

  app.put("/api/orders/:id", (req, res) => {
    const { id } = req.params;
    const { 
      order_number, order_date, customer_name, customer_contact, 
      delivery_charges, outsource_charges, customer_address, map_pin 
    } = req.body;

    try {
      db.prepare(`
        UPDATE orders SET
          order_number = ?, order_date = ?, customer_name = ?, customer_contact = ?, 
          delivery_charges = ?, outsource_charges = ?, customer_address = ?, map_pin = ?
        WHERE id = ?
      `).run(
        order_number, order_date, customer_name, customer_contact, 
        delivery_charges, outsource_charges, customer_address, map_pin,
        id
      );
      res.json({ message: "Order updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  app.delete("/api/orders", (req, res) => {
    const { ids } = req.body; // Array of IDs or 'all'
    try {
      if (ids === 'all') {
        db.prepare("DELETE FROM orders").run();
      } else if (Array.isArray(ids)) {
        const placeholders = ids.map(() => "?").join(",");
        db.prepare(`DELETE FROM orders WHERE id IN (${placeholders})`).run(...ids);
      }
      res.json({ message: "Orders deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete orders" });
    }
  });

  app.get("/api/stats", (req, res) => {
    const { start, end } = req.query;
    let query = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(delivery_charges) as total_delivery,
        SUM(outsource_charges) as total_outsource,
        SUM(delivery_charges - outsource_charges) as total_profit
      FROM orders
    `;
    const params = [];

    if (start && end) {
      query += " WHERE order_date BETWEEN ? AND ?";
      params.push(start, end);
    }

    const stats = db.prepare(query).get(...params);
    res.json(stats || { total_orders: 0, total_delivery: 0, total_outsource: 0, total_profit: 0 });
  });

  app.get("/api/profile", (req, res) => {
    const profile = db.prepare("SELECT * FROM profile WHERE id = 1").get();
    res.json(profile);
  });

  app.post("/api/profile", (req, res) => {
    const { company_name, company_email, company_phone, company_logo } = req.body;
    db.prepare(`
      UPDATE profile 
      SET company_name = ?, company_email = ?, company_phone = ?${company_logo ? ', company_logo = ?' : ''}
      WHERE id = 1
    `).run(...[company_name, company_email, company_phone, ...(company_logo ? [company_logo] : [])]);
    res.json({ message: "Profile updated successfully" });
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
