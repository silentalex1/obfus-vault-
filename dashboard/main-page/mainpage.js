const editor = document.getElementById('editor-input');
const loader = document.getElementById('work-loader');
const bar = document.getElementById('progress-bar');
const barText = document.getElementById('progress-val');
const status = document.getElementById('status-label');
const logs = document.getElementById('log-output');
const modeSelect = document.getElementById('mode-selector');
const deobGroup = document.getElementById('deob-options');
const obfGroup = document.getElementById('obf-options');

modeSelect.addEventListener('change', () => {
    if (modeSelect.value === 'obfuscator') {
        deobGroup.classList.add('hidden');
        obfGroup.classList.remove('hidden');
    } else {
        deobGroup.classList.remove('hidden');
        obfGroup.classList.add('hidden');
    }
});

function writeLog(msg, success = false) {
    const div = document.createElement('div');
    div.className = success ? 'log-entry log-success' : 'log-entry';
    div.textContent = `> ${msg}`;
    logs.appendChild(div);
    logs.scrollTop = logs.scrollHeight;
}

function deobfuscate(code) {
    let c = code;
    c = c.replace(/\(function\(\)\s*\(\[\[This file was protected with MoonSec.*?\]\]\)\s*:gsub\(['"](.)['"],\s*function\(./g, '');
    c = c.replace(/local e=(\d+);local o=0;local n={};while o<e do o=o+1;n\[o\]=string\.char\(./g, '');
    c = c.replace(/local a=(\d+);local i=0;local t=\{\};while i<a do i=i+1;t\[i\]=./g, '');
    c = c.replace(/loadstring\(.+?\(\)\)\(\)/g, m => {
        const inner = m.match(/loadstring\((.+?)\(\)\)\(\)/);
        return inner ? inner[1] : '';
    });
    c = c.replace(/string\.char\(([^\)]+)\)/g, (_, n) => {
        try { return `"${String.fromCharCode(parseInt(n))}"`; } catch { return _; }
    });
    c = c.replace(/bit32\.bxor\(([^,]+),\s*([^)]+)\)/g, (_, a, b) => (parseInt(a) ^ parseInt(b)).toString());
    c = c.replace(/return loadstring\(string\.char\(table\.unpack\{([^}]+)\}\)\)\(\)/g, (_, b) => {
        return b.split(',').map(n => String.fromCharCode(parseInt(n.trim()))).join('');
    });
    return c;
}

function obfuscate(code) {
    const isLua = code.includes('local') || code.includes('function');
    if (isLua) {
        let bytes = [];
        for (let i = 0; i < code.length; i++) bytes.push(code.charCodeAt(i) ^ 0x55);
        return `local _VM = {${bytes.join(',')}}; local _S = ""; for i=1,#_VM do _S=_S..string.char(_VM[i]~85) end; loadstring(_S)()`;
    } else {
        let encoded = btoa(code);
        return `(function(){ let _0x = "${encoded}"; eval(atob(_0x)); })();`;
    }
}

async function startProcess(mode) {
    const input = editor.value.trim();
    if (!input) return writeLog("Editor is empty.");

    loader.style.display = 'flex';
    let p = 0;
    const isLua = input.includes('local') || input.includes('function');
    const lang = isLua ? "Lua" : "JS";

    const steps = mode === 'deobfuscate' ? 
        [15, 35, 60, 85, 100] : [20, 45, 70, 90, 100];
    
    const msgs = mode === 'deobfuscate' ?
        [`detecting ${lang} code..`, `detected ${lang} script`, "measuring security..", "bypassing vm protection..", "success"] :
        [`preparing ${lang} vm..`, "encrypting constants..", "generating custom vm bytecode..", "finalizing obfuscation..", "success"];

    const timer = setInterval(() => {
        p++;
        bar.style.width = `${p}%`;
        barText.innerText = `${p}%`;

        for(let i=0; i<steps.length; i++) {
            if (p <= steps[i]) {
                status.innerText = msgs[i];
                break;
            }
        }

        if (p >= 100) {
            clearInterval(timer);
            const result = mode === 'deobfuscate' ? deobfuscate(input) : obfuscate(input);
            editor.value = result;
            
            setTimeout(() => {
                loader.style.display = 'none';
                const final = mode === 'deobfuscate' ? `${lang} script deobfuscated.` : `${lang} script obfuscated.`;
                writeLog(final, true);
            }, 400);
        }
    }, 30);
}

document.getElementById('run-deob').addEventListener('click', () => startProcess('deobfuscate'));
document.getElementById('run-obf').addEventListener('click', () => startProcess('obfuscate'));
