const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

const dbPath = path.join(__dirname, 'database.json');
let botProcess = null;

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

app.post('/api/runbot', (req, res) => {
    const { token, botCode } = req.body;
    
    if (botProcess) {
        botProcess.kill();
    }

    const tempBotPath = path.join(__dirname, 'temp_bot.js');
    fs.writeFileSync(tempBotPath, botCode);

    botProcess = spawn('node', [tempBotPath], {
        env: { ...process.env, BOT_TOKEN: token }
    });

    botProcess.stdout.on('data', (data) => console.log(`Bot: ${data}`));
    botProcess.stderr.on('data', (data) => console.error(`Bot Error: ${data}`));

    res.json({ success: true, message: "Bot started on vault servers." });
});

app.get('/s/:id', (req, res) => {
    const scripts = readDB();
    const script = scripts.find(s => s.id === req.params.id);
    if (!script) return res.status(404).send("Script not found.");
    res.send(`<html><body style="background:#fff;color:#000;font-family:monospace;white-space:pre-wrap;padding:20px;">${script.content.replace(/</g, "&lt;")}</body></html>`);
});

app.listen(PORT, () => {
    console.log(`Server active on port ${PORT}`);
});
