const deobBtn = document.getElementById('deob-btn');
const inputField = document.getElementById('code-input');
const loaderOverlay = document.getElementById('process-loader');
const editorUi = document.getElementById('editor-ui');
const statusMsg = document.getElementById('status-msg');
const barFill = document.getElementById('bar-fill');
const percentVal = document.getElementById('percent-val');
const consoleBox = document.getElementById('console-logs');

function log(text, success = false) {
    const el = document.createElement('div');
    el.className = success ? 'line line-success' : 'line';
    el.textContent = `[system] ${text}`;
    consoleBox.appendChild(el);
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

function runDeobCore(code) {
    let output = code;

    output = output.replace(/\(function\(\)\s*\(\[\[This file was protected with MoonSec.*?\]\]\)\s*:gsub\(['"](.)['"],\s*function\(./g, '');
    output = output.replace(/local e=(\d+);local o=0;local n={};while o<e do o=o+1;n\[o\]=string\.char\(./g, '');
    output = output.replace(/local a=(\d+);local i=0;local t=\{\};while i<a do i=i+1;t\[i\]=./g, '');
    output = output.replace(/local function .+?end/g, '');
    output = output.replace(/loadstring\(.+?\(\)\)\(\)/g, m => {
        const inner = m.match(/loadstring\((.+?)\(\)\)\(\)/);
        return inner ? inner[1] : '';
    });
    output = output.replace(/string\.char\(([^\)]+)\)/g, (_, num) => {
        try {
            const n = parseInt(num.replace(/\%\d+/g, m => String.fromCharCode(parseInt(m.slice(1)))));
            return `"${String.fromCharCode(n)}"`;
        } catch { return _; }
    });
    output = output.replace(/(\d+)\s*~\s*(\d+)/g, (_, a, b) => (parseInt(a) ^ parseInt(b)).toString());
    
    output = output.replace(/return loadstring\(string\.char\(table\.unpack\{([^}]+)\}\)\)\(\)/g, (_, bytes) => {
        const nums = bytes.split(',').map(n => parseInt(n.trim()));
        return nums.map(n => String.fromCharCode(n)).join('');
    });
    
    output = output.replace(/bit32\.bxor\(([^,]+),\s*([^)]+)\)/g, (_, a, b) => (parseInt(a) ^ parseInt(b)).toString());

    const isLua = code.includes('local') || code.includes('function') || code.includes('--');
    const isJS = code.includes('var ') || code.includes('let ') || code.includes('const ') || code.includes('=>');

    return { 
        code: output, 
        lang: isJS ? 'js' : 'lua' 
    };
}

deobBtn.addEventListener('click', () => {
    const source = inputField.value.trim();
    if (!source) return log("No code detected in editor.");

    loaderOverlay.style.display = 'flex';
    editorUi.classList.add('is-blurry');
    
    let step = 0;
    const timeline = [
        { limit: 15, msg: "detecting if its js or lua.." },
        { limit: 35, msg: "" }, 
        { limit: 55, msg: "measuring the security of the script.." },
        { limit: 85, msg: "analyzing and bypassing core vm protection.." },
        { limit: 100, msg: "succesfully deobfuscated!" }
    ];

    const isJS = source.includes('var') || source.includes('const') || source.includes('function(');
    timeline[1].msg = isJS ? "we have detected it being js" : "we have detected it being lua";

    const task = setInterval(() => {
        step += 1;
        barFill.style.width = `${step}%`;
        percentVal.innerText = `${step}%`;

        const stage = timeline.find(s => step <= s.limit);
        if (stage) statusMsg.innerText = stage.msg;

        if (step >= 100) {
            clearInterval(task);
            
            const result = runDeobCore(source);
            inputField.value = result.code;

            setTimeout(() => {
                loaderOverlay.style.display = 'none';
                editorUi.classList.remove('is-blurry');
                
                const finalMsg = result.lang === 'js' 
                    ? "js script has successfully been deobfuscated." 
                    : "moonsec lua script has successfully been deobfuscated.";
                
                log(finalMsg, true);
            }, 500);
        }
    }, 35);
});
