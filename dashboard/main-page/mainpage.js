window.switchPage = (p) => {
    document.querySelectorAll('.workspace').forEach(w => w.classList.add('hide'));
    document.getElementById('page-' + p).classList.remove('hide');
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
};

window.clearConsole = () => { document.getElementById('console-output').innerHTML = ''; };

async function checkUserStatus() {
    const id = "USER_DISCORD_ID"; 
    const res = await fetch(`/api/user/${id}`);
    const data = await res.json();
    
    if (data.blacklisted) {
        document.getElementById('main-content').classList.add('hide');
        document.getElementById('blacklist-screen').classList.remove('hide');
        return;
    }
    document.getElementById('user-role').innerText = data.role;
}

async function renderScripts() {
    const res = await fetch('/api/scripts');
    const scripts = await res.json();
    const cList = document.getElementById('community-list');
    const pList = document.getElementById('private-list');
    const user = document.getElementById('user-display').innerText;
    
    cList.innerHTML = ''; pList.innerHTML = '';
    scripts.forEach(s => {
        const div = document.createElement('div');
        div.className = 'script-card';
        div.innerHTML = `<h3>${s.title}</h3><button onclick="window.open('/s/${s.id}')">view</button>`;
        if (s.public === 'yes') cList.appendChild(div);
        else if (s.owner === user) pList.appendChild(div);
    });
}

document.getElementById('btn-post-script').onclick = async () => {
    const body = {
        title: document.getElementById('post-title').value,
        content: document.getElementById('post-content').value,
        public: document.getElementById('post-public').value,
        owner: document.getElementById('user-display').innerText,
        pass: document.getElementById('use-pass').checked ? document.getElementById('post-pass').value : null
    };
    await fetch('/api/scripts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
    window.hideSubmitModal();
    renderScripts();
};

window.updateSyntax = () => {
    const txt = document.getElementById('post-content').value;
    document.getElementById('syntax-layer').innerText = txt;
};

checkUserStatus();
renderScripts();
