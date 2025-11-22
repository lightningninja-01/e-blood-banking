// server.js — single repo: static frontend + simple file-db API
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { return { donors: [], requests: [], inventory: {} }; }
}
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}
if (!fs.existsSync(DB_FILE)) writeDB(readDB());

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR)); // serve frontend

function load() { return readDB(); }
function save(db) { writeDB(db); }

// API
app.get('/api/inventory', (req, res) => {
  const db = load();
  res.json(db.inventory);
});

app.post('/api/inventory/add', (req, res) => {
  const { group, qty = 1 } = req.body;
  const db = load();
  db.inventory[group] = (db.inventory[group] || 0) + Number(qty);
  save(db);
  res.json({ group, qty: db.inventory[group] });
});

app.post('/api/inventory/remove', (req, res) => {
  const { group, qty = 1 } = req.body;
  const db = load();
  db.inventory[group] = Math.max(0, (db.inventory[group] || 0) - Number(qty));
  save(db);
  res.json({ group, qty: db.inventory[group] });
});

app.get('/api/donors', (req, res) => {
  const db = load();
  res.json(db.donors);
});

app.post('/api/donors', (req, res) => {
  const db = load();
  const donor = { ...req.body, id: Date.now().toString(), createdAt: new Date().toISOString() };
  db.donors.unshift(donor);
  // demo: when donor registers, add 1 unit to inventory
  db.inventory[donor.blood] = (db.inventory[donor.blood] || 0) + 1;
  save(db);
  res.json(donor);
});

app.delete('/api/donors/:id', (req, res) => {
  const id = req.params.id;
  const db = load();
  db.donors = db.donors.filter(d => d.id !== id && d._id !== id);
  save(db);
  res.json({ ok: true });
});

app.get('/api/requests', (req, res) => {
  const db = load();
  res.json(db.requests);
});

app.post('/api/requests', (req, res) => {
  const db = load();
  const r = { ...req.body, id: Date.now().toString(), status: 'pending', createdAt: new Date().toISOString() };
  const avail = db.inventory[r.blood] || 0;
  if (avail >= Number(r.qty)) {
    db.inventory[r.blood] = avail - Number(r.qty);
    r.status = 'fulfilled';
  }
  db.requests.unshift(r);
  save(db);
  res.json({ request: r, message: r.status === 'fulfilled' ? `Allocated ${r.qty} unit(s)` : `Not enough inventory. Available: ${avail}` });
});

// fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// listen (Render provides PORT in env)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
