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

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("signupForm");
    const usernameInput = document.getElementById("userNameInput");
    const emailInput = document.getElementById("userEmailInput");
    const passwordInput = document.getElementById("passwordInput");
    const confirmPasswordInput = document.getElementById("confirmPasswordInput");
    const serverErrorMessageDiv = document.getElementById("serverErrorMessage");

    function validatePasswordConfirmation() {
        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity("Passwords do not match.");
        } else {
            confirmPasswordInput.setCustomValidity("");
        }
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        event.stopPropagation();

        let isValid = true;
        let errorMessages = [];

        if (serverErrorMessageDiv) serverErrorMessageDiv.textContent = "";

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (username === "") {
            errorMessages.push("Username is required.");
            isValid = false;
        }

        if (email === "") {
            errorMessages.push("Email is required.");
            isValid = false;
        } else if (!emailRegex.test(email)) {
            errorMessages.push("Please enter a valid email address.");
            isValid = false;
        }

        if (password === "") {
            errorMessages.push("Password is required.");
            isValid = false;
        } else if (password.length < 8) {
            errorMessages.push("Password must be at least 8 characters long.");
            isValid = false;
        }

        if (confirmPassword === "") {
            errorMessages.push("Please confirm your password.");
            isValid = false;
        }

        validatePasswordConfirmation();

        if (!isValid || !form.checkValidity()) {
            if (serverErrorMessageDiv && errorMessages.length > 0) {
                serverErrorMessageDiv.textContent = errorMessages.join(" ");
            }
            form.classList.add("was-validated");
            return;
        }

        fetch("/api/signup/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrftoken
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        })
            .then(response => {
                if (!response.ok) {
                    
                    return response.json().then(errData => {
                        throw new Error(errData.error || `Signup attempt failed. Server status: ${response.status}.`);
                    });
                }
                return response.json(); 
            })
            .then(data => {
                if (data.message === 'Signup successful') {
                    window.location.href = typeof loginPageUrl !== 'undefined' ? loginPageUrl : '/login/';
                } else {

                    if (serverErrorMessageDiv) serverErrorMessageDiv.textContent = data.error || 'Signup failed. Please try again.';
                }
            })
            .catch(error => {
                if (serverErrorMessageDiv) serverErrorMessageDiv.textContent = error.message || "An unexpected error occurred during signup. Please try again.";
            });

        form.classList.add("was-validated");
    });
});
