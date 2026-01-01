window.switchPage = function(pageId) {
    document.querySelectorAll('.workspace').forEach(p => p.classList.add('hide'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.remove('hide');
    const target = Array.from(document.querySelectorAll('.menu-btn')).find(b => b.textContent.includes(pageId));
    if (target) target.classList.add('active');
    log(`Switched to ${pageId} view.`);
};

window.showSubmitModal = function() { document.getElementById('submit-modal').classList.remove('hide'); };
window.hideSubmitModal = function() { document.getElementById('submit-modal').classList.add('hide'); };
window.togglePassInput = function() { document.getElementById('pass-field').classList.toggle('hide'); };
window.togglePassView = function() {
    const el = document.getElementById('post-pass');
    const isPass = el.type === 'password';
    el.type = isPass ? 'text' : 'password';
    event.currentTarget.innerText = isPass ? 'hide' : 'show';
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
const mainMode = document.getElementById('main-mode');

mainMode.addEventListener('change', () => {
    document.getElementById('deob-settings').classList.toggle('hide', mainMode.value === 'obfuscator');
    document.getElementById('obf-settings').classList.toggle('hide', mainMode.value === 'deobfuscator');
});

function improvedDeob(code) {
    let c = code;
    c = c.replace(/local\s+\w+=string\.char;local\s+\w+=string\.byte;.*?loadstring\(\w+\)\(\)/gs, '-- [VM Header Stripped]');
    c = c.replace(/--\[\[.*?\]\]/gs, '');
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
        p += 2;
        barFill.style.width = p + '%';
        barVal.innerText = p + '%';
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

let communityDB = JSON.parse(localStorage.getItem('vault_scripts') || '[]');

function renderScripts() {
    const cList = document.getElementById('community-list');
    const pList = document.getElementById('private-list');
    cList.innerHTML = ''; pList.innerHTML = '';

    communityDB.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'script-card';
        card.innerHTML = `
            <div class="script-info">
                <h3>${s.title}</h3>
                <p>Path: /${s.id}</p>
            </div>
            <div style="display:flex;gap:10px;">
                <button class="action-btn" onclick="copyLink('${s.id}')">copy link</button>
                <button class="action-btn" onclick="openScript(${i})">view</button>
            </div>
        `;
        if (s.public) cList.appendChild(card); else pList.appendChild(card);
    });
}

window.copyLink = function(id) {
    const link = window.location.origin + window.location.pathname + "#" + id;
    navigator.clipboard.writeText(link);
    log("Link copied to clipboard.");
};

document.getElementById('btn-post-script').addEventListener('click', () => {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const isPublic = document.getElementById('post-public').value === 'yes';
    const pass = document.getElementById('post-pass').value;
    const id = title.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random()*999);
    
    if(!title || !content) return alert("Fill fields.");
    communityDB.push({ id, title, content, public: isPublic, pass: document.getElementById('use-pass').checked ? pass : null });
    localStorage.setItem('vault_scripts', JSON.stringify(communityDB));
    hideSubmitModal(); renderScripts();
    log("Script posted.");
});

window.openScript = function(index) {
    const s = communityDB[index];
    if (s.pass) { if (prompt("Enter password:") !== s.pass) return alert("Wrong."); }
    document.getElementById('viewer-title').innerText = s.title;
    document.getElementById('raw-code-display').innerText = s.content;
    document.getElementById('raw-viewer').classList.remove('hide');
};

window.closeViewer = function() { document.getElementById('raw-viewer').classList.add('hide'); };

window.onload = () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const found = communityDB.findIndex(s => s.id === hash);
        if (found !== -1) openScript(found);
    }
};

document.getElementById('trigger-deob').addEventListener('click', () => handleWork('deob'));
document.getElementById('trigger-obf').addEventListener('click', () => handleWork('obf'));
renderScripts();
