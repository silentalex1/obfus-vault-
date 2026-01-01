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
    return text
        .replace(/local|function|return|then|if|end|else|elseif|while|do|for|in|nil|true|false/g, '<span class="kwd">$&</span>')
        .replace(/".*?"|'.*?'/g, '<span class="str">$&</span>')
        .replace(/\b\d+\b/g, '<span class="num">$&</span>')
        .replace(/[+\-*\/=<>!]/g, '<span class="op">$&</span>');
};

window.updateMainSyntax = () => {
    document.getElementById('main-syntax-layer').innerHTML = highlighter(document.getElementById('main-editor').value);
};

window.updatePostSyntax = () => {
    document.getElementById('syntax-layer').innerHTML = highlighter(document.getElementById('post-content').value);
};

function log(t, s = false) {
    const div = document.createElement('div');
    div.className = s ? 'green' : '';
    div.innerHTML = `<span style="color:rgba(255,255,255,0.2);margin-right:8px;">[${new Date().toLocaleTimeString()}]</span> > ${t}`;
    const c = document.getElementById('console-output');
    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
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

function customObf(c, t) {
    if (t === 'vm') {
        let k = Math.floor(Math.random() * 255);
        let b = Array.from(c).map(x => x.charCodeAt(0) ^ k);
        return `local _K=${k};local _V={${b.join(',')}};local _S="";for i=1,#_V do _S=_S..string.char(_V[i]~_K) end;loadstring(_S)()`;
    }
    return `(function(){eval(atob("${btoa(c)}"))})();`;
}

async function handleWork(m) {
    const c = editor.value.trim();
    if (!c) return log("Error: Empty buffer.");
    loader.style.display = 'flex';
    let p = 0;
    const stages = m === 'deob' ? ["IDENTIFYING VM", "SOLVING CONSTANT POOL", "RECONSTRUCTING", "SUCCESS"] : ["VIRTUALIZING", "SHIFTING BYTES", "PACKING", "SUCCESS"];
    const t = setInterval(() => {
        p += 2; barFill.style.width = p + '%'; barVal.innerText = p + '%';
        barMsg.innerText = stages[Math.min(Math.floor((p/100)*stages.length), stages.length-1)];
        if (p >= 100) {
            clearInterval(t);
            editor.value = m === 'deob' ? customDeob(c) : customObf(c, document.getElementById('obf-mode').value);
            updateMainSyntax();
            setTimeout(() => { loader.style.display = 'none'; log(`${m.toUpperCase()} process completed.`, true); }, 400);
        }
    }, 15);
}

document.getElementById('btn-pull').addEventListener('click', async () => {
    let u = document.getElementById('pull-url').value.trim();
    if (!u) return log("Error: Invalid URL.");
    log("Connecting to remote source...");
    try {
        const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`);
        const data = await r.text();
        editor.value = data;
        updateMainSyntax();
        log("Retrieval success.", true);
    } catch(e) { log("Retrieval failed."); }
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
        div.innerHTML = `<div class="script-info"><h3>${s.title}</h3><p>By ${s.owner}</p></div><div style="display:flex;gap:10px;"><button class="action-btn" onclick="copyLink('${s.id}')">copy link</button><button class="action-btn" onclick="window.open('/s/${s.id}','_blank')">view</button></div>`;
        if (s.public === "yes") cl.appendChild(div);
        else if (s.owner === u) pl.appendChild(div);
    });
}

document.getElementById('btn-post-script').addEventListener('click', async () => {
    const t = document.getElementById('post-title').value;
    const c = document.getElementById('post-content').value;
    const p = document.getElementById('post-public').value;
    const o = document.getElementById('user-display').innerText;
    const pass = document.getElementById('post-pass').value;
    if (!t || !c) return;
    await fetch('/api/scripts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title: t, content: c, public: p, owner: o, pass: document.getElementById('use-pass').checked ? pass : null })
    });
    hideSubmitModal(); renderScripts();
    log("Server: Script data synchronized.", true);
});

window.copyLink = (id) => { navigator.clipboard.writeText(window.location.origin + "/s/" + id); log("Link copied to clipboard."); };

document.getElementById('run-deob').addEventListener('click', () => handleWork('deob'));
document.getElementById('run-obf').addEventListener('click', () => handleWork('obf'));
document.getElementById('main-mode').addEventListener('change', (e) => {
    document.getElementById('deob-ui').classList.toggle('hide', e.target.value === 'obf');
    document.getElementById('obf-ui').classList.toggle('hide', e.target.value === 'deob');
});

window.onload = () => { renderScripts(); log("Backend connected."); };
