const editor = document.getElementById('main-editor');
const loader = document.getElementById('work-loader');
const barFill = document.getElementById('load-fill');
const barVal = document.getElementById('load-val');
const barMsg = document.getElementById('loader-msg');
const consoleBox = document.getElementById('console-output');
const mainMode = document.getElementById('main-mode');
const deobGroup = document.getElementById('deob-settings');
const obfGroup = document.getElementById('obf-settings');

mainMode.addEventListener('change', () => {
    if (mainMode.value === 'obfuscator') {
        deobGroup.classList.add('hide');
        obfGroup.classList.remove('hide');
    } else {
        deobGroup.classList.remove('hide');
        obfGroup.classList.add('hide');
    }
});

function log(text, success = false) {
    const div = document.createElement('div');
    div.className = success ? 'term-line green' : 'term-line';
    div.textContent = `[vault] ${text}`;
    consoleBox.appendChild(div);
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

// Aggressive Deobfuscation Logic
function advancedDeob(code) {
    let c = code;
    // Strip Moonsec/VM headers
    c = c.replace(/local\s+\w+=string\.char;local\s+\w+=string\.byte;.*?loadstring\(\w+\)\(\)/gs, '-- [Stripped VM Header]');
    c = c.replace(/--\[\[.*?\]\]/gs, '');
    // Unpack string.char
    c = c.replace(/string\.char\(([\d,\s]+)\)/g, (_, n) => {
        try { return `"${String.fromCharCode(...n.split(',').map(x => parseInt(x.trim())))}"`; } catch { return _; }
    });
    // Solve Math/XOR
    c = c.replace(/bit32\.bxor\(([\d\w\s,]+)\)/g, (_, args) => {
        try { const p = args.split(',').map(x => parseInt(x.trim())); return (p[0] ^ p[1]).toString(); } catch { return _; }
    });
    // JS B64/Atob decryption
    c = c.replace(/atob\(['"](.*?)['"]\)/g, (_, b) => {
        try { return `"${atob(b)}"`; } catch { return _; }
    });
    return c.trim();
}

function advancedObf(code, type) {
    if (type === 'lua-vm') {
        let bytes = [];
        for (let i = 0; i < code.length; i++) bytes.push(code.charCodeAt(i) ^ 0x9D);
        return `local _V={${bytes.join(',')}};local _X="";for i=1,#_V do _X=_X..string.char(_V[i]~157) end;loadstring(_X)()`;
    } else {
        let b = btoa(code);
        return `(function(_0x1){eval(atob(_0x1))})("${b}");`;
    }
}

async function handleWork(mode) {
    const content = editor.value.trim();
    if (!content) return log("Error: No code to process.");

    loader.style.display = 'flex';
    let p = 0;
    const isLua = content.includes('local') || content.includes('function');
    const lang = isLua ? "LUA" : "JS";

    const stages = mode === 'deob' ? 
        ["ANALYZING STRUCTURE", "BYPASSING CORE VM", "STRIPPING JUNK", "DECRYPTING CONSTANTS", "FINALIZING"] :
        ["BUILDING VM", "ENCRYPTING BYTES", "PACKING CONSTANTS", "SUCCESS"];

    const task = setInterval(() => {
        p += 2;
        barFill.style.width = `${p}%`;
        barVal.innerText = `${p}%`;
        
        const idx = Math.floor((p / 100) * stages.length);
        if (stages[idx]) barMsg.innerText = stages[idx];

        if (p >= 100) {
            clearInterval(task);
            editor.value = mode === 'deob' ? advancedDeob(content) : advancedObf(content, document.getElementById('obf-mode').value);
            
            setTimeout(() => {
                loader.style.display = 'none';
                log(`${lang} Process completed successfully.`, true);
            }, 400);
        }
    }, 25);
}

// SCRIPT PULLER WITH CORS BYPASS
document.getElementById('btn-pull').addEventListener('click', async () => {
    let url = document.getElementById('pull-url').value.trim();
    if (!url) return log("Error: No URL provided.");
    
    // Clean raw link helpers
    if (url.includes("github.com") && !url.includes("raw.githubusercontent.com")) {
        url = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
    }

    log("Pulling script from remote host...");
    
    try {
        // We use AllOrigins Proxy to bypass CORS block
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("HTTP Error");
        
        const text = await res.text();
        editor.value = text;
        log("Successfully retrieved remote code.", true);
        log(`Extracted ${text.length} characters.`);
    } catch (e) {
        log("Error: Failed to pull code. Host blocked or URL invalid.");
        log("Try using a raw link if possible.");
    }
});

document.getElementById('trigger-deob').addEventListener('click', () => handleWork('deob'));
document.getElementById('trigger-obf').addEventListener('click', () => handleWork('obf'));
