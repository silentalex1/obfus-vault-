window.switchPage = function(pageId) {
    document.querySelectorAll('.workspace').forEach(p => p.classList.add('hide'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.remove('hide');
    const target = Array.from(document.querySelectorAll('.menu-btn')).find(b => b.textContent.includes(pageId));
    if (target) target.classList.add('active');
    log(`Switched to ${pageId} view.`);
};

window.clearConsole = function() {
    document.getElementById('console-output').innerHTML = '';
    log("Console cleared.");
};

window.showSubmitModal = function() { document.getElementById('submit-modal').classList.remove('hide'); };
window.hideSubmitModal = function() { document.getElementById('submit-modal').classList.add('hide'); };
window.togglePassInput = function() { document.getElementById('pass-field').classList.toggle('hide'); };

window.togglePassView = function() {
    const el = document.getElementById('post-pass');
    el.type = el.type === 'password' ? 'text' : 'password';
    event.currentTarget.innerText = el.type === 'password' ? 'show' : 'hide';
};

window.updateSyntax = function() {
    const text = document.getElementById('post-content').value;
    const layer = document.getElementById('syntax-layer');
    layer.innerHTML = text
        .replace(/local|function|return|then|if|end|else|elseif|while|do|getgenv|getfenv/g, '<span class="kwd">$&</span>')
        .replace(/".*?"|'.*?'/g, '<span class="str">$&</span>')
        .replace(/\b\d+\b/g, '<span class="num">$&</span>');
};

function log(text, success = false) {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const div = document.createElement('div');
    div.className = success ? 'term-line green' : 'term-line';
    div.innerHTML = `<span class="time">[${time}]</span>> ${text}`;
    const cb = document.getElementById('console-output');
    cb.appendChild(div);
    cb.scrollTop = cb.scrollHeight;
}

const editor = document.getElementById('main-editor');
const loader = document.getElementById('work-loader');
const barFill = document.getElementById('load-fill');
const barVal = document.getElementById('load-val');
const barMsg = document.getElementById('loader-msg');

async function checkStatus() {
    const user = document.getElementById('user-display').innerText;
    const res = await fetch(`/api/user/status/${user}`);
    const data = await res.json();
    if (data.blacklisted) {
        document.getElementById('blacklist-screen').classList.remove('hide');
    }
    document.getElementById('user-tier').innerText = data.status.charAt(0).toUpperCase() + data.status.slice(1);
}

function improvedDeob(code) {
    let c = code;
    c = c.replace(/local\s+\w+=string\.char;.*?loadstring\(\w+\)\(\)/gs, '');
    c = c.replace(/string\.char\(([\d,\s]+)\)/g, (_, n) => {
        try { return `"${String.fromCharCode(...n.split(',').map(x => parseInt(x.trim())))}"`; } catch { return _; }
    });
    c = c.replace(/bit32\.bxor\(([\d\w\s,]+)\)/g, (_, args) => {
        try { const p = args.split(',').map(x => parseInt(x.trim())); return (p[0] ^ p[1]).toString(); } catch { return _; }
    });
    c = c.replace(/atob\(['"](.*?)['"]\)/g, (_, b) => {
        try { return `"${atob(b)}"`; } catch { return _; }
    });
    return c.trim();
}

function improvedObf(code, type) {
    if (type === 'lua-vm') {
        let key = Math.floor(Math.random() * 255);
        let bytes = Array.from(code).map(c => c.charCodeAt(0) ^ key);
        return `local _K=${key};local _B={${bytes.join(',')}};local _D="";for i=1,#_B do _D=_D..string.char(_B[i]~_K) end;loadstring(_D)()`;
    } else {
        return `(function(){eval(atob("${btoa(code)}"))})();`;
    }
}

async function handleWork(mode) {
    const content = editor.value.trim();
    if (!content) return log("Error: Editor empty.");
    loader.style.display = 'flex';
    let p = 0;
    const stages = mode === 'deob' ? ["STRIPPING VM", "SOLVING CONSTANTS", "CLEANING BYTES", "SUCCESS"] : ["INIT VM", "ENCRYPTING", "PACKING", "SUCCESS"];
    const task = setInterval(() => {
        p += 2; barFill.style.width = p + '%'; barVal.innerText = p + '%';
        barMsg.innerText = stages[Math.min(Math.floor((p/100)*stages.length), stages.length-1)];
        if (p >= 100) {
            clearInterval(task);
            editor.value = mode === 'deob' ? improvedDeob(content) : improvedObf(content, document.getElementById('obf-mode').value);
            setTimeout(() => { loader.style.display = 'none'; log(`${mode} finished.`, true); }, 300);
        }
    }, 15);
}

document.getElementById('btn-pull').addEventListener('click', async () => {
    let url = document.getElementById('pull-url').value.trim();
    if (!url) return log("Error: No URL.");
    log("Pulling code...");
    try {
        const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxy);
        editor.value = await res.text();
        log("Code Pulled.", true);
    } catch (e) { log("Pull Failed."); }
});

async function renderScripts() {
    const cList = document.getElementById('community-list');
    const pList = document.getElementById('private-list');
    const user = document.getElementById('user-display').innerText;
    cList.innerHTML = ''; pList.innerHTML = '';
    const res = await fetch('/api/scripts');
    const scripts = await res.json();
    scripts.forEach((s) => {
        const card = document.createElement('div');
        card.className = 'script-card';
        card.innerHTML = `<div class="script-info"><h3>${s.title}</h3><p>By ${s.owner}</p></div><div style="display:flex;gap:10px;"><button class="action-btn" onclick="copyLink('${s.id}')">copy link</button><button class="action-btn" onclick="openScriptFromServer('${s.id}')">view</button></div>`;
        if (s.public === "yes") cList.appendChild(card);
        else if (s.owner === user) pList.appendChild(card);
    });
}

document.getElementById('btn-post-script').addEventListener('click', async () => {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const isPublic = document.getElementById('post-public').value;
    const owner = document.getElementById('user-display').innerText;
    const pass = document.getElementById('post-pass').value;
    if(!title || !content) return;
    await fetch('/api/scripts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title, content, public: isPublic, owner, pass: document.getElementById('use-pass').checked ? pass : null })
    });
    hideSubmitModal(); renderScripts();
    log("Script posted.");
});

window.copyLink = (id) => { navigator.clipboard.writeText(window.location.origin + "/s/" + id); log("Link copied."); };
window.openScriptFromServer = (id) => { window.open('/s/' + id, '_blank'); };
document.getElementById('trigger-deob').addEventListener('click', () => handleWork('deob'));
document.getElementById('trigger-obf').addEventListener('click', () => handleWork('obf'));
checkStatus(); renderScripts();
