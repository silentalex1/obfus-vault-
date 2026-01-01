const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const dbPath = path.join(__dirname, 'database.json');

const readDB = () => {
    if (!fs.existsSync(dbPath)) return [];
    return JSON.parse(fs.readFileSync(dbPath));
};

const writeDB = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

app.post('/api/scripts', (req, res) => {
    const scripts = readDB();
    const newScript = {
        id: req.body.title.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 9999),
        ...req.body,
        date: new Date().toISOString()
    };
    scripts.push(newScript);
    writeDB(scripts);
    res.json({ success: true, id: newScript.id });
});

app.get('/api/scripts', (req, res) => {
    const scripts = readDB();
    res.json(scripts.filter(s => s.public === true));
});

app.get('/s/:id', (req, res) => {
    const scripts = readDB();
    const script = scripts.find(s => s.id === req.params.id);

    if (!script) return res.status(404).send("Script not found.");

    res.send(`
        <html>
            <head>
                <title>${script.title}</title>
                <style>
                    body { margin: 20px; font-family: 'Fira Code', monospace; background: #fff; color: #000; white-space: pre-wrap; word-wrap: break-word; }
                </style>
            </head>
            <body>${script.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
