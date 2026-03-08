document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('ov_token') && _ovVerifyToken(localStorage.getItem('ov_token'))) {
        window.location.href = '/dashboard/main-page/';
        return;
    }

    const userIn     = document.getElementById('username');
    const passIn     = document.getElementById('password');
    const toggleBtn  = document.getElementById('toggle-pass');
    const submitBtn  = document.getElementById('auth-submit');
    const discordBtn = document.getElementById('discord-btn');
    const switchBtn  = document.getElementById('switch-mode');
    const switchLbl  = document.getElementById('switch-label');
    const errorMsg   = document.getElementById('error-msg');
    const authTitle  = document.getElementById('auth-title');

    let isLogin = true;

    function showError(msg) { errorMsg.textContent = msg; errorMsg.style.display = 'block'; }
    function hideError()    { errorMsg.style.display = 'none'; }

    function _ovFNV(str) {
        let h = 0x811c9dc5 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h  = Math.imul(h, 0x01000193) >>> 0;
        }
        return h;
    }

    function _ovHash(str) {
        let a = _ovFNV(str + 'OV_A_2025');
        let b = _ovFNV(str + 'OV_B_2025');
        let c = _ovFNV(str + 'OV_C_2025');
        for (let i = 0; i < 256; i++) {
            const t = a;
            a = ((b ^ (c >>> 3)) + Math.imul(a, 0x9e3779b9)) >>> 0;
            b = ((c ^ (a << 5))  + Math.imul(b, 0x85ebca6b)) >>> 0;
            c = ((t ^ (b >>> 7)) + Math.imul(c, 0xc2b2ae35)) >>> 0;
        }
        return [a, b, c].map(x => x.toString(16).padStart(8, '0')).join('');
    }

    function _ovMakeToken(username) {
        const ts   = Date.now().toString(36);
        const rand = Array.from(crypto.getRandomValues(new Uint8Array(12)))
                         .map(b => b.toString(16).padStart(2, '0')).join('');
        const payload = username + '|' + ts + '|' + rand;
        const sig     = _ovHash(payload + '|OV_SIG_SECRET_2025');
        return btoa(payload + '|' + sig);
    }

    function _ovVerifyToken(tok) {
        try {
            const raw   = atob(tok);
            const parts = raw.split('|');
            if (parts.length !== 4) return null;
            const [username, ts, rand, sig] = parts;
            const age = Date.now() - parseInt(ts, 36);
            if (age > 30 * 24 * 60 * 60 * 1000) return null;
            const expected = _ovHash(username + '|' + ts + '|' + rand + '|OV_SIG_SECRET_2025');
            if (sig !== expected) return null;
            return username;
        } catch { return null; }
    }

    window._ovVerifyToken = _ovVerifyToken;

    function getUsers() {
        try { return JSON.parse(localStorage.getItem('ov_users') || '{}'); } catch { return {}; }
    }

    function saveUsers(u) { localStorage.setItem('ov_users', JSON.stringify(u)); }

    function validateUsername(u) {
        if (u.length < 4)                       return 'Username must be at least 4 characters.';
        if (u.length > 24)                      return 'Username must be under 24 characters.';
        if (!/^[a-zA-Z0-9_]+$/.test(u))        return 'Only letters, numbers and underscores allowed.';
        if (/^[_0-9]/.test(u))                 return 'Username must start with a letter.';
        return null;
    }

    function validatePassword(p) {
        if (p.length < 8)                       return 'Password must be at least 8 characters.';
        if (!/[A-Z]/.test(p))                   return 'Password must contain an uppercase letter.';
        if (!/[0-9]/.test(p))                   return 'Password must contain a number.';
        return null;
    }

    toggleBtn.addEventListener('click', () => {
        const isPass     = passIn.type === 'password';
        passIn.type      = isPass ? 'text' : 'password';
        toggleBtn.textContent = isPass ? 'Hide' : 'Show';
    });

    switchBtn.addEventListener('click', () => {
        isLogin = !isLogin;
        authTitle.textContent   = isLogin ? 'Sign In'              : 'Create Account';
        submitBtn.textContent   = isLogin ? 'Sign In.'             : 'Create account.';
        switchBtn.textContent   = isLogin ? 'Create one here.'     : 'Login here.';
        switchLbl.textContent   = isLogin ? "Don't have an account?" : 'Already have an account?';
        hideError();
    });

    discordBtn.addEventListener('click', () => {
        const id  = '1456100190300930154';
        const uri = encodeURIComponent('https://obfusvault.xyz/dashboard/main-page/');
        window.location.href = 'https://discord.com/api/oauth2/authorize?client_id=' + id +
            '&redirect_uri=' + uri + '&response_type=code&scope=identify';
    });

    submitBtn.addEventListener('click', () => {
        hideError();
        const username = userIn.value.trim();
        const password = passIn.value;

        const uErr = validateUsername(username);
        if (uErr) return showError(uErr);

        if (!isLogin) {
            const pErr = validatePassword(password);
            if (pErr) return showError(pErr);
        } else {
            if (password.length < 1) return showError('Enter your password.');
        }

        const users    = getUsers();
        const key      = username.toLowerCase();
        const passHash = _ovHash(password + '|' + key + '|OV_PASS_SALT_2025');

        if (isLogin) {
            const stored = users[key];
            if (!stored) return showError('Account not found.');
            if (stored.hash !== passHash) return showError('Incorrect password.');
            users[key].lastLogin = Date.now();
            saveUsers(users);
        } else {
            if (users[key]) return showError('Username already taken.');
            users[key] = {
                username,
                hash:      passHash,
                created:   Date.now(),
                lastLogin: Date.now()
            };
            saveUsers(users);
        }

        const tok = _ovMakeToken(username);
        localStorage.setItem('ov_token', tok);
        localStorage.setItem('ov_user',  username);
        window.location.href = '/dashboard/main-page/';
    });

    [userIn, passIn].forEach(el => el.addEventListener('keydown', e => {
        if (e.key === 'Enter') submitBtn.click();
    }));
});
