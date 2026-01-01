window.switchPage = (id) => {
    document.querySelectorAll('.workspace').forEach(p => p.classList.add('hide'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + id).classList.remove('hide');
    log(`Switched to ${id}`);
};

window.clearConsole = () => {
    document.getElementById('console-output').innerHTML = '';
    log("Cleared");
};

window.showSubmitModal = () => document.getElementById('submit-modal').classList.remove('hide');
window.hideSubmitModal = () => document.getElementById('submit-modal').classList.add('hide');
window.togglePassInput = () => document.getElementById('pass-field').classList.toggle('hide');

window.updateSyntax = () => {
    const text = document.getElementById('post-content').value;
    const layer = document.getElementById('syntax-layer');
    layer.innerHTML = text
        .replace(/local|function|return|then|if|end|else|elseif|while|do/g, '<span class="kwd">$&</span>')
        .replace(/".*?"|'.*?'/g, '<span class="str">$&</span>')
        .replace(/\b\d+\b/g, '<span class="num">$&</span>');
};

function log(t, s = false) {
    const div = document.createElement('div');
    div.className = s ? 'term-line green' : 'term-line';
    div.innerHTML = `<span>[${new Date().toLocaleTimeString()}]</span>> ${t}`;
    const c = document.getElementById('console-output');
    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
}

const editor = document.getElementById('main-editor');
const loader = document.getElementById('work-loader');
const barFill = document.getElementById('load-fill');
const barVal = document.getElementById('load-val');
const barMsg = document.getElementById('loader-msg');

async function checkStatus() {
    const u = document.getElementById('user-display').innerText;
    try {
        const r = await fetch(`/api/user/status/${u}`);
        const d = await r.json();
        if (d.blacklisted) {
            document.getElementById('blacklist-screen').classList.remove('hide');
            document.querySelector('.layout-wrapper').classList.add('hide');
        }
        document.getElementById('user-tier').innerText = d.status;
    } catch(e) {}
}

function runDeob(c) {
    let r = c;
    r = r.replace(/string\.char\(([\d,\s]+)\)/g, (_, n) => {
        try { return `"${String.fromCharCode(...n.split(',').map(x => parseInt(x.trim())))}"`; } catch { return _; }
    });
    r = r.replace(/bit32\.bxor\(([\d\w\s,]+)\)/g, (_, a) => {
        const p = a.split(',').map(x => parseInt(x.trim())); return (p[0] ^ p[1]).toString();
    });
    return r.trim();
}

async function handleWork(m) {
    const c = editor.value.trim();
    if (!c) return;
    loader.style.display = 'flex';
    let p = 0;
    const stages = m === 'deob' ? ["STRIPPING VM", "SOLVING CONSTANTS", "SUCCESS"] : ["INIT VM", "ENCRYPTING", "SUCCESS"];
    const t = setInterval(() => {
        p += 2; barFill.style.width = p + '%'; barVal.innerText = p + '%';
        barMsg.innerText = stages[Math.min(Math.floor((p/100)*stages.length), stages.length-1)];
        if (p >= 100) {
            clearInterval(t);
            editor.value = m === 'deob' ? runDeob(c) : `loadstring("${btoa(c)}")()`;
            setTimeout(() => { loader.style.display = 'none'; log(`${m} finished`, true); }, 300);
        }
    }, 15);
}

document.getElementById('btn-pull').addEventListener('click', async () => {
    let u = document.getElementById('pull-url').value.trim();
    log("Pulling...");
    try {
        const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`);
        editor.value = await r.text();
        log("Pulled", true);
    } catch(e) { log("Failed"); }
});

async function renderScripts() {
    const cl = document.getElementById('community-list');
    const pl = document.getElementById('private-list');
    const u = document.getElementById('user-display').innerText;
    cl.innerHTML = ''; pl.innerHTML = '';
    const r = await fetch('/api/scripts');
    const scripts = await r.json();
    scripts.forEach(s => {
        const div = document.createElement('div');
        div.className = 'script-card';
        div.innerHTML = `<div><h3>${s.title}</h3><p>By ${s.owner}</p></div><button class="action-btn" onclick="window.open('/s/${s.id}','_blank')">view</button>`;
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
    await fetch('/api/scripts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title: t, content: c, public: p, owner: o })
    });
    hideSubmitModal(); renderScripts();
});

document.getElementById('trigger-deob').addEventListener('click', () => handleWork('deob'));
document.getElementById('trigger-obf').addEventListener('click', () => handleWork('obf'));
document.getElementById('main-mode').addEventListener('change', (e) => {
    document.getElementById('deob-settings').classList.toggle('hide', e.target.value === 'obfuscator');
    document.getElementById('obf-settings').classList.toggle('hide', e.target.value === 'deobfuscator');
});

window.onload = () => { checkStatus(); renderScripts(); };
