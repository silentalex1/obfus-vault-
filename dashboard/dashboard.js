const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePassBtn = document.getElementById('toggle-pass');
const authSubmit = document.getElementById('auth-submit');
const errorMsg = document.getElementById('error-msg');
const switchModeBtn = document.getElementById('switch-mode');
const authTitle = document.getElementById('auth-title');
const toggleText = document.getElementById('toggle-text');

let isLoginMode = false;

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
    authSubmit.textContent = isLoginMode ? 'Login.' : 'Create account.';
    toggleText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
    switchModeBtn.textContent = isLoginMode ? "Create one here." : "Login here.";
    errorMsg.style.display = 'none';
});

authSubmit.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    const users = getUsers();

    errorMsg.style.display = 'none';

    if (user.length < 4) {
        errorMsg.textContent = 'username need to have more then 4 user.';
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
            alert('Welcome back, ' + user + '!');
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
            alert('Account created successfully!');
            switchModeBtn.click();
        }
    }
});
