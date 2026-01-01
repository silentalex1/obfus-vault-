const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(cors());

const dbPath = path.join(__dirname, 'database.json');
let botOnline = false;

const getDB = () => {
    if (!fs.existsSync(dbPath)) {
        const init = { scripts: [], users: {} };
        fs.writeFileSync(dbPath, JSON.stringify(init));
        return init;
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};

const saveDB = (db) => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

app.get('/api/scripts', (req, res) => {
    res.status(200).json(getDB().scripts);
});

app.post('/api/scripts', (req, res) => {
    const db = getDB();
    const id = Math.random().toString(36).substring(2, 10);
    const script = {
        id,
        owner: req.body.owner || 'Guest',
        title: req.body.title || 'Untitled',
        content: req.body.content,
        public: req.body.public,
        pass: req.body.pass || null,
        date: new Date().toISOString()
    };
    db.scripts.push(script);
    saveDB(db);
    res.status(200).json({ success: true, id });
});

app.post('/api/bot-heartbeat', (req, res) => {
    botOnline = true;
    res.json({ success: true });
});

app.get('/api/bot-status', (req, res) => {
    res.json({ online: botOnline });
});

app.get('/api/user/status/:username', (req, res) => {
    const db = getDB();
    const user = db.users[req.params.username] || { status: 'freemium', blacklisted: false };
    res.json(user);
});

app.get('/s/:id', (req, res) => {
    const db = getDB();
    const script = db.scripts.find(s => s.id === req.params.id);
    if (!script) return res.status(404).send("Not Found");
    res.send(`<!DOCTYPE html><html><head><title>${script.title}</title><style>body{background:#fff;color:#000;font-family:'Fira Code',monospace;padding:40px;white-space:pre-wrap;word-wrap:break-word;line-height:1.5;}</style></head><body>${script.content.replace(/</g, "&lt;")}</body></html>`);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

app.listen(PORT, () => console.log(`Live: ${PORT}`));
