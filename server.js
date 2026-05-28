import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";

import { query, init } from "./db.js";

dotenv.config();
await init();

const app = express();
app.use(cors());
app.use(express.json());

// small helper to wrap async route handlers
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const PORT = process.env.PORT || 8000;

// POST /api/login
// body: { email, password }
// Returns: { success: true, user: {id, name, email} } or { success: false, message }
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res
      .status(400)
      .json({ success: false, message: "Email and password required" });

  try {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (!result || !result.rows || result.rows.length === 0)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    // JWT
    if (!process.env.JWT_SECRET) {
      console.error("Missing JWT_SECRET");
      return res
        .status(500)
        .json({ success: false, message: "Server not configured" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

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
app.get(
  "/api/geo",
  wrap(async (req, res) => {
    try {
      const ip = req.query.ip;
      let url;
      if (!ip) {
        url = "https://ipinfo.io/geo";
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
        await query("INSERT INTO searches (ip, result) VALUES ($1, $2)", [
          ip,
          JSON.stringify(json),
        ]);
      }

      res.json(json);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "failed" });
    }
  }),
);

// GET
app.get(
  "/api/history",
  wrap(async (req, res) => {
    const result = await query(
      "SELECT id, ip, result, created_at FROM searches ORDER BY created_at DESC",
    );
    res.json(result.rows || []);
  }),
);

// DELETE
app.delete(
  "/api/history",
  wrap(async (req, res) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "ids array required" });

    // Ensure all ids are integers
    const intIds = ids
      .map((i) => parseInt(i, 10))
      .filter((n) => Number.isInteger(n));
    if (intIds.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No valid ids provided" });

    await query(`DELETE FROM searches WHERE id = ANY($1::int[])`, [intIds]);
    res.json({ success: true });
  }),
);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});
