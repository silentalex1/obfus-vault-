document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('ov_token')) {
        window.location.href = '/dashboard/main-page/';
        return;
    }

    const userIn = document.getElementById('username');
    const passIn = document.getElementById('password');
    const toggleBtn = document.getElementById('toggle-pass');
    const submitBtn = document.getElementById('auth-submit');
    const discordBtn = document.getElementById('discord-btn');
    const switchBtn = document.getElementById('switch-mode');
    const switchLabel = document.getElementById('switch-label');
    const errorMsg = document.getElementById('error-msg');
    const authTitle = document.getElementById('auth-title');

    let isLogin = true;

    const showError = (msg) => {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    };

    const hideError = () => {
        errorMsg.style.display = 'none';
    };

    toggleBtn.addEventListener('click', () => {
        const isPass = passIn.type === 'password';
        passIn.type = isPass ? 'text' : 'password';
        toggleBtn.textContent = isPass ? 'Hide' : 'Show';
    });

    switchBtn.addEventListener('click', () => {
        isLogin = !isLogin;
        authTitle.textContent = isLogin ? 'Sign In' : 'Create Account';
        submitBtn.textContent = isLogin ? 'Sign In.' : 'Create account.';
        switchBtn.textContent = isLogin ? 'Create one here.' : 'Login here.';
        switchLabel.textContent = isLogin ? "Don't have an account?" : 'Already have an account?';
        hideError();
    });

    discordBtn.addEventListener('click', () => {
        const clientID = '1456100190300930154';
        const redirect = encodeURIComponent('https://obfusvault.xyz/dashboard/main-page/');
        window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientID}&redirect_uri=${redirect}&response_type=code&scope=identify`;
    });

    submitBtn.addEventListener('click', async () => {
        hideError();
        const username = userIn.value.trim();
        const password = passIn.value;

        if (username.length < 4) return showError('Username must be at least 4 characters.');
        if (password.length < 6) return showError('Password must be at least 6 characters.');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading...';

        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                showError(data.error || 'Something went wrong.');
                submitBtn.disabled = false;
                submitBtn.textContent = isLogin ? 'Sign In.' : 'Create account.';
                return;
            }

            localStorage.setItem('ov_token', data.token);
            localStorage.setItem('ov_user', data.username);
            window.location.href = '/dashboard/main-page/';
        } catch {
            showError('Connection failed. Is the server running?');
            submitBtn.disabled = false;
            submitBtn.textContent = isLogin ? 'Sign In.' : 'Create account.';
        }
    });

    [userIn, passIn].forEach(el => el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitBtn.click();
    }));
});
