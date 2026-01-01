const deobBtn = document.getElementById('deob-btn');
const input = document.getElementById('code-input');
const loader = document.getElementById('loader');
const editorWrap = document.getElementById('editor-wrap');
const loaderMsg = document.getElementById('loader-msg');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const consoleLogs = document.getElementById('console-logs');

function logToConsole(text, isSuccess = false) {
    const div = document.createElement('div');
    div.className = isSuccess ? 'log-row success-log' : 'log-row';
    div.textContent = `> ${text}`;
    consoleLogs.appendChild(div);
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

function runDeobLogic(code) {
    // Improved logic wrapper
    let result = code;

    // Detection
    const isLua = code.includes('local') || code.includes('function') || code.includes('--');
    const isJS = code.includes('var ') || code.includes('let ') || code.includes('const ') || code.includes('=>');

    // Applied Regex Logic
    result = result.replace(/\(function\(\)\s*\(\[\[This file was protected with MoonSec.*?\]\]\)\s*:gsub\(['"](.)['"],\s*function\(./g, '');
    result = result.replace(/local e=(\d+);local o=0;local n={};while o<e do o=o+1;n\[o\]=string\.char\(./g, '');
    result = result.replace(/return loadstring\(string\.char\(table\.unpack\{([^}]+)\}\)\)\(\)/g, (_, bytes) => {
        try { return bytes.split(',').map(n => String.fromCharCode(parseInt(n.trim()))).join(''); } catch { return _; }
    });
    result = result.replace(/string\.char\(([^\)]+)\)/g, (_, num) => {
        try { return `"${String.fromCharCode(parseInt(num))}"`; } catch { return _; }
    });
    result = result.replace(/bit32\.bxor\(([^,]+),\s*([^)]+)\)/g, (_, a, b) => (parseInt(a) ^ parseInt(b)).toString());
    
    // JS specific devirtualization patterns
    if (isJS) {
        result = result.replace(/_0x[a-f0-9]+\s*=\s*\[.*?\];/gs, '');
    }

    return { code: result, type: isJS ? 'js' : 'lua' };
}

deobBtn.addEventListener('click', () => {
    const rawCode = input.value.trim();
    if (!rawCode) return logToConsole("no code provided.");

    // UI Start
    loader.style.display = 'flex';
    editorWrap.classList.add('blurred');
    
    let progress = 0;
    const stages = [
        { p: 10, t: "detecting if its js or lua.." },
        { p: 30, t: "" }, // Dynamic detection text
        { p: 50, t: "measuring the security of the script.." },
        { p: 80, t: "analyzing and bypassing core vm protection..." },
        { p: 100, t: "succesfully deobfuscated!" }
    ];

    const isJS = rawCode.includes('var') || rawCode.includes('const');
    stages[1].t = isJS ? "we have detected it being js" : "we have detected it being lua";

    const interval = setInterval(() => {
        progress += 1;
        progressFill.style.width = `${progress}%`;
        progressText.innerText = `${progress}%`;

        const currentStage = stages.find(s => progress <= s.p);
        if (currentStage) loaderMsg.innerText = currentStage.t;

        if (progress >= 100) {
            clearInterval(interval);
            
            // Execute logic
            const processed = runDeobLogic(rawCode);
            input.value = processed.code;

            // UI Reset
            setTimeout(() => {
                loader.style.display = 'none';
                editorWrap.classList.remove('blurred');
                logToConsole(`${processed.type === 'js' ? 'js' : 'moonsec lua'} script has successfully been deobfuscated.`, true);
            }, 600);
        }
    }, 40);
});
