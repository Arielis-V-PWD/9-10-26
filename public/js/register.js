const message = document.querySelector('#register-message');

document.querySelector('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    message.textContent = '';

    const username = document.querySelector('#username').value;
    const password = document.querySelector('#password').value;
    const confirm = document.querySelector('#confirm').value;

    if (password !== confirm) {
        message.textContent = 'Passwords do not match.';
        return;
    }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            message.textContent = data.error || 'Could not create your account.';
            return;
        }
        window.location.href = '/guestbook';
    } catch (err) {
        message.textContent = 'Could not reach the server. Check your connection.';
    }
});
