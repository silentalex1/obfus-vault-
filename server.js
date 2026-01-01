const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

const dbPath = path.join(__dirname, 'database.json');

const readDB = () => {
    if (!fs.existsSync(dbPath)) return [];
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        return [];
    }
};

const writeDB = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

app.get('/api/scripts', (req, res) => {
    res.json(readDB());
});

app.post('/api/scripts', (req, res) => {
    const scripts = readDB();
    const newScript = {
        id: req.body.title.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 9999),
        owner: req.body.owner || 'Guest',
        title: req.body.title,
        content: req.body.content,
        public: req.body.public,
        pass: req.body.pass,
        date: new Date().toISOString()
    };
    scripts.push(newScript);
    writeDB(scripts);
    res.json({ success: true, id: newScript.id });
});

app.get('/s/:id', (req, res) => {
    const scripts = readDB();
    const script = scripts.find(s => s.id === req.params.id);
    if (!script) return res.status(404).send("Script not found.");
    res.send(`<html><body style="background:#fff;color:#000;font-family:monospace;white-space:pre-wrap;padding:20px;">${script.content.replace(/</g, "&lt;")}</body></html>`);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
