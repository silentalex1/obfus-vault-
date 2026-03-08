const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database(path.join(__dirname, 'obfusvault.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    public TEXT DEFAULT 'yes',
    pass TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

app.use(express.json({ limit: '50mb' }));
app.use(cors());

function fnv1a(str) {
    let h = 0x811c9dc5 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
}

function ovHash(str) {
    let a = fnv1a(str + 'OV_A_2025');
    let b = fnv1a(str + 'OV_B_2025');
    let c = fnv1a(str + 'OV_C_2025');
    for (let i = 0; i < 256; i++) {
        const t = a;
        a = ((b ^ (c >>> 3)) + Math.imul(a, 0x9e3779b9)) >>> 0;
        b = ((c ^ (a << 5))  + Math.imul(b, 0x85ebca6b)) >>> 0;
        c = ((t ^ (b >>> 7)) + Math.imul(c, 0xc2b2ae35)) >>> 0;
    }
    return [a, b, c].map(x => x.toString(16).padStart(8,'0')).join('');
}
function verifyClientToken(tok) {
    try {
        const raw   = Buffer.from(tok, 'base64').toString('utf8');
        const parts = raw.split('|');
        if (parts.length !== 4) return null;
        const [username, ts, rand, sig] = parts;
        const age = Date.now() - parseInt(ts, 36);
        if (age > 30 * 24 * 60 * 60 * 1000) return null;
        const expected = ovHash(username + '|' + ts + '|' + rand + '|OV_SIG_SECRET_2025');
        if (sig !== expected) return null;
        return username;
    } catch { return null; }
}
function authMiddleware(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: 'No token' });
    const tok = header.split(' ')[1];
    const username = verifyClientToken(tok);
    if (!username) return res.status(401).json({ error: 'Invalid token' });
    req.username = username;
    next();
}

function hashPass(pass) {
    return crypto.createHash('sha256').update(pass + 'ov_script_pass_salt').digest('hex');
}

app.get('/api/scripts', (req, res) => {
    const header = req.headers['authorization'];
    let username = null;
    if (header) {
        const tok = header.split(' ')[1];
        username = verifyClientToken(tok);
    }
    let scripts;
    if (username) {
        scripts = db.prepare('SELECT id, owner, title, public, created_at FROM scripts WHERE public = ? OR owner = ? ORDER BY created_at DESC').all('yes', username);
    } else {
        scripts = db.prepare('SELECT id, owner, title, public, created_at FROM scripts WHERE public = ? ORDER BY created_at DESC').all('yes');
    }
    res.json(scripts);
});

app.post('/api/scripts', authMiddleware, (req, res) => {
    const { title, content, pass } = req.body;
    const pub = req.body.public;
    if (!title || !content) return res.status(400).json({ error: 'Missing fields' });
    const id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const hashedPass = pass ? hashPass(pass) : null;
    db.prepare('INSERT INTO scripts (id, owner, title, content, public, pass) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, req.username, title, content, pub || 'yes', hashedPass
    );
    res.json({ success: true, id });
});

app.delete('/api/scripts/:id', authMiddleware, (req, res) => {
    const script = db.prepare('SELECT owner FROM scripts WHERE id = ?').get(req.params.id);
    if (!script) return res.status(404).json({ error: 'Not found' });
    if (script.owner !== req.username) return res.status(403).json({ error: 'Forbidden' });
    db.prepare('DELETE FROM scripts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

app.get('/s/:id', (req, res) => {
    const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
    if (!script) return res.status(404).send('Not Found');
    if (script.public === 'no') return res.status(403).send('Private script.');
    if (script.pass) {
        const provided = req.query.pass || '';
        if (!provided || hashPass(provided) !== script.pass) {
            return res.send(`<!DOCTYPE html><html><head><title>Password Required</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#0a0a0a;color:#e0e0e0;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;}input{background:#111;border:1px solid #333;color:#fff;padding:10px 14px;border-radius:6px;font-size:14px;outline:none;}button{background:#fff;color:#000;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:14px;}</style></head><body><h2>Password Required</h2><input type="password" id="p" placeholder="Enter password"><button onclick="window.location.href=window.location.pathname+'?pass='+document.getElementById('p').value">Unlock</button></body></html>`);
        }
    }
    const safe = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    res.send(`<!DOCTYPE html><html><head><title>${safe(script.title)}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#0a0a0a;color:#e0e0e0;font-family:'Fira Code',monospace;padding:40px;white-space:pre-wrap;word-wrap:break-word;line-height:1.6;font-size:14px;}h1{color:#fff;margin-bottom:8px;font-size:18px;}p{color:#666;margin-bottom:24px;font-size:12px;}pre{background:#111;padding:24px;border-radius:8px;border:1px solid #222;overflow-x:auto;}</style></head><body><h1>${safe(script.title)}</h1><p>by ${safe(script.owner)}</p><pre>${safe(script.content)}</pre></body></html>`);
});

app.use(express.static(path.join(__dirname)));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));
app.use('/dashboard/main-page', express.static(path.join(__dirname, 'dashboard', 'main-page')));

app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard', 'index.html')));
app.get('/dashboard/', (req, res) => res.sendFile(path.join(__dirname, 'dashboard', 'index.html')));
app.get('/dashboard/main-page', (req, res) => res.sendFile(path.join(__dirname, 'dashboard', 'main-page', 'index.html')));
app.get('/dashboard/main-page/', (req, res) => res.sendFile(path.join(__dirname, 'dashboard', 'main-page', 'index.html')));

app.listen(PORT, () => console.log('ObfusVault running on port ' + PORT));
