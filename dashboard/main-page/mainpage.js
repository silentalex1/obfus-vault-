window.switchPage = function(pageId) {
    document.querySelectorAll('.workspace').forEach(p => p.classList.add('hide'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.remove('hide');
    const target = Array.from(document.querySelectorAll('.menu-btn')).find(b => b.textContent.includes(pageId));
    if (target) target.classList.add('active');
    log(`Switched to ${pageId}`);
};

window.showSubmitModal = function() { document.getElementById('submit-modal').classList.remove('hide'); };
window.hideSubmitModal = function() { document.getElementById('submit-modal').classList.add('hide'); };
window.togglePassInput = function() { document.getElementById('pass-field').classList.toggle('hide'); };

function log(text, success = false) {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const div = document.createElement('div');
    div.className = success ? 'term-line green' : 'term-line';
    div.innerHTML = `<span class="time">[${time}]</span>> ${text}`;
    const cb = document.getElementById('console-output');
    cb.appendChild(div);
    cb.scrollTop = cb.scrollHeight;
}

async function renderScripts() {
    const cList = document.getElementById('community-list');
    const pList = document.getElementById('private-list');
    cList.innerHTML = ''; pList.innerHTML = '';

    try {
        const res = await fetch('/api/scripts');
        const scripts = await res.json();

        scripts.forEach((s) => {
            const card = document.createElement('div');
            card.className = 'script-card';
            card.innerHTML = `
                <div class="script-info">
                    <h3>${s.title}</h3>
                    <p>Link: /s/${s.id}</p>
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="action-btn" onclick="copyRealLink('${s.id}')">copy link</button>
                    <button class="action-btn" onclick="window.open('/s/${s.id}', '_blank')">view</button>
                </div>
            `;
            if (s.public) cList.appendChild(card); else pList.appendChild(card);
        });
    } catch (e) {
        log("Failed to load scripts from server.");
    }
}

window.copyRealLink = function(id) {
    const link = window.location.origin + "/s/" + id;
    navigator.clipboard.writeText(link);
    log("Direct link copied.");
};

document.getElementById('btn-post-script').addEventListener('click', async () => {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const isPublic = document.getElementById('post-public').value === 'yes';
    const usePass = document.getElementById('use-pass').checked;
    const pass = document.getElementById('post-pass').value;

    if(!title || !content) return alert("Fill all fields.");

    const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title,
            content,
            public: isPublic,
            pass: usePass ? pass : null
        })
    });

    if (response.ok) {
        hideSubmitModal();
        renderScripts();
        log("Script saved to server database.", true);
    }
});

document.getElementById('btn-pull').addEventListener('click', async () => {
    let url = document.getElementById('pull-url').value.trim();
    if (!url) return log("No URL.");
    log("Pulling...");
    try {
        const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxy);
        document.getElementById('main-editor').value = await res.text();
        log("Pulled successfully.", true);
    } catch (e) { log("Pull failed."); }
});

renderScripts();
log("Connected to backend.");
