import dotenv from "dotenv";

dotenv.config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const { db, init } = require('./db');
const cors = require('cors');

init();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 8000;

// POST /api/login
// body: { email, password }
// Returns: { success: true, user: {id, name, email} } or { success: false, message }
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

  const user = db.prepare('SELECT id, name, email, password FROM users WHERE email = ?').get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  // In real app return token (JWT). For simplicity return a small "session" object
  const payload = { id: user.id, name: user.name, email: user.email };
  return res.json({ success: true, user: payload });
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
      const stmt = db.prepare('INSERT INTO searches (ip, result) VALUES (?, ?)');
      stmt.run(ip, JSON.stringify(json));
    }

    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

// GET /api/history
app.get('/api/history', (req, res) => {
  const rows = db.prepare('SELECT id, ip, result, created_at FROM searches ORDER BY created_at DESC').all();
  // parse result JSON
  const parsed = rows.map(r => ({ ...r, result: JSON.parse(r.result) }));
  res.json(parsed);
});

// DELETE /api/history (bulk) body: { ids: [1,2,3] }
app.delete('/api/history', (req, res) => {
  const ids = req.body && req.body.ids;
  if (!Array.isArray(ids)) return res.status(400).json({ success: false, message: 'ids array required' });
  const del = db.prepare(`DELETE FROM searches WHERE id = ?`);
  const tx = db.transaction((list) => list.forEach(id => del.run(id)));
  tx(ids);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
