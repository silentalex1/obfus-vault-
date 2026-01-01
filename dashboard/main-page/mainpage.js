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

function advancedDeob(code) {
    let c = code;
    // Moonsec & VM Cleanup
    c = c.replace(/local\s+\w+=string\.char;local\s+\w+=string\.byte;.*?loadstring\(\w+\)\(\)/gs, '');
    c = c.replace(/--\[\[.*?\]\]/gs, '');
    c = c.replace(/string\.char\(([\d,\s]+)\)/g, (_, n) => {
        try { return `"${String.fromCharCode(...n.split(',').map(x => parseInt(x.trim())))}"`; } catch { return _; }
    });
    c = c.replace(/bit32\.bxor\(([\d\w\s,]+)\)/g, (_, args) => {
        try { const p = args.split(',').map(x => parseInt(x.trim())); return (p[0] ^ p[1]).toString(); } catch { return _; }
    });
    // JS Deob
    c = c.replace(/atob\(['"](.*?)['"]\)/g, (_, b) => {
        try { return `"${atob(b)}"`; } catch { return _; }
    });
    return c.trim();
}

function advancedObf(code, type) {
    if (type === 'lua-vm') {
        let bytes = [];
        for (let i = 0; i < code.length; i++) bytes.push(code.charCodeAt(i) ^ 0x7F);
        return `local _V={${bytes.join(',')}};local _S="";for i=1,#_V do _S=_S..string.char(_V[i]~127) end;loadstring(_S)()`;
    } else {
        let b = btoa(code);
        return `eval(atob("${b}"));`;
    }
}

async function handleWork(mode) {
    const content = editor.value.trim();
    if (!content) return log("Editor is empty.");

    loader.style.display = 'flex';
    let p = 0;
    const isLua = content.includes('local') || content.includes('function');
    const lang = isLua ? "Lua" : "JS";

    const stages = mode === 'deob' ? 
        ["detecting code..", "analyzing vm..", "stripping protection..", "success"] :
        ["building vm..", "encrypting..", "packing code..", "success"];

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
                log(`${lang} script processed.`, true);
            }, 300);
        }
    }, 20);
}

document.getElementById('btn-pull').addEventListener('click', async () => {
    const url = document.getElementById('pull-url').value.trim();
    if (!url) return log("No URL provided.");
    
    log("Pulling script...");
    try {
        const res = await fetch(url);
        const text = await res.text();
        editor.value = text;
        log("Code retrieved successfully.", true);
    } catch (e) {
        log("Failed to pull code. check link.");
    }
});

document.getElementById('trigger-deob').addEventListener('click', () => handleWork('deob'));
document.getElementById('trigger-obf').addEventListener('click', () => handleWork('obf'));
