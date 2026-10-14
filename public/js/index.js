const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');
const status = document.querySelector('#status');
const loginSection = document.querySelector('#login-section');
const logoutButton = document.querySelector('#logout-button');

async function checkAuthState() {
    try {
        const response = await fetch('/api/whoami', { credentials: 'same-origin' });
        const data = await response.json();

        if (data.loggedIn) {
            status.innerHTML = '<h1>Welcome back!</h1><a href="/dashboard">Dashboard</a>';
            loginSection.hidden = true;
            logoutButton.hidden = false;
        } else {
            status.innerHTML = '<h1>Welcome!</h1>';
            loginSection.hidden = false;
            logoutButton.hidden = true;
        }
    } catch (error) {
        status.innerHTML = '<h1>Welcome!</h1>';
        loginSection.hidden = false;
        logoutButton.hidden = true;
    }
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = document.querySelector('#password').value;
    const rememberMe = new FormData(loginForm).get('rememberMe') === 'on';

    const response = await fetch('/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, rememberMe })
    });

    const data = await response.json().catch(() => ({ success: false }));

    if (data.success) {
        loginMessage.textContent = 'Login successful!';
        loginForm.reset();
        await checkAuthState();
        window.location.href = '/dashboard';
    } else {
        loginMessage.textContent = data.error || 'Login failed. Please check your password.';
    }
});

logoutButton.addEventListener('click', async () => {
    const response = await fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin'
    });

    const data = await response.json().catch(() => ({ success: false }));
    if (data.success) {
        await checkAuthState();
        window.location.href = '/';
    }
});

checkAuthState();