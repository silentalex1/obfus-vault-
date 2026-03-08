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

const _OV_KW = new Set([
    'and','break','do','else','elseif','end','false','for','function',
    'goto','if','in','local','nil','not','or','repeat','return','then','true','until','while'
]);

const _OV_RBX = new Set([
    'game','workspace','script','Instance','Vector3','CFrame','Color3','UDim2','UDim',
    'Enum','Players','RunService','Heartbeat','UserSettings','TweenService','HttpService',
    'ReplicatedStorage','ServerStorage','ServerScriptService','Lighting','SoundService',
    'task','wait','spawn','delay','tick','time','warn','print','error','assert','pcall',
    'xpcall','pairs','ipairs','next','select','type','tostring','tonumber','rawget',
    'rawset','setmetatable','getmetatable','load','loadstring','require','unpack',
    'table','string','math','os','io','coroutine','bit32','utf8','debug','Vector2',
    'Vector3int16','BrickColor','Ray','Region3','NumberRange','NumberSequence',
    'ColorSequence','PhysicalProperties','Faces','Axes','Random','DateTime',
    'RaycastParams','OverlapParams','getfenv','setfenv','rawequal','rawlen',
    'collectgarbage','_G','_ENV','_VERSION','SharedTable','buffer','Workspace',
    'TweenInfo','Rect','Color3','UDim','NumberSequenceKeypoint','ColorSequenceKeypoint',
    'CFrame','Vector3int16','Vector2int16'
]);

function _ovXS(seed) {
    let s = (seed ^ 0xDEADBEEF) >>> 0;
    return () => {
        s ^= s << 13; s >>>= 0;
        s ^= s >> 17; s >>>= 0;
        s ^= s << 5;  s >>>= 0;
        return s;
    };
}

function _ovName(rnd, used) {
    const v = 'aeiou', c = 'bcdfghjklmnprstvwxz';
    let n;
    do {
        n = '_';
        const len = (rnd() % 7) + 4;
        for (let i = 0; i < len; i++) {
            n += (i % 2 === 0 ? c : v)[rnd() % (i % 2 === 0 ? c.length : v.length)];
        }
        n += '_' + (rnd() % 0xFFFF).toString(36);
    } while (used.has(n));
    used.add(n);
    return n;
}

function _ovTokenize(src) {
    const out = []; let i = 0;
    while (i < src.length) {
        if (src[i] === '-' && src[i+1] === '-') {
            if (src[i+2] === '[' && src[i+3] === '[') {
                const e = src.indexOf(']]', i+4);
                i = e < 0 ? src.length : e + 2;
            } else {
                while (i < src.length && src[i] !== '\n') i++;
            }
            continue;
        }
        if (src[i] === '[' && src[i+1] === '[') {
            const e = src.indexOf(']]', i+2);
            out.push({ t: 'STR', v: src.slice(i+2, e < 0 ? src.length : e) });
            i = e < 0 ? src.length : e + 2; continue;
        }
        if (src[i] === '"' || src[i] === "'") {
            const q = src[i]; let s = ''; i++;
            while (i < src.length && src[i] !== q) {
                if (src[i] === '\\') {
                    i++;
                    const em = {'n':'\n','t':'\t','r':'\r','\\':'\\','"':'"',"'":"'", '0':'\0','a':'\x07','b':'\x08'};
                    s += em[src[i]] !== undefined ? em[src[i]] : src[i];
                    i++;
                } else s += src[i++];
            }
            i++;
            out.push({ t: 'STR', v: s }); continue;
        }
        const nm = src.slice(i).match(/^0x[0-9a-fA-F]+|^\d+\.?\d*(?:[eE][+-]?\d+)?/);
        if (nm) { out.push({ t: 'NUM', v: nm[0] }); i += nm[0].length; continue; }
        const id = src.slice(i).match(/^[_a-zA-Z][_a-zA-Z0-9]*/);
        if (id) {
            const n = id[0];
            out.push({ t: _OV_KW.has(n) ? 'KW' : 'ID', v: n });
            i += n.length; continue;
        }
        const ws = src.slice(i).match(/^\s+/);
        if (ws) { out.push({ t: 'WS', v: ws[0] }); i += ws[0].length; continue; }
        const op = src.slice(i).match(/^(?:\.\.\.|\.\.|~=|[=<>~]=|[+\-*\/%^#&|~<>]|[(){}\[\];:,\.])/);
        if (op) { out.push({ t: 'OP', v: op[0] }); i += op[0].length; continue; }
        out.push({ t: 'UNK', v: src[i++] });
    }
    return out;
}

function _ovEncStr(str, key) {
    const out = new Array(str.length);
    for (let i = 0; i < str.length; i++) {
        const b  = str.charCodeAt(i);
        const k0 = key[i % key.length];
        const k1 = key[(i * 7  + 3)  % key.length];
        const k2 = key[(i * 13 + 11) % key.length];
        out[i] = ((b ^ k0) + k1) % 256 ^ k2;
    }
    return out;
}

function _ovRC4(bytes, key) {
    const S = Array.from({ length: 256 }, (_, i) => i);
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + S[i] + key[i % key.length]) & 0xFF;
        [S[i], S[j]] = [S[j], S[i]];
    }
    let x = 0, y = 0;
    return bytes.map(b => {
        x = (x + 1) & 0xFF;
        y = (y + S[x]) & 0xFF;
        [S[x], S[y]] = [S[y], S[x]];
        return b ^ S[(S[x] + S[y]) & 0xFF];
    });
}

function _ovJunk(rnd) {
    const a = (rnd() % 9000) + 1000;
    const b = (rnd() % 9000) + 1000;
    const v = '_j' + (rnd() % 0xFFFF).toString(36);
    const w = '_j' + (rnd() % 0xFFFF).toString(36);
    const forms = [
        `local ${v}=${a};local ${w}=${b};if ${v}>${w} then ${v}=${v}-1 else ${w}=${w}+1 end`,
        `local ${v}=type("")=="string" and ${a} or ${b}`,
        `local ${v}=${a};for _=1,0 do ${v}=${v}+1 end`,
        `if false then local ${v}=${a+b} end`,
        `local ${v}=(${a}*1)+(${b}*0)`,
    ];
    return forms[rnd() % forms.length];
}

function _ovBuildRuntime(decFn, rc4Fn) {
    return `local function ${decFn}(b,k)
local o={}
for i=1,#b do
local k0=k[(i-1)%#k+1]
local k1=k[((i-1)*7+3)%#k+1]
local k2=k[((i-1)*13+11)%#k+1]
o[i]=string.char(((b[i]~k2)-k1+512)%256~k0)
end
return table.concat(o)
end
local function ${rc4Fn}(b,k)
local S={}
for i=0,255 do S[i]=i end
local j=0
for i=0,255 do
j=(j+S[i]+k[i%#k+1])%256
S[i],S[j]=S[j],S[i]
end
local x,y,o=0,0,{}
for i=1,#b do
x=(x+1)%256
y=(y+S[x])%256
S[x],S[y]=S[y],S[x]
o[i]=b[i]~S[(S[x]+S[y])%256]
end
return o
end`;
}

function ovObfuscate(src) {
    const seed = (Date.now() ^ 0xCAFEF00D) >>> 0;
    const rnd  = _ovXS(seed);
    const used = new Set([..._OV_KW, ..._OV_RBX]);
    const nameMap = {};
    const tokens  = _ovTokenize(src);

    for (const tok of tokens) {
        if (tok.t === 'ID' && !_OV_RBX.has(tok.v) && !nameMap[tok.v]) {
            nameMap[tok.v] = _ovName(rnd, used);
        }
    }

    const strKeyLen = 20 + (rnd() % 16);
    const strKey    = Array.from({ length: strKeyLen }, () => (rnd() % 220) + 20);

    const encStrings = [];
    const strMarker  = '';
    let body = '';

    for (const tok of tokens) {
        if (tok.t === 'STR') {
            const enc = _ovEncStr(tok.v, strKey);
            const idx = encStrings.length;
            encStrings.push(enc);
            body += strMarker + idx + strMarker;
        } else if (tok.t === 'ID' && !_OV_RBX.has(tok.v) && nameMap[tok.v]) {
            body += nameMap[tok.v];
        } else if (tok.t !== 'WS') {
            body += tok.v;
        } else {
            body += ' ';
        }
    }

    const lines    = body.split('\n').filter(l => l.trim());
    const jEvery   = Math.max(3, Math.floor(lines.length / 12));
    const augLines = [];
    for (let i = 0; i < lines.length; i++) {
        augLines.push(lines[i]);
        if (i > 0 && i % jEvery === 0) augLines.push(_ovJunk(rnd));
    }

    let inner = augLines.join('\n');
    for (let i = encStrings.length - 1; i >= 0; i--) {
        inner = inner.split(strMarker + i + strMarker).join('__ovst[' + i + ']');
    }

    const rn = () => '_' + (rnd() % 0xFFFF).toString(36);
    const strTblN = rn(), keyStrN = rn(), decFnN = rn(), rc4FnN = rn();
    const key2N   = rn(), bcN     = rn(), execN  = rn();

    const strDecl = (() => {
        if (encStrings.length === 0) return 'local __ovst={}\n';
        const encLits = encStrings.map(enc => '{' + enc.join(',') + '}').join(',');
        return (
            'local ' + keyStrN + '={' + strKey.join(',') + '}\n' +
            'local __ovst_raw={' + encLits + '}\n' +
            'local __ovst={}\n' +
            'for __i=1,#__ovst_raw do\n' +
            '__ovst[__i-1]=' + decFnN + '(__ovst_raw[__i],' + keyStrN + ')\n' +
            'end\n'
        );
    })();

    const fullInner  = strDecl + inner;
    const innerBytes = Array.from(fullInner, c => c.charCodeAt(0));
    const rc4Key     = Array.from({ length: strKeyLen }, () => (rnd() % 220) + 20);
    const encInner   = _ovRC4(innerBytes, rc4Key);

    const j1 = _ovJunk(rnd), j2 = _ovJunk(rnd), j3 = _ovJunk(rnd);
    const intV  = (rnd() % 0xFFFFFF).toString(16);
    const intVN = rn();
    const antiTampN = rn();

    const runtime = _ovBuildRuntime(decFnN, rc4FnN);

    const output =
        runtime + '\n' +
        'local ' + key2N + '={' + rc4Key.join(',') + '}\n' +
        j1 + '\n' +
        'local ' + bcN + '={' + encInner.join(',') + '}\n' +
        j2 + '\n' +
        'local ' + intVN + '="' + intV + '"\n' +
        'assert(#' + intVN + '==' + intV.length + ',"[ObfusVault] integrity failure")\n' +
        j3 + '\n' +
        'local ' + antiTampN + '=(' + rc4Key[0] + '^' + rc4Key[1] + ')\n' +
        'assert(' + antiTampN + '==' + (rc4Key[0] ^ rc4Key[1]) + ',"[ObfusVault] tamper detected")\n' +
        'local ' + execN + '=' + rc4FnN + '(' + bcN + ',' + key2N + ')\n' +
        'local _src={}\n' +
        'for _i=1,#' + execN + ' do _src[_i]=string.char(' + execN + '[_i]) end\n' +
        'local _fn=loadstring(table.concat(_src)) or load(table.concat(_src))\n' +
        'assert(_fn,"[ObfusVault] execution error")\n' +
        '_fn()\n';

    return output;
}

function ovDeobfuscate(src) {
    let r = src;
    r = r.replace(/string\.char\(([\d,\s]+)\)/g, (_, n) => {
        try { return '"' + String.fromCharCode(...n.split(',').map(x => parseInt(x.trim()))) + '"'; } catch { return _; }
    });
    r = r.replace(/\bbit32\.bxor\((\d+),\s*(\d+)\)/g, (_,a,b) => String(parseInt(a)^parseInt(b)));
    r = r.replace(/\bbit32\.band\((\d+),\s*(\d+)\)/g, (_,a,b) => String(parseInt(a)&parseInt(b)));
    r = r.replace(/\bbit32\.bor\((\d+),\s*(\d+)\)/g,  (_,a,b) => String(parseInt(a)|parseInt(b)));
    r = r.replace(/\bbit32\.bnot\((\d+)\)/g,             (_,a)   => String((~parseInt(a))>>>0));
    r = r.replace(/\bbit32\.lshift\((\d+),\s*(\d+)\)/g,(_,a,b) => String(parseInt(a)<<parseInt(b)));
    r = r.replace(/\bbit32\.rshift\((\d+),\s*(\d+)\)/g,(_,a,b) => String(parseInt(a)>>>parseInt(b)));
    r = r.replace(/\bmath\.floor\((\d+(?:\.\d+)?)\)/g, (_,n)   => String(Math.floor(parseFloat(n))));
    r = r.replace(/\bmath\.ceil\((\d+(?:\.\d+)?)\)/g,  (_,n)   => String(Math.ceil(parseFloat(n))));
    r = r.replace(/\btostring\((\d+)\)/g,                 (_,n)   => '"'+n+'"');
    r = r.replace(/\(\s*(\d+)\s*([+\-*%])\s*(\d+)\s*\)/g, (_,a,op,b) => {
        const x=parseInt(a), y=parseInt(b);
        return op==='+'?String(x+y):op==='-'?String(x-y):op==='*'?String(x*y):String(x%y);
    });
    r = r.replace(/--\[\[[\s\S]*?\]\]/g, '');
    r = r.replace(/--[^\n]*/g, '');
    r = r.replace(/\n{3,}/g, '\n\n');
    return r.trim();
}

async function handleWork(m) {
    const c = document.getElementById('main-editor').value.trim();
    if (!c) return log('Error: Empty buffer.');
    const loader = document.getElementById('work-loader');
    loader.style.display = 'flex';
    const stages = m === 'deob'
        ? ['SCANNING', 'RESOLVING', 'REBUILDING', 'CLEANING']
        : ['TOKENIZING', 'ENCRYPTING STRINGS', 'RC4 SEALING', 'FINALIZING'];
    let p = 0;
    const t = setInterval(() => {
        p += 1.1;
        const cl = Math.min(p, 99);
        document.getElementById('load-fill').style.width = cl + '%';
        document.getElementById('load-val').innerText = Math.floor(cl) + '%';
        document.getElementById('loader-msg').innerText = stages[Math.min(Math.floor((cl/100)*stages.length), stages.length-1)];
        if (p >= 100) {
            clearInterval(t);
            try {
                document.getElementById('main-editor').value = m === 'deob' ? ovDeobfuscate(c) : ovObfuscate(c);
            } catch(e) { log('Engine error: ' + e.message); }
            updateMainSyntax();
            document.getElementById('load-fill').style.width = '100%';
            document.getElementById('load-val').innerText = '100%';
            setTimeout(() => { loader.style.display = 'none'; log(m.toUpperCase() + ' complete.', true); }, 300);
        }
    }, 12);
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
