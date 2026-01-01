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
const usersPath = path.join(__dirname, 'users.json');

const readData = (p) => {
    if (!fs.existsSync(p)) return p === usersPath ? {} : [];
    return JSON.parse(fs.readFileSync(p, 'utf8'));
};

const writeData = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2));

app.get('/api/scripts', (req, res) => {
    res.json(readData(dbPath));
});

app.post('/api/scripts', (req, res) => {
    const scripts = readData(dbPath);
    const newScript = {
        id: req.body.title.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 9999),
        owner: req.body.owner,
        title: req.body.title,
        content: req.body.content,
        public: req.body.public,
        pass: req.body.pass
    };
    scripts.push(newScript);
    writeData(dbPath, scripts);
    res.json({ success: true });
});

app.post('/api/user/sync', (req, res) => {
    const users = readData(usersPath);
    const { userId, status, role, blacklisted, reason } = req.body;
    users[userId] = { status, role, blacklisted, reason };
    writeData(usersPath, users);
    res.json({ success: true });
});

app.get('/api/user/:id', (req, res) => {
    const users = readData(usersPath);
    res.json(users[req.params.id] || { status: 'freemium', role: 'Member', blacklisted: false });
});

app.get('/s/:id', (req, res) => {
    const scripts = readData(dbPath);
    const script = scripts.find(s => s.id === req.params.id);
    if (!script) return res.status(404).send("Not Found");
    res.send(`<html><body style="background:#fff;padding:20px;white-space:pre-wrap;font-family:monospace;">${script.content.replace(/</g, "&lt;")}</body></html>`);
});

app.listen(PORT, () => console.log(`API Active: ${PORT}`));
