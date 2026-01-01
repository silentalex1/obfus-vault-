document.addEventListener('DOMContentLoaded', () => {
    const userIn = document.getElementById('username');
    const passIn = document.getElementById('password');
    const toggleBtn = document.getElementById('toggle-pass');
    const submitBtn = document.getElementById('auth-submit');
    const discordBtn = document.getElementById('discord-btn');
    const switchBtn = document.getElementById('switch-mode');
    const errorMsg = document.getElementById('error-msg');
    const authTitle = document.getElementById('auth-title');

    let isLogin = false;

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isPass = passIn.type === 'password';
            passIn.type = isPass ? 'text' : 'password';
            toggleBtn.textContent = isPass ? 'Hide' : 'Show';
        });
    }

    if (switchBtn) {
        switchBtn.addEventListener('click', () => {
            isLogin = !isLogin;
            authTitle.textContent = isLogin ? 'Login' : 'Create Account';
            submitBtn.textContent = isLogin ? 'Login.' : 'Create account.';
            switchBtn.textContent = isLogin ? 'Create one here.' : 'Login here.';
        });
    }

    if (discordBtn) {
        discordBtn.addEventListener('click', () => {
            const clientID = "1456100190300930154";
            const redirect = encodeURIComponent("https://obfusvault.xyz/dashboard/main-page");
            window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientID}&redirect_uri=${redirect}&response_type=code&scope=identify`;
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (userIn.value.length < 4) {
                errorMsg.style.display = 'block';
                errorMsg.textContent = 'Username must be at least 4 characters.';
                return;
            }
            window.location.href = '/dashboard/main-page';
        });
    }
});
