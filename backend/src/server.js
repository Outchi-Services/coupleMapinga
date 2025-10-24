// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./config/database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health route
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Test DB connection (simple query)
app.get('/api/db-test', async (req, res) => {
  try {
    // Example: count guests (adjust table name to yours)
    const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM guests');
    return res.json({ ok: true, guests: rows[0].count });
  } catch (err) {
    console.error('DB test error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Example: fetch guest by invitation_code (UUID) or name
app.get('/api/guest/:code', async (req, res) => {
  const code = req.params.code;
  try {
    const { rows } = await db.query('SELECT * FROM guests WHERE invitation_code = $1 LIMIT 1', [code]);
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Guest not found' });
    return res.json({ ok: true, guest: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
