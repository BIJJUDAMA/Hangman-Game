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


function showHowToPlayPopup() {
    const popup = document.getElementById("how-to-play-popup");
    if (!popup) return;

    popup.style.display = "flex";
    popup.style.justifyContent = "center";
    popup.style.alignItems = "center";

    popup.classList.remove('animate__fadeOut');
    popup.classList.remove('animate__faster');
    popup.classList.add('animate__fadeIn');

    const content = popup.querySelector(".popup-content");
    if (content) content.style.visibility = "visible";
}

function closeHowToPlayPopup() {
    const popup = document.getElementById("how-to-play-popup");
    if (!popup) return;

    popup.classList.remove('animate__fadeIn');
    popup.classList.add('animate__fadeOut');
    popup.classList.add('animate__faster');
  
    popup.addEventListener('animationend', function handler() {
      popup.style.display = 'none';
      popup.classList.remove('animate__fadeOut');
      popup.classList.remove('animate__faster');
      popup.removeEventListener('animationend', handler);
  
      const content = popup.querySelector('.popup-content');
      if (content) content.style.visibility = 'hidden';
    }, { once: true });
}

document.addEventListener("DOMContentLoaded", function () {
    const howToPlayBtn = document.getElementById("guide");
    if (howToPlayBtn) {
        howToPlayBtn.addEventListener("click", showHowToPlayPopup);
    }

    const closeHowToPlayBtn = document.getElementById("close-how-to-play-btn");
    if (closeHowToPlayBtn) {
        closeHowToPlayBtn.addEventListener("click", closeHowToPlayPopup);
    }

    const howToPlayGotItBtn = document.getElementById("how-to-play-got-it-btn");
    if (howToPlayGotItBtn) {
        howToPlayGotItBtn.addEventListener("click", closeHowToPlayPopup);
    }
});


document.getElementById('playGameBtn').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default link behavior
    fetch('/api/check_auth/') // Endpoint to check auth status
        .then(response => response.json())
        .then(data => {
            if (data.isAuthenticated) {
                window.location.href = "/game/";
            } else {
                window.location.href = "/login/";
            }
        })
        .catch(error => {
            console.error('Error checking auth status:', error);
            window.location.href = "/login/"; // Fallback to login
        });
});
