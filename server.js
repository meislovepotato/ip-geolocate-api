import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";

import { pool, init } from "./db.js";

dotenv.config();
await init();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 8000;

// POST /api/login
// body: { email, password }
// Returns: { success: true, user: {id, name, email} } or { success: false, message }
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password required" });

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });

    // JWT
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/geo?ip=<ip>
// If ip param is missing => call ipinfo for caller: https://ipinfo.io/geo
// If ip param present => call https://ipinfo.io/{ip}/geo
// Proxy responses to avoid CORS issues on frontend.
app.get('/api/geo', async (req, res) => {
  try {
    const ip = req.query.ip;
    let url;
    if (!ip) {
      url = 'https://ipinfo.io/geo';
    } else {
      url = `https://ipinfo.io/${encodeURIComponent(ip)}/geo`;
    }
    // If you have token:
    const token = process.env.IPINFO_TOKEN;
    const fetchUrl = token ? `${url}?token=${token}` : url;

    const r = await fetch(fetchUrl);
    const json = await r.json();

    // Save history only when ip param passed (user searches)
    if (ip && json && !json.error) {
      await pool.query(
        "INSERT INTO searches (ip, result) VALUES ($1, $2)",
        [ip, JSON.stringify(json)]
      );
    }

    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

// GET
app.get("/api/history", async (req, res) => {
  const result = await pool.query("SELECT id, ip, result, created_at FROM searches ORDER BY created_at DESC");
  res.json(result.rows);
});

// DELETE
app.delete("/api/history", async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids)) return res.status(400).json({ success: false, message: "ids array required" });

  await pool.query(`DELETE FROM searches WHERE id = ANY($1::int[])`, [ids]);
  res.json({ success: true });
});


app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
