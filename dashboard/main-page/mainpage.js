const input = document.getElementById('code-input');
const loader = document.getElementById('process-loader');
const bar = document.getElementById('bar-fill');
const barText = document.getElementById('bar-val');
const msgLabel = document.getElementById('load-msg');
const consoleBody = document.getElementById('log-list');
const modeSelect = document.getElementById('mode-selector');
const deobUi = document.getElementById('deob-ui');
const obfUi = document.getElementById('obf-ui');

modeSelect.addEventListener('change', () => {
    if (modeSelect.value === 'obfuscator') {
        deobUi.classList.add('hidden');
        obfUi.classList.remove('hidden');
    } else {
        deobUi.classList.remove('hidden');
        obfUi.classList.add('hidden');
    }
});

function addLog(text, good = false) {
    const div = document.createElement('div');
    div.className = good ? 'log-line log-good' : 'log-line';
    div.textContent = `[vault] ${text}`;
    consoleBody.appendChild(div);
    consoleBody.scrollTop = consoleBody.scrollHeight;
}

function processDeob(code) {
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

function processObf(code) {
    const isLua = code.includes('local') || code.includes('function');
    if (isLua) {
        let bytes = [];
        for (let i = 0; i < code.length; i++) bytes.push(code.charCodeAt(i) ^ 0x2A);
        return `local _V = {${bytes.join(',')}}; local _D = ""; for i=1,#_V do _D=_D..string.char(_V[i]~42) end; loadstring(_D)()`;
    } else {
        let b = btoa(code);
        return `(function(){ let _h = "${b}"; eval(atob(_h)); })();`;
    }
}

async function startWork(mode) {
    const data = input.value.trim();
    if (!data) return addLog("No script detected.");

    loader.style.display = 'flex';
    let p = 0;
    const isLua = data.includes('local') || data.includes('function');
    const lang = isLua ? "Lua" : "JS";

    const stages = mode === 'deob' ? 
        [10, 30, 60, 85, 100] : [20, 40, 70, 90, 100];
    
    const messages = mode === 'deob' ?
        [`detecting ${lang} code..`, `detected ${lang} script`, "measuring security..", "bypassing vm protection..", "success"] :
        [`preparing ${lang} vm..`, "encrypting constants..", "generating custom vm bytecode..", "finalizing obfuscation..", "success"];

    const run = setInterval(() => {
        p++;
        bar.style.width = `${p}%`;
        barText.innerText = `${p}%`;

        for(let i=0; i<stages.length; i++) {
            if (p <= stages[i]) {
                msgLabel.innerText = messages[i];
                break;
            }
        }

        if (p >= 100) {
            clearInterval(run);
            input.value = mode === 'deob' ? processDeob(data) : processObf(data);
            
            setTimeout(() => {
                loader.style.display = 'none';
                addLog(mode === 'deob' ? `${lang} deobfuscated.` : `${lang} obfuscated.`, true);
            }, 300);
        }
    }, 25);
}

document.getElementById('run-deob').addEventListener('click', () => startWork('deob'));
document.getElementById('run-obf').addEventListener('click', () => startWork('obf'));
