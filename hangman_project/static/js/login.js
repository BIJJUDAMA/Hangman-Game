function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
const csrftoken = getCookie('csrftoken');


document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('loginForm');
    var serverErrorMessageDiv = document.getElementById('serverErrorMessage');

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (serverErrorMessageDiv) serverErrorMessageDiv.textContent = '';

        const loginIdentifierInput = document.getElementById('loginIdentifierInput');
        const loginIdentifier = loginIdentifierInput.value.trim();
        const password = document.getElementById('passwordInput').value;

        let isValid = true;
        let clientSideError = '';

        if (loginIdentifier === '') {
            clientSideError = 'Please enter your email or username.';
            isValid = false;
        }

        if (password === '') {
            clientSideError = (clientSideError ? clientSideError + ' ' : '') + 'Please enter your password.';
            isValid = false;
        }

        if (!isValid) {
            form.classList.add('was-validated');
            return;
        }
        
        if (serverErrorMessageDiv) serverErrorMessageDiv.textContent = '';

        fetch('/api/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ email_or_username: loginIdentifier, password: password })
        })
        .then(response => {
            if (!response.ok) {
                
                return response.json().then(errData => {
                    throw new Error(errData.error || `Login attempt failed. Server status: ${response.status}.`);
                });
            }
            return response.json(); 
        })
        .then(data => {
            if (data.message === 'Login successful') {
                
                window.location.href = typeof gamePageUrl !== 'undefined' ? gamePageUrl : '/game/';
            } else {
                
                if (serverErrorMessageDiv) serverErrorMessageDiv.textContent = data.error || 'Login failed. Please check your credentials.';
            }
        })
        .catch(error => {
            
            if (serverErrorMessageDiv) serverErrorMessageDiv.textContent = error.message || 'An unexpected error occurred. Please try again.';
        });
    }, false);
});
