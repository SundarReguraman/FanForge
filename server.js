const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'subscriptions.json');
const COUNTS_FILE = path.join(__dirname, 'counts.json');
const VISITS_FILE = path.join(__dirname, 'visits.json');

// Configuration: retention and max ids
const VISIT_RETENTION_DAYS = Number(process.env.VISIT_RETENTION_DAYS) || 90; // days
const VISIT_MAX_IDS = Number(process.env.VISIT_MAX_IDS) || 10000;

function hashId(id){
  return crypto.createHash('sha256').update(id).digest('hex');
}

function nowIso(){ return new Date().toISOString(); }

// File-based visits storage (JSON fallback)
async function readVisits(){
  try{
    const s = await fs.readFile(VISITS_FILE, 'utf8');
    const v = JSON.parse(s || '{}');
    const total = Number(v.total || 0);
    const ids = v.ids && typeof v.ids === 'object' ? v.ids : {};
    const unique = Object.keys(ids).length;
    // ensure we only return up to VISIT_MAX_IDS
    const entries = Object.entries(ids).sort((a,b)=> (b[1]||'').localeCompare(a[1]||'')).slice(0, VISIT_MAX_IDS);
    const trimmed = {};
    for(const [h,ts] of entries) trimmed[h] = ts;
    return { total: total, unique: unique, ids: trimmed };
  }catch(e){
    return { total:0, unique:0, ids: {} };
  }
}

async function writeVisits(obj){
  const toWrite = { total: Number(obj.total||0), ids: obj.ids || {} };
  try{ await fs.writeFile(VISITS_FILE, JSON.stringify(toWrite, null, 2), 'utf8'); }catch(e){ console.error('writeVisits error', e); }
}

function pruneObjVisits(obj){
  const cutoff = Date.now() - VISIT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoff).toISOString();
  const ids = obj.ids || {};
  const filtered = Object.fromEntries(Object.entries(ids).filter(([h,ts]) => { try{ return new Date(ts).toISOString() >= cutoffIso; }catch(e){ return false; } }));
  // enforce max ids
  const sorted = Object.entries(filtered).sort((a,b)=> (b[1]||'').localeCompare(a[1]||''));
  const sliced = sorted.slice(0, VISIT_MAX_IDS);
  const result = {};
  for(const [h,ts] of sliced) result[h]=ts;
  return { total: Number(obj.total||0), ids: result };
}

async function recordVisit(clientId){
  try{
    const cur = await readVisits();
    cur.total = Number(cur.total||0) + 1;
    const now = nowIso();
    if(clientId && typeof clientId === 'string'){
      const h = hashId(clientId.trim());
      cur.ids = Object.assign({}, cur.ids || {});
      cur.ids[h] = now;
    }
    const pruned = pruneObjVisits(cur);
    await writeVisits(pruned);
    return { total: pruned.total, unique: Object.keys(pruned.ids||{}).length };
  }catch(e){ console.error('recordVisit error', e); return { total:0, unique:0 }; }
}

app.use(cors());
app.use(express.json());

// Admin auth middleware: supports env token `ADMIN_TOKEN` or basic auth via `ADMIN_USER`/`ADMIN_PASS`.
function adminAuth(req, res, next){
  const token = process.env.ADMIN_TOKEN;
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;

  // Token-based auth (preferred)
  if(token){
    const provided = req.get('x-admin-token') || req.query.token || '';
    if(provided === token) return next();
    res.set('WWW-Authenticate','Token realm="Admin"');
    return res.status(401).send('Unauthorized');
  }

  // Basic auth fallback
  if(user && pass){
    const auth = req.get('authorization');
    if(auth && auth.startsWith('Basic ')){
      const creds = Buffer.from(auth.slice(6), 'base64').toString('utf8');
      const [u,p] = creds.split(':');
      if(u === user && p === pass) return next();
    }
    res.set('WWW-Authenticate','Basic realm="Admin"');
    return res.status(401).send('Unauthorized');
  }

  // No admin credentials configured — allow with a warning token default (development only)
  const devToken = 'devtoken';
  const provided = req.get('x-admin-token') || req.query.token || '';
  if(provided === devToken) return next();
  res.set('WWW-Authenticate','Token realm="Admin"');
  return res.status(401).send('Unauthorized - admin token not set');
}

// Serve other static files (admin.html will be served publicly; API endpoints remain protected)
app.use(express.static(__dirname));

// Helper to write a new subscription entry
async function saveEntry(entry){
  try{
    let list = [];
    try{ const content = await fs.readFile(DATA_FILE, 'utf8'); list = JSON.parse(content || '[]'); } catch(e){}

    // Normalize email for comparison
    const email = (entry.email || '').trim().toLowerCase();
    if(!email) return false;

    const idx = list.findIndex(it => (it.email || '').trim().toLowerCase() === email);
    if(idx >= 0){
      // update existing entry with new plan and timestamp
      list[idx].plan = entry.plan || list[idx].plan || null;
      list[idx].ts = entry.ts || new Date().toISOString();
    } else {
      list.push(entry);
    }

    await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
    return true;
  } catch(err){
    console.error('Failed to save entry', err);
    return false;
  }
}

app.post('/subscribe', async (req, res) => {
  const { email, plan } = req.body || {};
  if(!email || typeof email !== 'string'){
    return res.status(400).json({ ok:false, error: 'email required' });
  }
  const em = email.trim();
  const planName = plan || null;
  try{
    // read existing subscriptions
    let list = [];
    try{ const content = await fs.readFile(DATA_FILE, 'utf8'); list = JSON.parse(content || '[]'); } catch(e){}

    // read counts
    let counts = { Monthly: 0, Yearly: 0 };
    try{ const s = await fs.readFile(COUNTS_FILE, 'utf8'); counts = JSON.parse(s || JSON.stringify(counts)); } catch(e){}

    const idx = list.findIndex(it => (it.email||'').trim().toLowerCase() === em.toLowerCase());
    const now = new Date().toISOString();
    let counted = false;
    if(idx >= 0){
      // existing user
      const existing = list[idx];
      existing.plan = planName || existing.plan || null;
      existing.ts = now;
      existing.clicked = existing.clicked || {};
      if(planName && !existing.clicked[planName]){
        existing.clicked[planName] = true;
        counted = true;
        counts[planName] = (counts[planName] || 0) + 1;
      }
      list[idx] = existing;
    } else {
      // new user
      const entry = { email: em, plan: planName, ts: now, clicked: {} };
      if(planName){ entry.clicked[planName] = true; counted = true; counts[planName] = (counts[planName] || 0) + 1; }
      list.push(entry);
    }

    await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
    await fs.writeFile(COUNTS_FILE, JSON.stringify(counts, null, 2), 'utf8');

    return res.json({ ok:true, counted: counted, counts: counts });
  }catch(e){
    console.error('subscribe error', e);
    return res.status(500).json({ ok:false });
  }
});

// Protected: list subscriptions
app.get('/subscriptions', adminAuth, async (req, res) => {
  try{
    const content = await fs.readFile(DATA_FILE, 'utf8');
    const list = JSON.parse(content || '[]');
    res.json({ ok:true, data: list });
  }catch(e){
    res.json({ ok:true, data: [] });
  }
});

// Protected: delete a subscription by email (URL-encoded email)
app.delete('/subscriptions/:email', adminAuth, async (req, res) => {
  try{
    const raw = req.params.email || '';
    const email = decodeURIComponent(raw).trim().toLowerCase();
    if(!email) return res.status(400).json({ ok:false, error: 'email required' });

    let list = [];
    try{ const content = await fs.readFile(DATA_FILE, 'utf8'); list = JSON.parse(content || '[]'); } catch(e){}
    const newList = list.filter(it => ((it.email||'').trim().toLowerCase() !== email));
    await fs.writeFile(DATA_FILE, JSON.stringify(newList, null, 2), 'utf8');
    return res.json({ ok:true });
  }catch(e){
    console.error('Delete failed', e);
    return res.status(500).json({ ok:false });
  }
});

// Protected: counts endpoint
app.get('/counts', adminAuth, async (req, res) => {
  try{
    let counts = { Monthly: 0, Yearly: 0 };
    try{ const s = await fs.readFile(COUNTS_FILE, 'utf8'); counts = JSON.parse(s || JSON.stringify(counts)); } catch(e){}
    // include visit stats
    const visits = await readVisits();
    return res.json({ ok:true, counts: counts, visits: { total: visits.total, unique: visits.unique } });
  }catch(e){
    return res.status(500).json({ ok:false });
  }
});

// Export visits CSV (admin-only)
app.get('/export/visits.csv', adminAuth, async (req, res) => {
  try{
    const visits = await readVisits();
    // CSV: totals then per-id rows
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="visits.csv"');
    const lines = [];
    lines.push('metric,key,value');
    lines.push('total, ,'+(visits.total||0));
    lines.push('unique, ,'+(visits.unique||0));
    lines.push('');
    lines.push('id,hash,lastSeen');
    for(const [h,ts] of Object.entries(visits.ids||{})){
      lines.push('id,'+h+','+ts);
    }
    res.send(lines.join('\n'));
  }catch(e){
    console.error('export csv error', e);
    res.status(500).send('error');
  }
});

// Track page visit: overall and unique (by clientId)
app.post('/visit', async (req, res) => {
  try{
    const { clientId } = req.body || {};
    const result = recordVisit(clientId);
    return res.json({ ok:true, total: result.total, unique: result.unique });
  }catch(e){
    console.error('visit error', e);
    return res.status(500).json({ ok:false });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
