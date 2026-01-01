window.switchPage = function(pageId) {
    document.querySelectorAll('.workspace').forEach(p => p.classList.add('hide'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + (pageId === 'service' ? 'service' : pageId)).classList.remove('hide');
    log(`Switched to ${pageId}`);
};

window.clearConsole = function() {
    document.getElementById('console-output').innerHTML = '';
    log("Console cleared.");
};

window.updateSyntax = function() {
    const text = document.getElementById('post-content').value;
    const highlight = document.getElementById('syntax-highlight');
    // Simple coloring logic
    highlight.innerHTML = text
        .replace(/local|function|return|then|if|end|else|elseif/g, '<span class="kwd">$&</span>')
        .replace(/".*?"/g, '<span class="str">$&</span>')
        .replace(/\b\d+\b/g, '<span class="num">$&</span>');
};

async function renderScripts() {
    const cList = document.getElementById('community-list');
    const pList = document.getElementById('private-list');
    const currentUser = document.getElementById('user-display').innerText;

    try {
        const res = await fetch('/api/scripts');
        const data = await res.json();
        cList.innerHTML = ''; pList.innerHTML = '';

        data.forEach((s, i) => {
            const card = document.createElement('div');
            card.className = 'script-card';
            card.innerHTML = `
                <div class="script-info"><h3>${s.title}</h3><p>By ${s.owner}</p></div>
                <button class="action-btn" onclick="openScriptFromServer('${s.id}')">view</button>
            `;
            // Only show in "Your Scripts" if owner matches
            if (s.public) cList.appendChild(card);
            else if (s.owner === currentUser) pList.appendChild(card);
        });
    } catch (e) { log("Failed to sync with server."); }
}

document.getElementById('btn-post-script').addEventListener('click', async () => {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const currentUser = document.getElementById('user-display').innerText;
    
    const body = {
        title,
        content,
        owner: currentUser,
        public: document.getElementById('post-public').value === 'yes',
        pass: document.getElementById('use-pass').checked ? document.getElementById('post-pass').value : null
    };

    const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });

    if(res.ok) {
        hideSubmitModal();
        renderScripts();
        log("Script successfully saved.");
    }
});
