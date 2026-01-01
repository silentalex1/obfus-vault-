window.switchPage = (id) => {
    document.querySelectorAll('.workspace').forEach(p => p.classList.add('hide'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + id).classList.remove('hide');
    const target = Array.from(document.querySelectorAll('.menu-btn')).find(b => b.textContent.includes(id));
    if (target) target.classList.add('active');
    log(`Switched to ${id} view.`);
};

window.clearConsole = () => {
    document.getElementById('console-output').innerHTML = '';
    log("Console terminal cleared.", true);
};

window.showSubmitModal = () => document.getElementById('submit-modal').classList.remove('hide');
window.hideSubmitModal = () => document.getElementById('submit-modal').classList.add('hide');
window.togglePassInput = () => document.getElementById('pass-field').classList.toggle('hide');

const highlighter = (text) => {
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return escaped
        .replace(/\b(local|function|return|then|if|end|else|elseif|while|do|for|in|nil|true|false)\b/g, '<span class="kwd">$1</span>')
        .replace(/".*?"|'.*?'/g, '<span class="str">$&</span>')
        .replace(/\b(\d+)\b/g, '<span class="num">$1</span>')
        .replace(/\b(print|warn|error|getgenv|getfenv|setmetatable|getmetatable|loadstring|pcall)\b/g, '<span class="fn">$1</span>');
};

window.updateSyntax = (type) => {
    const area = type === 'main' ? document.getElementById('main-editor') : document.getElementById('post-content');
    const layer = type === 'main' ? document.getElementById('main-highlight') : document.getElementById('post-highlight');
    layer.innerHTML = highlighter(area.value) + "\n";
};

window.syncScroll = (type) => {
    const area = type === 'main' ? document.getElementById('main-editor') : document.getElementById('post-content');
    const layer = type === 'main' ? document.getElementById('main-highlight') : document.getElementById('post-highlight');
    layer.scrollTop = area.scrollTop;
    layer.scrollLeft = area.scrollLeft;
};

function log(t, s = false) {
    const div = document.createElement('div');
    div.className = s ? 'green' : '';
    div.innerHTML = `<span style="color:rgba(255,255,255,0.1);margin-right:8px;">[${new Date().toLocaleTimeString()}]</span> > ${t}`;
    const c = document.getElementById('console-output');
    if(c){ c.appendChild(div); c.scrollTop = c.scrollHeight; }
}

const editor = document.getElementById('main-editor');
const loader = document.getElementById('work-loader');
const barFill = document.getElementById('load-fill');
const barVal = document.getElementById('load-val');
const barMsg = document.getElementById('loader-msg');

function customDeob(c) {
    let r = c;
    r = r.replace(/string\.char\(([\d,\s]+)\)/g, (_, n) => {
        try { return `"${String.fromCharCode(...n.split(',').map(x => parseInt(x.trim())))}"`; } catch { return _; }
    });
    r = r.replace(/bit32\.bxor\(([\d\w\s,]+)\)/g, (_, a) => {
        const p = a.split(',').map(x => parseInt(x.trim())); return (p[0] ^ p[1]).toString();
    });
    r = r.replace(/atob\(['"](.*?)['"]\)/g, (_, b) => { try { return `"${atob(b)}"`; } catch { return _; } });
    return r.trim();
}

async function handleWork(m) {
    const c = editor.value.trim();
    if (!c) return log("Error: Empty buffer.");
    loader.style.display = 'flex';
    let p = 0;
    const stages = m === 'deob' ? ["VIRTUALIZING", "IDENTIFYING VM", "SUCCESS"] : ["CRYPTING", "VM PACKING", "SUCCESS"];
    const t = setInterval(() => {
        p += 1; barFill.style.width = p + '%'; barVal.innerText = p + '%';
        barMsg.innerText = stages[Math.min(Math.floor((p/100)*stages.length), stages.length-1)];
        if (p >= 100) {
            clearInterval(t);
            editor.value = m === 'deob' ? customDeob(c) : `loadstring("${btoa(c)}")()`;
            updateSyntax('main');
            setTimeout(() => { loader.style.display = 'none'; log(`${m.toUpperCase()} process complete.`, true); }, 500);
        }
    }, 20);
}

document.getElementById('btn-pull').addEventListener('click', async () => {
    let u = document.getElementById('pull-url').value.trim();
    if (!u) return;
    log("Requesting script source...");
    try {
        const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`);
        const d = await r.text();
        editor.value = d;
        updateSyntax('main');
        log("Code retrieved successfully.", true);
    } catch(e) { log("Retrieval failed."); }
});

async function renderScripts() {
    const cl = document.getElementById('community-list');
    const pl = document.getElementById('private-list');
    const u = document.getElementById('user-display').innerText;
    cl.innerHTML = ''; pl.innerHTML = '';
    const r = await fetch('/api/scripts');
    const data = await r.json();
    data.forEach(s => {
        const div = document.createElement('div');
        div.className = 'script-card';
        div.innerHTML = `<div><h3>${s.title}</h3><p>By ${s.owner}</p></div><div style="display:flex;gap:10px;"><button class="action-btn" onclick="copyLink('${s.id}')">copy link</button><button class="action-btn" onclick="window.open('/s/${s.id}','_blank')">view</button></div>`;
        if (s.public === "yes") cl.appendChild(div);
        else if (s.owner === u) pl.appendChild(div);
    });
}

document.getElementById('btn-post-script').addEventListener('click', async () => {
    const t = document.getElementById('post-title').value;
    const c = document.getElementById('post-content').value;
    const p = document.getElementById('post-public').value;
    const o = document.getElementById('user-display').innerText;
    if (!t || !c) return;
    const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title: t, content: c, public: p, owner: o, pass: document.getElementById('use-pass').checked ? document.getElementById('post-pass').value : null })
    });
    if (res.ok) { hideSubmitModal(); renderScripts(); log("Server: Script data synchronized.", true); }
});

window.copyLink = (id) => { navigator.clipboard.writeText(window.location.origin + "/s/" + id); log("Link copied."); };

document.getElementById('run-deob').addEventListener('click', () => handleWork('deob'));
document.getElementById('run-obf').addEventListener('click', () => handleWork('obf'));
document.getElementById('main-mode').addEventListener('change', (e) => {
    document.getElementById('deob-ui').classList.toggle('hide', e.target.value === 'obf');
    document.getElementById('obf-ui').classList.toggle('hide', e.target.value === 'deob');
});

window.onload = async () => {
    renderScripts(); 
    log("Backend connected.");
    const statusRes = await fetch('/api/status');
    const statusData = await statusRes.json();
    if (statusData.bot_online) log("discord bot has connected to the website Sucessfully!", true);
};
