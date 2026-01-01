const editor = document.getElementById('main-editor');
const loader = document.getElementById('work-loader');
const barFill = document.getElementById('load-fill');
const barVal = document.getElementById('load-val');
const barMsg = document.getElementById('loader-msg');
const consoleBox = document.getElementById('console-output');
const mainMode = document.getElementById('main-mode');
const deobGroup = document.getElementById('deob-settings');
const obfGroup = document.getElementById('obf-settings');

function switchPage(pageId) {
    document.querySelectorAll('.workspace').forEach(p => p.classList.add('hide'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.remove('hide');
    event.currentTarget.classList.add('active');
    log(`Switched to ${pageId} view.`);
}

function log(text, success = false) {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const div = document.createElement('div');
    div.className = success ? 'term-line green' : 'term-line';
    div.innerHTML = `<span class="time">[${time}]</span>> ${text}`;
    consoleBox.appendChild(div);
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

mainMode.addEventListener('change', () => {
    if (mainMode.value === 'obfuscator') {
        deobGroup.classList.add('hide');
        obfGroup.classList.remove('hide');
    } else {
        deobGroup.classList.remove('hide');
        obfGroup.classList.add('hide');
    }
});

function improvedDeob(code) {
    let c = code;
    c = c.replace(/local\s+\w+=string\.char;local\s+\w+=string\.byte;.*?loadstring\(\w+\)\(\)/gs, '-- [VM Removed]');
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
    c = c.replace(/\\(\d{1,3})/g, (_, n) => String.fromCharCode(parseInt(n)));
    return c.trim();
}

function improvedObf(code, type) {
    if (type === 'lua-vm') {
        let key = Math.floor(Math.random() * 255);
        let bytes = [];
        for (let i = 0; i < code.length; i++) bytes.push(code.charCodeAt(i) ^ key);
        return `local _K=${key};local _B={${bytes.join(',')}};local _D="";for i=1,#_B do _D=_D..string.char(_B[i]~_K) end;loadstring(_D)()`;
    } else {
        let b = btoa(code);
        return `(function(){eval(atob("${b}"))})();`;
    }
}

async function handleWork(mode) {
    const content = editor.value.trim();
    if (!content) return log("Error: No input found.");
    loader.style.display = 'flex';
    let p = 0;
    const stages = mode === 'deob' ? 
        ["FETCHING BYTES", "ANALYZING VM STRUCTURE", "STRIPPING DEEP JUNK", "DECRYPTING LAYERS", "SUCCESS"] :
        ["BUILDING CUSTOM VM", "XOR ENCRYPTION", "VIRTUALIZING OPS", "PACKING", "SUCCESS"];

    const task = setInterval(() => {
        p += 2;
        barFill.style.width = p + '%';
        barVal.innerText = p + '%';
        let idx = Math.min(Math.floor((p / 100) * stages.length), stages.length - 1);
        barMsg.innerText = stages[idx];
        if (p >= 100) {
            clearInterval(task);
            editor.value = mode === 'deob' ? improvedDeob(content) : improvedObf(content, document.getElementById('obf-mode').value);
            setTimeout(() => {
                loader.style.display = 'none';
                log(`${mode} process finished.`, true);
            }, 300);
        }
    }, 20);
}

document.getElementById('btn-pull').addEventListener('click', async () => {
    let url = document.getElementById('pull-url').value.trim();
    if (!url) return log("Error: Empty URL.");
    log("Requesting script data...");
    try {
        const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxy);
        const text = await res.text();
        editor.value = text;
        log("Data pulled from source.", true);
    } catch (e) { log("Pull failed. Resource blocked."); }
});

const submitModal = document.getElementById('submit-modal');
function showSubmitModal() { submitModal.classList.remove('hide'); }
function hideSubmitModal() { submitModal.classList.add('hide'); }

function togglePassInput() {
    document.getElementById('pass-field').classList.toggle('hide');
}

function togglePassView() {
    const el = document.getElementById('post-pass');
    const isPass = el.type === 'password';
    el.type = isPass ? 'text' : 'password';
    event.currentTarget.innerText = isPass ? 'hide' : 'show';
}

let communityDB = JSON.parse(localStorage.getItem('vault_scripts') || '[]');
function renderScripts() {
    const area = document.getElementById('script-display-area');
    area.innerHTML = '';
    communityDB.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'script-card';
        card.title = "Name: " + s.title;
        card.innerHTML = `
            <div class="script-info">
                <h3>${s.title}</h3>
                <p>Link: /${s.title.toLowerCase().replace(/\s+/g, '-')}</p>
            </div>
            <button class="action-btn" onclick="openScript(${i})">view script</button>
        `;
        area.appendChild(card);
    });
}

document.getElementById('btn-post-script').addEventListener('click', () => {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const pass = document.getElementById('post-pass').value;
    const usePass = document.getElementById('use-pass').checked;

    if (!title || !content) return alert("Fill all fields.");

    communityDB.push({ title, content, pass: usePass ? pass : null });
    localStorage.setItem('vault_scripts', JSON.stringify(communityDB));
    hideSubmitModal();
    renderScripts();
    log("Script posted to community.", true);
});

function openScript(index) {
    const s = communityDB[index];
    if (s.pass) {
        const p = prompt("Enter password to view this script:");
        if (p !== s.pass) return alert("Wrong password.");
    }
    const viewer = document.getElementById('raw-viewer');
    document.getElementById('viewer-title').innerText = s.title;
    document.getElementById('raw-code-display').innerText = s.content;
    viewer.classList.remove('hide');
}

function closeViewer() { document.getElementById('raw-viewer').classList.add('hide'); }

document.getElementById('trigger-deob').addEventListener('click', () => handleWork('deob'));
document.getElementById('trigger-obf').addEventListener('click', () => handleWork('obf'));
renderScripts();
log("Console ready.");
