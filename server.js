const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

const dbPath = path.join(__dirname, 'database.json');

const getDB = () => {
    if (!fs.existsSync(dbPath)) {
        const init = { scripts: [], users: {} };
        fs.writeFileSync(dbPath, JSON.stringify(init, null, 2));
        return init;
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};

const saveDB = (db) => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

app.get('/api/scripts', (req, res) => {
    res.json(getDB().scripts);
});

app.post('/api/scripts', (req, res) => {
    const db = getDB();
    const id = req.body.title.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 9999);
    const script = {
        id: id,
        owner: req.body.owner,
        title: req.body.title,
        content: req.body.content,
        public: req.body.public,
        pass: req.body.pass,
        date: new Date().toISOString()
    };
    db.scripts.push(script);
    saveDB(db);
    res.json({ success: true, id: id });
});

app.get('/api/user/status/:username', (req, res) => {
    const db = getDB();
    const user = db.users[req.params.username] || { status: 'freemium', blacklisted: false };
    res.json(user);
});

app.get('/s/:id', (req, res) => {
    const db = getDB();
    const script = db.scripts.find(s => s.id === req.params.id);
    if (!script) return res.status(404).send("Error: Script not found in vault.");
    res.send(`<!DOCTYPE html><html><head><title>Vault | ${script.title}</title><style>body{background:#fff;color:#000;font-family:'Fira Code',monospace;white-space:pre-wrap;padding:30px;font-size:14px;line-height:1.5;word-wrap:break-word;}</style></head><body>${script.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body></html>`);
});

app.listen(PORT, () => console.log(`Backend live on port ${PORT}`));
