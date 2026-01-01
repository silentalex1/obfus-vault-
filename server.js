const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

const dbPath = path.join(__dirname, 'database.json');

const getDB = () => {
    try {
        if (!fs.existsSync(dbPath)) return { scripts: [], users: {} };
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        return { scripts: [], users: {} };
    }
};

const saveDB = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

app.get('/api/scripts', (req, res) => {
    res.json(getDB().scripts);
});

app.post('/api/scripts', (req, res) => {
    const db = getDB();
    const newScript = {
        id: req.body.title.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 9999),
        owner: req.body.owner,
        title: req.body.title,
        content: req.body.content,
        public: req.body.public,
        pass: req.body.pass,
        date: new Date().toISOString()
    };
    db.scripts.push(newScript);
    saveDB(db);
    res.json({ success: true, id: newScript.id });
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
    res.send(`<html><body style="background:#fff;color:#000;font-family:monospace;white-space:pre-wrap;padding:20px;">${script.content.replace(/</g, "&lt;")}</body></html>`);
});

app.listen(PORT, () => console.log(`Server: ${PORT}`));
