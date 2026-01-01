const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePassBtn = document.getElementById('toggle-pass');
const authSubmit = document.getElementById('auth-submit');
const discordBtn = document.getElementById('discord-btn');
const errorMsg = document.getElementById('error-msg');
const switchModeBtn = document.getElementById('switch-mode');
const authTitle = document.getElementById('auth-title');
const toggleText = document.getElementById('toggle-text');

let isLoginMode = false;

const CLIENT_ID = "1456100190300930154";
const REDIRECT_URI = encodeURIComponent("https://obfusvault.xyz/dashboard/main-page");
const SCOPES = "identify";
const DISCORD_AUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPES}`;

const getUsers = () => JSON.parse(localStorage.getItem('obfus_vault_accounts') || '[]');
const saveUsers = (users) => localStorage.setItem('obfus_vault_accounts', JSON.stringify(users));

togglePassBtn.addEventListener('click', () => {
    const isPass = passwordInput.type === 'password';
    passwordInput.type = isPass ? 'text' : 'password';
    togglePassBtn.textContent = isPass ? 'Hide' : 'Show';
});

switchModeBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authTitle.textContent = isLoginMode ? 'Login' : 'Create Account';
    authSubmit.textContent = isLoginMode ? 'Login' : 'Create account';
    toggleText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
    switchModeBtn.textContent = isLoginMode ? "Create one here." : "Login here.";
    errorMsg.style.display = 'none';
});

discordBtn.addEventListener('click', () => {
    window.location.href = DISCORD_AUTH_URL;
});

authSubmit.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    const users = getUsers();
    errorMsg.style.display = 'none';
    if (user.length < 4) {
        errorMsg.textContent = 'Username must be at least 4 characters.';
        errorMsg.style.display = 'block';
        return;
    }
    if (pass.length < 1) {
        errorMsg.textContent = 'Please enter a password.';
        errorMsg.style.display = 'block';
        return;
    }
    if (isLoginMode) {
        const found = users.find(u => u.username === user && u.password === pass);
        if (found) {
            window.location.href = '/dashboard/main-page';
        } else {
            errorMsg.textContent = 'Invalid username or password.';
            errorMsg.style.display = 'block';
        }
    } else {
        const exists = users.some(u => u.username === user);
        if (exists) {
            errorMsg.textContent = 'This username is already taken.';
            errorMsg.style.display = 'block';
        } else {
            users.push({ username: user, password: pass });
            saveUsers(users);
            switchModeBtn.click();
        }
    }
});
