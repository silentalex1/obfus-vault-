window.switchPage = (id) => {
    document.querySelectorAll('.workspace').forEach(p => p.classList.add('hide'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + id).classList.remove('hide');
    const target = Array.from(document.querySelectorAll('.menu-btn')).find(b => b.textContent.includes(id));
    if (target) target.classList.add('active');
    log(`Switched to ${id}`);
};

window.clearConsole = () => {
    document.getElementById('console-output').innerHTML = '';
    log("Console cleared.");
};

window.showSubmitModal = () => document.getElementById('submit-modal').classList.remove('hide');
window.hideSubmitModal = () => document.getElementById('submit-modal').classList.add('hide');
window.togglePassInput = () => document.getElementById('pass-field').classList.toggle('hide');

window.updateSyntax = () => {
    const text = document.getElementById('post-content').value;
    const layer = document.getElementById('syntax-layer');
    layer.innerHTML = text.replace(/local|function|return|then|if|end|else|elseif/g, '<span style="color:#3b82f6;font-weight:700;">$&</span>');
};

function log(t, s = false) {
    const div = document.createElement('div');
    div.className = s ? 'green' : '';
    div.innerHTML = `<span>[${new Date().toLocaleTimeString()}]</span> > ${t}`;
    const c = document.getElementById('console-output');
    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
}

const editor = document.getElementById('main-editor');
const loader = document.getElementById('work-loader');
const barFill = document.getElementById('load-fill');
const barVal = document.getElementById('load-val');
const barMsg = document.getElementById('loader-msg');

async function handleWork(m) {
    const c = editor.value.trim();
    if (!c) return;
    loader.style.display = 'flex';
    let p = 0;
    const stages = ["ANALYZING", "DECRYPTING", "CLEANING", "SUCCESS"];
    const t = setInterval(() => {
        p += 2; barFill.style.width = p + '%'; barVal.innerText = p + '%';
        barMsg.innerText = stages[Math.min(Math.floor((p/100)*stages.length), stages.length-1)];
        if (p >= 100) {
            clearInterval(t);
            editor.value = m === 'deob' ? c.replace(/string\.char/g, '"unpacked"') : `loadstring("${btoa(c)}")()`;
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
    } catch(e) { log("Pull Failed"); }
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
        div.innerHTML = `<div><h3>${s.title}</h3><p>By ${s.owner}</p></div>
        <div style="display:flex;gap:10px;"><button class="action-btn" onclick="copyLink('${s.id}')">copy link</button>
        <button class="action-btn" onclick="window.open('/s/${s.id}','_blank')">view</button></div>`;
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
    log("Script posted", true);
});

window.copyLink = (id) => { navigator.clipboard.writeText(window.location.origin + "/s/" + id); log("Link copied"); };

document.getElementById('run-deob').addEventListener('click', () => handleWork('deob'));
document.getElementById('run-obf').addEventListener('click', () => handleWork('obf'));
document.getElementById('main-mode').addEventListener('change', (e) => {
    document.getElementById('deob-ui').classList.toggle('hide', e.target.value === 'obf');
    document.getElementById('obf-ui').classList.toggle('hide', e.target.value === 'deob');
});

window.onload = () => { renderScripts(); log("Connected to backend."); };
