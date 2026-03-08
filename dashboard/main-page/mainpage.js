const token = localStorage.getItem('ov_token');
const currentUser = localStorage.getItem('ov_user');

if (!token) {
    window.location.href = '/dashboard/';
}

const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
});

window.switchPage = (id) => {
    document.querySelectorAll('.workspace').forEach(p => p.classList.add('hide'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + id).classList.remove('hide');
    const target = Array.from(document.querySelectorAll('.menu-btn')).find(b => b.textContent.includes(id));
    if (target) target.classList.add('active');
    log('Switched to ' + id + ' view.');
};

window.clearConsole = () => {
    document.getElementById('console-output').innerHTML = '';
    log('Console terminal cleared.', true);
};

window.showSubmitModal = () => document.getElementById('submit-modal').classList.remove('hide');
window.hideSubmitModal = () => document.getElementById('submit-modal').classList.add('hide');
window.togglePassInput = () => document.getElementById('pass-field').classList.toggle('hide');

const highlighter = (text) => {
    return text
        .replace(/\b(local|function|return|then|if|end|else|elseif|while|do|for|in|nil|true|false|not|and|or|repeat|until|break)\b/g, '<span class="kwd">$&</span>')
        .replace(/".*?"|'.*?'/g, '<span class="str">$&</span>')
        .replace(/\b\d+\b/g, '<span class="num">$&</span>');
};

window.updateMainSyntax = () => {
    const el = document.getElementById('main-syntax-layer');
    if (el) el.innerHTML = highlighter(document.getElementById('main-editor').value);
};

function log(t, s = false) {
    const div = document.createElement('div');
    div.className = s ? 'green' : '';
    div.innerHTML = '<span style="color:rgba(255,255,255,0.1);margin-right:8px;">[' + new Date().toLocaleTimeString() + ']</span> > ' + t;
    const c = document.getElementById('console-output');
    if (c) { c.appendChild(div); c.scrollTop = c.scrollHeight; }
}

function ovLCG(seed) {
    let s = seed % 2147483648;
    let c = 1;
    return function(lo, hi) {
        const a = 1664525, b = 1013904223, m = 99999999;
        const v = (a * s + b) % m + c;
        c++;
        s = v;
        return lo + (v % (hi - lo + 1));
    };
}

function ovHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h * 0x01000193) >>> 0;
    }
    return h;
}

function ovRC4(data, key) {
    const S = Array.from({length: 256}, (_, i) => i);
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + S[i] + key.charCodeAt(i % key.length)) & 0xFF;
        [S[i], S[j]] = [S[j], S[i]];
    }
    let x = 0, y = 0;
    const out = [];
    for (let i = 0; i < data.length; i++) {
        x = (x + 1) & 0xFF;
        y = (y + S[x]) & 0xFF;
        [S[x], S[y]] = [S[y], S[x]];
        out.push(data.charCodeAt(i) ^ S[(S[x] + S[y]) & 0xFF]);
    }
    return out;
}

function ovB64Enc(bytes) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '', i = 0;
    while (i < bytes.length) {
        const a = bytes[i++], b = bytes[i++] ?? 0, c = bytes[i++] ?? 0;
        out += chars[a >> 2] + chars[((a & 3) << 4) | (b >> 4)] +
               (i - 1 < bytes.length || arguments[1] ? chars[((b & 0xf) << 2) | (c >> 6)] : '=') +
               (i < bytes.length || arguments[1] ? chars[c & 0x3f] : '=');
    }
    return out;
}

function ovB64Dec(s) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lut = {};
    for (let i = 0; i < 64; i++) lut[chars[i]] = i;
    const out = [];
    for (let i = 0; i < s.length; i += 4) {
        const a = lut[s[i]], b = lut[s[i+1]], c = lut[s[i+2]], d = lut[s[i+3]];
        out.push((a << 2) | (b >> 4));
        if (s[i+2] !== '=') out.push(((b & 0xf) << 4) | (c >> 2));
        if (s[i+3] !== '=') out.push(((c & 0x3) << 6) | d);
    }
    return out;
}

function ovGenKey(len) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

function ovGenName(rng, prefix) {
    const consonants = 'bcdfghjklmnprstvwxz';
    const vowels = 'aeiou';
    let n = prefix || '_';
    const len = rng(4, 9);
    for (let i = 0; i < len; i++) {
        n += i % 2 === 0 ? consonants[rng(0, consonants.length - 1)] : vowels[rng(0, vowels.length - 1)];
    }
    return n;
}

function ovTokenize(code) {
    const tokens = [];
    const patterns = [
        { type: 'comment_long', re: /^--\[\[[\s\S]*?\]\]/  },
        { type: 'comment', re: /^--[^\n]*/ },
        { type: 'string_long', re: /^\[\[[\s\S]*?\]\]/ },
        { type: 'string', re: /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/ },
        { type: 'number', re: /^0x[0-9a-fA-F]+|^\d+\.?\d*(?:[eE][+-]?\d+)?/ },
        { type: 'keyword', re: /^(?:and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/ },
        { type: 'name', re: /^[_a-zA-Z][_a-zA-Z0-9]*/ },
        { type: 'op', re: /^(?:\.\.\.|\.\.|[+\-*\/%^#&|~<>=]=?|[(){}\[\];:,\.])/ },
        { type: 'ws', re: /^\s+/ },
    ];
    let i = 0;
    while (i < code.length) {
        let matched = false;
        for (const { type, re } of patterns) {
            const m = code.slice(i).match(re);
            if (m) {
                tokens.push({ type, val: m[0] });
                i += m[0].length;
                matched = true;
                break;
            }
        }
        if (!matched) { tokens.push({ type: 'unknown', val: code[i] }); i++; }
    }
    return tokens;
}

function ovObfuscate(src) {
    const seed = Date.now() & 0xFFFFFFFF;
    const rng = ovLCG(seed);
    const key = ovGenKey(16);

    const KEYWORDS = new Set(['and','break','do','else','elseif','end','false','for','function',
        'goto','if','in','local','nil','not','or','repeat','return','then','true','until','while',
        'print','pairs','ipairs','next','select','type','tostring','tonumber','rawget','rawset',
        'setmetatable','getmetatable','pcall','xpcall','error','assert','load','loadstring',
        'require','math','string','table','os','io','game','workspace','script','task',
        'wait','spawn','coroutine','Instance','Vector3','CFrame','Color3','UDim2',
        'UDim','Enum','Players','RunService','Heartbeat','UserSettings']);

    const tokens = ovTokenize(src);

    const names = {};
    const namePool = {};
    let nameCounter = 0;

    for (const tok of tokens) {
        if (tok.type === 'name' && !KEYWORDS.has(tok.val)) {
            if (!names[tok.val]) {
                names[tok.val] = ovGenName(rng, '_OV' + (nameCounter++).toString(36) + '_');
            }
        }
    }

    const strings = [];
    let tokenized = tokens.map(tok => {
        if (tok.type === 'comment' || tok.type === 'comment_long') return '';
        if (tok.type === 'string' || tok.type === 'string_long') {
            const inner = tok.val.slice(tok.type === 'string_long' ? 2 : 1, tok.type === 'string_long' ? -2 : -1);
            const bytes = [];
            for (let i = 0; i < inner.length; i++) bytes.push(inner.charCodeAt(i));
            const idx = strings.length;
            strings.push(bytes);
            return '__OVS[' + idx + ']';
        }
        if (tok.type === 'name' && !KEYWORDS.has(tok.val) && names[tok.val]) {
            return names[tok.val];
        }
        return tok.val;
    }).join('');

    const numVars = 6 + rng(0, 4);
    const varNames = Array.from({length: numVars}, (_, i) => ovGenName(rng, '_OVV' + i + '_'));

    const encStrings = strings.map(bytes => {
        const xored = ovRC4(String.fromCharCode(...bytes), key);
        return ovB64Enc(xored);
    });

    const lcgA = 1664525, lcgB = 1013904223;
    const prngSeed = rng(100000, 999999);
    const prngMod = 99999999;

    const vmName = ovGenName(rng, '_OVM_');
    const decName = ovGenName(rng, '_OVD_');
    const strTblName = '__OVS';
    const keyName = ovGenName(rng, '_OVK_');
    const b64Name = ovGenName(rng, '_OVB_');
    const rc4Name = ovGenName(rng, '_OVR_');
    const lutName = ovGenName(rng, '_OVL_');

    const junkVarA = varNames[0], junkVarB = varNames[1], junkVarC = varNames[2];
    const junkA = rng(1000, 99999), junkB = rng(1000, 99999), junkC = rng(1000, 99999);

    const strTableSrc = '{' + encStrings.map(s => '"' + s + '"').join(',') + '}';

    const header = `local ${junkVarA}=${junkA}
local ${junkVarB}=${junkB}
local ${junkVarC}=${junkC+junkA}
local ${keyName}="${key}"
local ${b64Name}="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local ${lutName}={}
for ${varNames[3]}=1,64 do ${lutName}[${b64Name}:sub(${varNames[3]},${varNames[3]})]=${varNames[3]}-1 end
local ${rc4Name}=function(${varNames[4]},${varNames[5]})
local S={}
for i=0,255 do S[i]=i end
local j=0
for i=0,255 do
j=(j+S[i]+${varNames[5]}:byte(i%#${varNames[5]}+1))%256
S[i],S[j]=S[j],S[i]
end
local x,y,r=0,0,{}
for i=1,#${varNames[4]} do
x=(x+1)%256
y=(y+S[x])%256
S[x],S[y]=S[y],S[x]
r[i]=string.char(${varNames[4]}:byte(i)~S[(S[x]+S[y])%256])
end
return table.concat(r)
end
local ${decName}=function(${varNames[3]})
local b,out=${varNames[3]},{}
local i=1
while i<=#b do
local a,c,d=${lutName}[b:sub(i,i)],${lutName}[b:sub(i+1,i+1)],${lutName}[b:sub(i+2,i+2)]
local e=${lutName}[b:sub(i+3,i+3)]
out[#out+1]=string.char((a<<2)|(c>>4))
if b:sub(i+2,i+2)~="=" then out[#out+1]=string.char(((c&15)<<4)|(d>>2)) end
if b:sub(i+3,i+3)~="=" then out[#out+1]=string.char(((d&3)<<6)|e) end
i=i+4
end
return ${rc4Name}(table.concat(out),${keyName})
end
local ${strTblName}={}
local ${vmName}=${strTableSrc}
for ${varNames[3]}=0,#${vmName}-1 do ${strTblName}[${varNames[3]}]=${decName}(${vmName}[${varNames[3]}+1]) end
`;

    const footer = '\n';

    return header + tokenized + footer;
}

function ovDeobfuscate(src) {
    let r = src;
    r = r.replace(/string\.char\(([\d,\s]+)\)/g, (_, n) => {
        try {
            const chars = n.split(',').map(x => parseInt(x.trim()));
            return '"' + String.fromCharCode(...chars) + '"';
        } catch { return _; }
    });
    r = r.replace(/\bbit32\.bxor\((\d+),\s*(\d+)\)/g, (_, a, b) => String(parseInt(a) ^ parseInt(b)));
    r = r.replace(/\bbit32\.band\((\d+),\s*(\d+)\)/g, (_, a, b) => String(parseInt(a) & parseInt(b)));
    r = r.replace(/\bbit32\.bor\((\d+),\s*(\d+)\)/g, (_, a, b) => String(parseInt(a) | parseInt(b)));
    r = r.replace(/\bbit32\.bnot\((\d+)\)/g, (_, a) => String(~parseInt(a) >>> 0));
    r = r.replace(/\bbit32\.lshift\((\d+),\s*(\d+)\)/g, (_, a, b) => String(parseInt(a) << parseInt(b)));
    r = r.replace(/\bbit32\.rshift\((\d+),\s*(\d+)\)/g, (_, a, b) => String(parseInt(a) >>> parseInt(b)));
    r = r.replace(/\bmath\.floor\((\d+(?:\.\d+)?)\)/g, (_, n) => String(Math.floor(parseFloat(n))));
    r = r.replace(/\btostring\((\d+)\)/g, (_, n) => '"' + n + '"');
    r = r.replace(/\(\s*(\d+)\s*\+\s*(\d+)\s*\)/g, (_, a, b) => String(parseInt(a) + parseInt(b)));
    r = r.replace(/\(\s*(\d+)\s*\*\s*(\d+)\s*\)/g, (_, a, b) => String(parseInt(a) * parseInt(b)));
    r = r.replace(/\(\s*(\d+)\s*%\s*(\d+)\s*\)/g, (_, a, b) => String(parseInt(a) % parseInt(b)));
    r = r.replace(/--\[\[[\s\S]*?\]\]/g, '');
    r = r.replace(/--[^\n]*/g, '');
    r = r.replace(/\n{3,}/g, '\n\n');
    r = r.replace(/local\s+[_a-zA-Z][_a-zA-Z0-9]*\s*=\s*\d+\n(?=local\s+[_a-zA-Z][_a-zA-Z0-9]*\s*=\s*\d+\n)/g, '');
    return r.trim();
}

async function handleWork(m) {
    const c = document.getElementById('main-editor').value.trim();
    if (!c) return log('Error: Empty buffer.');
    const loader = document.getElementById('work-loader');
    loader.style.display = 'flex';

    const stages = m === 'deob'
        ? ['SCANNING TOKENS', 'RESOLVING CONSTANTS', 'REBUILDING AST', 'CLEANING']
        : ['TOKENIZING SOURCE', 'ENCRYPTING STRINGS', 'INJECTING VM', 'FINALIZING'];

    let p = 0;
    const t = setInterval(() => {
        p += 1.4;
        const clamped = Math.min(p, 99);
        document.getElementById('load-fill').style.width = clamped + '%';
        document.getElementById('load-val').innerText = Math.floor(clamped) + '%';
        document.getElementById('loader-msg').innerText = stages[Math.min(Math.floor((clamped / 100) * stages.length), stages.length - 1)];
        if (p >= 100) {
            clearInterval(t);
            try {
                document.getElementById('main-editor').value = m === 'deob' ? ovDeobfuscate(c) : ovObfuscate(c);
            } catch(e) {
                log('Engine error: ' + e.message);
            }
            updateMainSyntax();
            document.getElementById('load-fill').style.width = '100%';
            document.getElementById('load-val').innerText = '100%';
            setTimeout(() => { loader.style.display = 'none'; log(m.toUpperCase() + ' complete.', true); }, 300);
        }
    }, 14);
}
const pullBtn = document.getElementById('btn-pull');
if (pullBtn) {
    pullBtn.addEventListener('click', async () => {
        const u = document.getElementById('pull-url').value.trim();
        if (!u) return log('Error: No URL provided.');
        log('Pulling code...');
        try {
            const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(u));
            const d = await r.text();
            document.getElementById('main-editor').value = d;
            updateMainSyntax();
            log('Retrieved successfully.', true);
        } catch { log('Retrieval failed.'); }
    });
}

async function renderScripts() {
    const cl = document.getElementById('community-list');
    const pl = document.getElementById('private-list');
    if (!cl || !pl) return;
    cl.innerHTML = '<div style="color:#555;font-size:13px;padding:20px;">Loading...</div>';
    pl.innerHTML = '<div style="color:#555;font-size:13px;padding:20px;">Loading...</div>';

    try {
        const r = await fetch('/api/scripts');
        if (!r.ok) throw new Error('API error ' + r.status);
        const data = await r.json();

        cl.innerHTML = '';
        pl.innerHTML = '';

        const communityScripts = data.filter(s => s.public === 'yes');
        const myScripts = data.filter(s => s.owner === currentUser);

        if (communityScripts.length === 0) {
            cl.innerHTML = '<div style="color:#555;font-size:13px;padding:20px;">No community scripts yet.</div>';
        }
        if (myScripts.length === 0) {
            pl.innerHTML = '<div style="color:#555;font-size:13px;padding:20px;">You haven\'t posted any scripts.</div>';
        }

        communityScripts.forEach(s => {
            const div = document.createElement('div');
            div.className = 'script-card';
            div.innerHTML = '<div><h3>' + s.title + '</h3><p>By ' + s.owner + '</p></div><div style="display:flex;gap:10px;"><button class="action-btn" onclick="copyLink(\'' + s.id + '\')">copy link</button><button class="action-btn" onclick="window.open(\'/s/' + s.id + '\',\'_blank\')">view</button></div>';
            cl.appendChild(div);
        });

        myScripts.forEach(s => {
            const div = document.createElement('div');
            div.className = 'script-card';
            div.innerHTML = '<div><h3>' + s.title + '</h3><p>' + (s.public === 'yes' ? 'Public' : 'Private') + '</p></div><div style="display:flex;gap:10px;"><button class="action-btn" onclick="copyLink(\'' + s.id + '\')">copy link</button><button class="action-btn" onclick="window.open(\'/s/' + s.id + '\',\'_blank\')">view</button><button class="action-btn" style="color:#ff4444;" onclick="deleteScript(\'' + s.id + '\')">delete</button></div>';
            pl.appendChild(div);
        });
    } catch (e) {
        cl.innerHTML = '<div style="color:#ff4444;font-size:13px;padding:20px;">Failed to load scripts.</div>';
        pl.innerHTML = '';
        log('Error loading scripts: ' + e.message);
    }
}

window.deleteScript = async (id) => {
    if (!confirm('Delete this script?')) return;
    try {
        const res = await fetch('/api/scripts/' + id, {
            method: 'DELETE',
            headers: authHeaders()
        });
        if (res.ok) { renderScripts(); log('Script deleted.', true); }
        else log('Delete failed.');
    } catch { log('Delete error.'); }
};

const postBtn = document.getElementById('btn-post-script');
if (postBtn) {
    postBtn.addEventListener('click', async () => {
        const t = document.getElementById('post-title').value.trim();
        const c = document.getElementById('post-content').value.trim();
        const p = document.getElementById('post-public').value;
        const usePass = document.getElementById('use-pass') && document.getElementById('use-pass').checked;
        const pass = usePass ? (document.getElementById('post-pass') ? document.getElementById('post-pass').value.trim() : null) : null;
        if (!t || !c) return log('Error: Title and content required.');
        try {
            const body = { title: t, content: c, public: p };
            if (pass) body.pass = pass;
            const res = await fetch('/api/scripts', {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                hideSubmitModal();
                renderScripts();
                log('Script posted successfully.', true);
                document.getElementById('post-title').value = '';
                document.getElementById('post-content').value = '';
                if (document.getElementById('use-pass')) document.getElementById('use-pass').checked = false;
                if (document.getElementById('pass-field')) document.getElementById('pass-field').classList.add('hide');
            } else {
                log('Post failed: ' + (data.error || 'Unknown error'));
            }
        } catch { log('Post error.'); }
    });
}

window.copyLink = (id) => {
    navigator.clipboard.writeText(window.location.origin + '/s/' + id);
    log('Link copied.', true);
};

window.logout = () => {
    localStorage.removeItem('ov_token');
    localStorage.removeItem('ov_user');
    window.location.href = '/dashboard/';
};

const deobBtn = document.getElementById('run-deob');
const obfBtn = document.getElementById('run-obf');
const modeSelect = document.getElementById('main-mode');
const userDisplay = document.getElementById('user-display');

if (userDisplay) userDisplay.innerText = currentUser || 'Guest';
if (deobBtn) deobBtn.addEventListener('click', () => handleWork('deob'));
if (obfBtn) obfBtn.addEventListener('click', () => handleWork('obf'));
if (modeSelect) {
    modeSelect.addEventListener('change', (e) => {
        const deobUi = document.getElementById('deob-ui');
        const obfUi = document.getElementById('obf-ui');
        if (deobUi) deobUi.classList.toggle('hide', e.target.value === 'obf');
        if (obfUi) obfUi.classList.toggle('hide', e.target.value === 'deob');
    });
}

window.onload = () => { renderScripts(); };
