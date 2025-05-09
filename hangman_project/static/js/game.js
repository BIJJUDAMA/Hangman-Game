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



//! CONSTANTS & CONFIGURATION
const HINT_COST_REVEAL = 10;
const HINT_COST_REMOVE = 5;
const HINT_COST_EXTRA_GUESS = 15;



const maxWrong = 10

const qwertyRows = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
]
const allKeys = qwertyRows.flat()

//! GAME STATE VARIABLES
let selectedWord = ''
let guessedLetters = []
let wrongGuesses = 0
let currentCategory = ''
let coins = 0
let streak = 0
let gameOver = false
let allGuessedLetters = []
let level = 1
let currentXP = 0
let xpForNextLevel = 75;
let timerDuration = 0 
let timerInterval = null
let timeLeft = 0

const wordDisplay = document.getElementById('word-display')
const hangmanImg = document.getElementById('hangman-img')
const message = document.getElementById('message')
const resetBtn = document.getElementById('reset-btn')
const hintBtn = document.getElementById('hint-btn')
const numcoin = document.getElementById('numcoin')
const guessedLettersDiv = document.getElementById('guessed-letters')
const guessCounter = document.getElementById('guess-counter')
const streakDiv = document.getElementById('streak')
const keyboardDiv = document.getElementById('keyboard')
const hintCategory = document.getElementById('hint-category')
const levelDisplay = document.getElementById('level-display')
const xpDisplay = document.getElementById('xp-display')

//! UTILITY FUNCTIONS
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

//! AUTHENTICATION & INITIAL USER DATA FETCH
async function fetchAndSetInitialUserData() {
  console.log('[DEBUG] fetchAndSetInitialUserData: Function started.');
  try {
    t
    const response = await fetch('/api/get_user_profile/');
    console.log('[DEBUG] fetchAndSetInitialUserData: Raw response object:', response);

    if (!response.ok) {
      console.warn(`[DEBUG] fetchAndSetInitialUserData: Response not OK. Status: ${response.status}, StatusText: ${response.statusText}`);
      // If @login_required redirects, the browser handles it.
      // This handles other errors or if API doesn't redirect on auth failure.
      if (response.status === 401 || response.status === 403) {
        console.warn('[DEBUG] fetchAndSetInitialUserData: User not authenticated or forbidden (HTTP 401/403). Redirecting to login.');
        window.location.href = typeof loginPageUrl !== 'undefined' ? loginPageUrl : '/login/';
        return false; // Indicate failure
      }
      // Try to get a more specific error message from the response body for server errors
      let errorText = `Failed to fetch auth status: ${response.status} ${response.statusText}`;
      try {
          const errorData = await response.json(); // Or response.text() if not JSON
          if (errorData && errorData.error) { // If backend sends a JSON error
              errorText = errorData.error;
          } else if (typeof errorData === 'string' && errorData.length < 200) { // If it's a short text error
              errorText = errorData;
          }
          console.error('[DEBUG] fetchAndSetInitialUserData: Server error response body:', errorData);
      } catch (e) {
          console.warn('[DEBUG] fetchAndSetInitialUserData: Could not parse error response body.', e);
      }
      throw new Error(errorText); // This will be caught by the outer catch block
    }

    const data = await response.json();
    console.log('[DEBUG] fetchAndSetInitialUserData: Parsed data from API:', data);

    // Since @login_required protects the API, a successful response means user is authenticated.
    // The new API directly returns profile data or an error object with defaults.
    console.log('[DEBUG] fetchAndSetInitialUserData: API call successful, proceeding to set data.');
    if (data.error && data.error.includes('UserProfile not found')) {
        console.warn('[DEBUG] fetchAndSetInitialUserData: UserProfile not found on backend. API returned default values.');
    }
    coins = data.coins !== undefined ? data.coins : 0;
    streak = data.streak !== undefined ? data.streak : 0;
    level = data.level !== undefined ? data.level : 1;
    currentXP = data.xp !== undefined ? data.xp : 0;
    xpForNextLevel = calculateXPForLevel(level); // Recalculate based on fetched level
    
    // Display the username
    const usernameDisplayElement = document.getElementById('username-display');
    if (usernameDisplayElement && data.username) {
        usernameDisplayElement.textContent = ` ${data.username}`;
    }

    console.log('[SUCCESS] fetchAndSetInitialUserData: User data fetched and set from backend:', { username: data.username, coins, streak, level, currentXP, xpForNextLevel });
    return true; // Indicate success

  } catch (error) {
    console.error('[CRITICAL] fetchAndSetInitialUserData: Error in try block:', error.message, error);
    // Fallback or error display
    coins = 0; streak = 0; level = 1; currentXP = 0;
    xpForNextLevel = calculateXPForLevel(level);
    showTemporaryMessage('Could not load your progress. Starting fresh.', true); // Keep this message
    return false; // Indicate failure
  }
}

//! DATA PERSISTENCE FUNCTIONS (Backend + LocalStorage Fallback/Sync)
async function saveGameProgressToBackend() {
  try {
    const response = await fetch('/api/save_progress/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
      },
      body: JSON.stringify({
        coins: coins,
        streak: streak,
        level: level,
        xp: currentXP
      })
    });
    if (!response.ok) {
      console.error('Failed to save progress to backend:', response.statusText);
    }
  } catch (error) {
    console.error('Error saving progress to backend:', error);
  }
}

function saveCoins() {
  localStorage.setItem('hangmanCoins', coins)
  saveGameProgressToBackend();
}

function saveStreak() {
  localStorage.setItem('hangmanStreak', streak)
  saveGameProgressToBackend();
}

function saveLevelAndXP() {
  localStorage.setItem('hangmanLevel', level)
  localStorage.setItem('hangmanXP', currentXP)
  saveGameProgressToBackend();
}


//! UI UPDATE FUNCTIONS
function updateCoinDisplay() {
  console.log('[UI UPDATE] updateCoinDisplay called. Current coins:', coins);
  if (numcoin) {
    numcoin.innerHTML = '🪙: ' + coins;
  } else {
    console.error('[UI UPDATE] numcoin element not found!');
  }
}

function updateStreakDisplay() {
  console.log('[UI UPDATE] updateStreakDisplay called. Current streak:', streak);
  if (streakDiv) {
    streakDiv.innerHTML = `🔥 Streak: ${streak}`;
  } else {
    console.error('[UI UPDATE] streakDiv element not found!');
  }
}

function updateHangmanImage() {
  hangmanImg.src = `/static/images/${wrongGuesses}.png`
}

function updateGuessedLetters() {
  if (allGuessedLetters.length === 0) {
    guessedLettersDiv.textContent = ''
    return
  }

  const correct = allGuessedLetters.filter(l => selectedWord.includes(l))
  const wrong = allGuessedLetters.filter(l => !selectedWord.includes(l))
  guessedLettersDiv.innerHTML = ` ✔ ${correct
    .map(l => l.toUpperCase())
    .join(' ')} ✖ ${wrong.map(l => l.toUpperCase()).join(' ')} `
}

function updateGuessCounter() {
  let hearts = ''
  for (let i = 0; i < maxWrong - wrongGuesses; i++) {
    hearts += '❤️'
  }

  for (let i = 0; i < wrongGuesses; i++) {
    hearts += '🤍'
  }

  guessCounter.innerHTML = `Guesses Left: ${hearts}`
}

function renderKeyboard() {
  keyboardDiv.innerHTML = ''
  for (const row of qwertyRows) {
    const rowDiv = document.createElement('div')
    rowDiv.className = 'd-flex justify-content-center'
    for (const letter of row) {
      const button = document.createElement('button')
      button.className = 'key-btn'
      button.id = `key-${letter}`
      button.textContent = letter.toUpperCase()
      button.addEventListener('click', () => handleGuess(letter))
      rowDiv.appendChild(button)
    }
    keyboardDiv.appendChild(rowDiv)
  }
}

function animateWordDisplay(type) {
  wordDisplay.classList.remove('animate-correct', 'animate-wrong', 'animate-win')
  void wordDisplay.offsetWidth 
  wordDisplay.classList.add(`animate-${type}`)
}

function updateLevelDisplay() {
  console.log('[UI UPDATE] updateLevelDisplay called. Current level:', level);
  const levelOverlay = document.getElementById('level-overlay');
  if (levelOverlay) {
    levelOverlay.textContent = `Lvl: ${level}`;
  } else {
    console.error('[UI UPDATE] level-overlay element not found!');
  }
}

function updateXPDisplay() {
  console.log('[UI UPDATE] updateXPDisplay called. XP:', currentXP, 'Next Lvl XP:', xpForNextLevel);
  const xpOverlayText = document.getElementById('xp-overlay-text');
  if (xpOverlayText) {
    xpOverlayText.textContent = `XP: ${currentXP}/${xpForNextLevel}`;
  } else {
    console.error('[UI UPDATE] xp-overlay-text element not found!');
  }

  const progressBar = document.getElementById('xp-progress');
  if (progressBar) {
    const percentage = (currentXP / xpForNextLevel) * 100;
    progressBar.style.width = `${percentage}%`;
  } else {
    console.error('[UI UPDATE] xp-progress element not found!');
  }
}

function updateHintButtons() {
  const revealBtn = document.getElementById('reveal-letter-btn');
  const removeBtn = document.getElementById('remove-letter-btn');
  const extraGuessBtn = document.getElementById('extra-guess-btn');

  if (revealBtn) {
    revealBtn.disabled = coins < HINT_COST_REVEAL;
  }
  if (removeBtn) {
    removeBtn.disabled = coins < HINT_COST_REMOVE;
  }
  if (extraGuessBtn) {
    extraGuessBtn.disabled = coins < HINT_COST_EXTRA_GUESS;
  }
}

//! LEVEL & XP MANAGEMENT
function calculateXPForLevel(level) {
  if (level <= 1) return 120;

  let xp = Math.floor(120 * Math.pow(1.12, level - 1));
  let remainder = xp % 15;
  if (remainder !== 0) {
    xp += (15 - remainder);
  }
  return xp;
}

function getDifficultyForLevel(level) {
  if (level <= 7) return 'easy'
  if (level <= 14) return 'medium'
  return 'hard'
}

function checkLevelUp() {
  let leveledUp = false;
  while (currentXP >= xpForNextLevel && level < 20) {
    currentXP -= xpForNextLevel;
    level++;
    xpForNextLevel = calculateXPForLevel(level);
    leveledUp = true;
  }

  if (level >= 20) {
    level = 20;
    currentXP = xpForNextLevel; 

    saveLevelAndXP();
    updateLevelDisplay();
    updateXPDisplay();

    return leveledUp;
  }

  if (leveledUp) {
    saveLevelAndXP();
    updateLevelDisplay();
    updateXPDisplay();
  }

  return leveledUp;
}

function resetStats() {
  coins = 0
  streak = 0
  level = 1
  currentXP = 0
  xpForNextLevel = calculateXPForLevel(level)

  saveCoins()
  saveStreak()
  saveLevelAndXP()

  updateCoinDisplay()
  updateStreakDisplay()
  updateLevelDisplay()
  updateXPDisplay()
  localStorage.setItem('showStatsResetMessage', 'true');


  location.reload(); 
}

async function handleLogout() {
  try {
    const response = await fetch('/api/logout/', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken 
      }
    });
    const data = await response.json();
    if (response.ok && data.message === 'Logout successful') {
      // Clear local storage related to game state
      localStorage.removeItem('hangmanCoins');
      localStorage.removeItem('hangmanStreak');
      localStorage.removeItem('hangmanLevel');
      localStorage.removeItem('hangmanXP');
      localStorage.removeItem('hangmanTimerDuration'); 
      localStorage.removeItem('showPlayAgainMessage');
      localStorage.removeItem('showStatsResetMessage');

      window.location.href = '/login/'; 
    } else {
      showTemporaryMessage(data.error || 'Logout failed. Please try again.', true);
    }
  } catch (error) {
    console.error('Error during logout:', error);
    showTemporaryMessage('An error occurred during logout.', true);
  }
}

//! TIMER MANAGEMENT
function initTimerDisplay() {
  const timerDisplay = document.getElementById('timer-display')
  if (timerDisplay) {
    timerDisplay.addEventListener('click', showTimerPopup)
  }
}

function setTimerDuration(seconds) {
  timerDuration = seconds
  clearInterval(timerInterval)

  const timerDisplay = document.getElementById('timer-display')
  if (timerDisplay) {
    if (seconds === 0) {
      timerDisplay.textContent = '⏱️: Off'
    } else {
      timerDisplay.textContent = `⏱️: ${seconds}s`
      if (!gameOver) {
        startTimer()
      }
    }
  }

  closeTimerPopup()
}

function startTimer() {
  if (timerDuration === 0 || gameOver) return

  const timerDisplay = document.getElementById('timer-display')
  if (!timerDisplay) return

  timeLeft = timerDuration
  timerDisplay.textContent = `⏱️: ${timeLeft}s`
  clearInterval(timerInterval)

  timerInterval = setInterval(() => {
    timeLeft--
    timerDisplay.textContent = `⏱️: ${timeLeft}s`

    if (timeLeft <= 0) {
      clearInterval(timerInterval)
      if (!gameOver) {
        wrongGuesses = maxWrong
        updateHangmanImage()
        disableAllKeys()
        gameOver = true

        if (coins > 0) {
          coins = Math.max(0, coins - 5);
          updateCoinDisplay()
          saveCoins()
        }

        streak = 0
        updateStreakDisplay()
        saveStreak()

        setTimeout(() => {
          showResultPopup(false, "Time's up!")
        }, 100)
      }
    }
  }, 1000)
}

function resetTimer() {
  clearInterval(timerInterval)
  if (timerDuration > 0 && !gameOver) {
    startTimer()
  }
}

//! POPUP MANAGEMENT
function showResultPopup(isWin, customMessage = null) {
  const popup = document.getElementById('popup');
  if (!popup) return;

  const popupContainer = document.querySelector('.popup-container');
  popupContainer.style.display = 'block';
  popupContainer.classList.remove('animate__fadeOut');
  popupContainer.classList.add('animate__fadeIn');

  const title = document.getElementById('popup-title');
  const messageEl = document.getElementById('popup-message');
  const popupCoins = document.getElementById('popup-coins');
  const popupStreak = document.getElementById('popup-streak');
  const popupLevel = document.getElementById('popup-level');
  const popupXP = document.getElementById('popup-xp');

  if (title) {
    title.textContent = isWin ? 'You Won!' : 'Game Over';
    title.style.color = isWin ? 'var(--color-correct)' : 'var(--color-wrong)';
  }

  if (popupCoins) popupCoins.textContent = coins;
  if (popupStreak) popupStreak.textContent = streak;
  if (popupLevel) popupLevel.textContent = level;
  if (popupXP) popupXP.textContent = `${currentXP}/${xpForNextLevel}`;

  if (messageEl) {
    if (customMessage !== null) {
      messageEl.innerHTML = customMessage;
    } else {
      messageEl.innerHTML = isWin
        ? `Correct! The word was <b>${selectedWord.toUpperCase()}</b>`
        : `Sorry! The word was <b>${selectedWord.toUpperCase()}</b>`;
    }
  }

  popup.style.display = 'flex';
  popup.style.justifyContent = 'center';
  popup.style.alignItems = 'center';

  const content = popup.querySelector('.popup-content');
  if (content) content.style.visibility = 'visible';

  clearInterval(timerInterval);
}

function closeResultPopup() {
  const popup = document.getElementById('popup');
  if (!popup) return;

  const popupContainer = document.querySelector('.popup-container');
 
  popupContainer.classList.remove('animate__fadeIn');
  popupContainer.classList.add('animate__fadeOut');

 
  popupContainer.addEventListener('animationend', function handler() {
    popupContainer.style.display = 'none';
    popupContainer.classList.remove('animate__fadeOut');
    popupContainer.removeEventListener('animationend', handler);

    popup.style.display = 'none';
    const content = popup.querySelector('.popup-content');
    if (content) content.style.visibility = 'hidden';
    initGame();
  }, { once: true });
}

function showTemporaryMessage(text, isError = false) {
  if (!message) return;

  message.textContent = text;
  message.style.color = isError ? 'var(--color-wrong)' : 'var(--color-correct)';
  message.classList.remove('animate__fadeIn', 'animate__fadeOut', 'animate__animated');

  void message.offsetWidth;

  message.classList.add('animate__animated', 'animate__fadeIn');

  setTimeout(() => {
    message.classList.remove('animate__fadeIn');
    message.classList.add('animate__fadeOut');

    message.addEventListener('animationend', function handler() {
      message.textContent = '';
      message.classList.remove('animate__fadeOut', 'animate__animated');
      message.removeEventListener('animationend', handler);
    });
  }, 2200);
}



function showConfirmPopup(titleText, messageText, onConfirm) { 
  const popup = document.getElementById('popup');
  if (!popup) return; 
  popup.classList.remove('animate__fadeOut', 'animate__faster');
  popup.classList.add('animate__fadeIn');

  const popupTitle = document.getElementById('popup-title');
  const popupMessage = document.getElementById('popup-message');
  const continueBtn = document.getElementById('popup-continue');
  const closeBtn = document.querySelector('.close-popup');
  const statsSection = document.querySelector('.popup-stats');

  if (popupTitle) popupTitle.textContent = titleText;
  if (popupTitle) popupTitle.style.color = 'var(--color-primary)';
  if (popupMessage) popupMessage.textContent = messageText;

  if (statsSection) statsSection.style.display = 'none';

  if (continueBtn) {
    continueBtn.textContent = 'Yes';
    continueBtn.style.backgroundColor = 'var(--color-correct)';
  }

  let noBtn = document.getElementById('no-btn');
  if (!noBtn && continueBtn) { 
    noBtn = document.createElement('button');
    noBtn.id = 'no-btn';
    noBtn.className = 'popup-btn';
    noBtn.style.marginLeft = '10px';
    noBtn.style.backgroundColor = 'var(--color-wrong)';
    noBtn.textContent = 'No';
    continueBtn.parentNode.appendChild(noBtn);
  } else if (noBtn) {
    noBtn.style.display = 'inline-block';
  }

  popup.style.display = 'flex';
  popup.style.justifyContent = 'center';
  popup.style.alignItems = 'center';

  const content = popup.querySelector('.popup-content');
  if (content) content.style.visibility = 'visible';

  
  function fadeOutAndHidePopup() {    
    popup.classList.remove('animate__fadeIn');
    popup.classList.add('animate__fadeOut', 'animate__faster');

    popup.addEventListener('animationend', function handler() {
      popup.style.display = 'none';
      popup.classList.remove('animate__fadeOut', 'animate__faster');
      popup.removeEventListener('animationend', handler);

      if (content) content.style.visibility = 'hidden';

      if (statsSection) statsSection.style.display = 'block'; 
        if (continueBtn) {
          continueBtn.textContent = 'Continue';
          continueBtn.style.backgroundColor = 'var(--color-primary)';
        }
        if (noBtn) noBtn.style.display = 'none';
      }, { once: true });
  }

  if (continueBtn) {
    continueBtn.onclick = function () {
      onConfirm();
      fadeOutAndHidePopup();
    };
  }

  if (noBtn) {
    noBtn.onclick = fadeOutAndHidePopup;
  }

  if (closeBtn) {
    closeBtn.onclick = fadeOutAndHidePopup;
  }
}


function showTimerPopup() {
  const popup = document.getElementById('timer-popup');
  if (!popup) return;

  popup.style.display = 'flex';
  popup.style.justifyContent = 'center';
  popup.style.alignItems = 'center';

  
  popup.classList.remove('animate__fadeOut');
  popup.classList.remove('animate__faster');
  popup.classList.add('animate__fadeIn');

  const content = popup.querySelector('.popup-content');
  if (content) content.style.visibility = 'visible';
}

function closeTimerPopup() {
  const popup = document.getElementById('timer-popup');
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

function showHowToPlayPopup() {
  const popup = document.getElementById('how-to-play-popup')
  if (!popup) return

  
  popup.style.display = 'flex'
  popup.style.justifyContent = 'center'
  popup.style.alignItems = 'center'

  popup.classList.remove('animate__fadeOut');
  popup.classList.remove('animate__faster');
  popup.classList.add('animate__fadeIn');

  const content = popup.querySelector('.popup-content')
  if (content) content.style.visibility = 'visible'
}

function closeHowToPlayPopup() {
  const popup = document.getElementById('how-to-play-popup')
  if (!popup) return

  popup.classList.remove('animate__fadeIn');
  popup.classList.add('animate__fadeOut');
  popup.classList.add('animate__faster');

  popup.addEventListener('animationend', function handler() {
    popup.style.display = 'none';
    popup.classList.remove('animate__fadeOut');
    popup.classList   .remove('animate__faster');
    popup.removeEventListener('animationend', handler);

    const content = popup.querySelector('.popup-content');
    if (content) content.style.visibility = 'hidden';
  }, { once: true });
}

function showGameCompletePopup(word) {
  const popup = document.getElementById('popup');
  if (!popup) return;

  popup.classList.remove('animate__fadeOut');
  popup.classList.remove('animate__faster');
  popup.classList.add('animate__fadeIn');

  const title = document.getElementById('popup-title');
  const messageEl = document.getElementById('popup-message'); 
  const statsSection = document.querySelector('.popup-stats');
  const continueBtn = document.getElementById('popup-continue');
  const closeBtn = document.getElementById('close-popup');
  if (closeBtn) {
    closeBtn.style.display = 'none';
  }

  if (statsSection) statsSection.style.display = 'none'; 

  if (title) {
    title.textContent = "🎉 Game Complete!";
    title.style.color = "var(--color-primary)";
  }

  if (messageEl) {
    messageEl.innerHTML = `
      <div style="font-size:1.2em; margin-bottom:10px;">
        Correct! The word was <b>${word ? word.toUpperCase() : ''}</b>
      </div>
      <div style="margin-bottom:8px;">You have reached level 20</div>
      <div style="font-weight:bold; color:#388e8e; margin-bottom:8px;">
        You have completed the game!
      </div>
      <div style="margin-bottom:8px; color:#388e8e;">
        <b>Note:</b> Your current streak will <b>not</b> be reset. Keep playing to increase your streak!
      </div>
    `;
  }

  if (continueBtn) {
    continueBtn.textContent = "Play Again";
    continueBtn.style.backgroundColor = "var(--color-primary)";
    continueBtn.onclick = function () {

      coins = 0; 
      level = 1;
      currentXP = 0;
      xpForNextLevel = calculateXPForLevel(level);
      saveCoins();
      saveLevelAndXP();

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

      updateCoinDisplay();
      updateStreakDisplay();
      updateLevelDisplay();
      updateXPDisplay();
      localStorage.setItem('showPlayAgainMessage', 'true');
      location.reload(); 
    };
  }

 
  
  popup.style.display = 'flex';
  popup.style.justifyContent = 'center';
  popup.style.alignItems = 'center';
  const content = popup.querySelector('.popup-content');
  if (content) content.style.visibility = 'visible';



  clearInterval(timerInterval); 
}

function showHintPopup() {
  updateHintButtons();
  const popup = document.getElementById('hint-popup');
  if (!popup) return;
  popup.style.display = 'flex';

  popup.classList.remove('animate__fadeOut');
  popup.classList.remove('animate__faster');
  popup.classList.add('animate__fadeIn');

  const content = popup.querySelector('.popup-content');
  if (content) content.style.visibility = 'visible';
}

function closeHintPopup() {
  const popup = document.getElementById('hint-popup');
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


//! CORE GAME LOGIC

async function initGame() { 
  guessedLetters = [];
  allGuessedLetters = [];
  wrongGuesses = 0;
  gameOver = false;
  if (message) {
    message.textContent = '';
    message.style.color = '#333333'; 
  }

  try {
    const response = await fetch('/api/get_word/');
    if (!response.ok) {
      let errorMsg = `HTTP error! status: ${response.status}`;
      try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
      } catch (e) { /* Ignore if response isn't JSON */ }
      throw new Error(errorMsg);
    }
    const data = await response.json();
    if (data.error) {
      if (message) {
        message.textContent = data.error;
        message.style.color = 'var(--color-wrong)';
      }
      disableAllKeys();
      if (hintBtn) hintBtn.disabled = true;
      return;
    }
    selectedWord = data.word.toLowerCase();
    currentCategory = data.category;

    if (!selectedWord || selectedWord.trim() === '') {
      if (message) {
        message.textContent = 'No word received from server. Please try a new game.';
        message.style.color = 'var(--color-wrong)';
      }
      disableAllKeys();
      if (hintBtn) hintBtn.disabled = true;
      return;
    }
  } catch (error) {
    console.error('Failed to fetch word:', error);
    if (message) {
      message.textContent = error.message || 'Could not load a new word. Please try again.';
      message.style.color = 'var(--color-wrong)';
    }
    disableAllKeys();
    if (hintBtn) hintBtn.disabled = true;
    return; // Stop further execution if word fetch fails
  }

  // Only proceed if a word was successfully fetched
  if (hintCategory) hintCategory.textContent = capitalize(currentCategory);
  if (hintBtn) hintBtn.disabled = false

  updateCoinDisplay()
  updateStreakDisplay()
  updateLevelDisplay()
  updateXPDisplay()
  updateWordDisplay() 
  updateHangmanImage()
  updateGuessedLetters() 
  updateGuessCounter()
  renderKeyboard()

  resetTimer() 
}

function updateWordDisplay() {
  let wordArray = []
  for (let letter of selectedWord) {
    if (guessedLetters.includes(letter)) {
      wordArray.push(letter.toUpperCase())
    } else {
      wordArray.push('_')
    }
  }
  wordDisplay.textContent = wordArray.join(' ')
  wordDisplay.classList.add('letter-spacing')

  if (selectedWord && selectedWord.length > 0 && !wordArray.includes('_') && !gameOver) { 
    streak += 1
    currentXP += 15
    updateCoinDisplay()
    saveCoins()
    updateStreakDisplay()
    saveStreak()
    updateXPDisplay()
    const didLevelUp = checkLevelUp();
    disableAllKeys()
    gameOver = true
    animateWordDisplay('win')

    if (level === 20) {
      setTimeout(() => {
        showGameCompletePopup(selectedWord); // Special popup for level 20 completion
      }, 100);
      return;
    }

    let finalPopupMessage = null;
    if (didLevelUp) {
      finalPopupMessage = `Congratulations! You guessed <b>${selectedWord.toUpperCase()}</b> correctly and reached Level <b>${level}!</b>`;
    }

    setTimeout(() => {

      showResultPopup(true, finalPopupMessage); // Regular win popup
    }, 100);
  }
}

function handleGuess(letter) {
  if (gameOver) return
  const button = document.getElementById(`key-${letter}`)
  if (!button || guessedLetters.includes(letter) || button.disabled) return 

  guessedLetters.push(letter)
  allGuessedLetters.push(letter)

  if (selectedWord.includes(letter)) {
    button.classList.add('correct')
    updateWordDisplay()
    animateWordDisplay('correct')
  } else {
    button.classList.add('wrong')
    wrongGuesses++
    updateHangmanImage()
    animateWordDisplay('wrong')

    if (wrongGuesses >= maxWrong && !gameOver) {
      if (coins > 0) {
        coins = Math.max(0, coins - 5);
        updateCoinDisplay()
        saveCoins()
      }
      streak = 0
      updateStreakDisplay()
      saveStreak()
      disableAllKeys()
      gameOver = true

      setTimeout(() => {
        showResultPopup(false) // Lose popup
      }, 100)
    }
  }

  button.classList.add('used')
  button.disabled = true
  updateGuessedLetters()
  updateGuessCounter()
}

function disableAllKeys() {
  for (const letter of allKeys) {
    const btn = document.getElementById(`key-${letter}`)
    if (btn) {
      btn.disabled = true
      btn.classList.add('used')
    }
  }
}

//! EVENT LISTENERS & INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => { 
  const userDataFetched = await fetchAndSetInitialUserData();

  if (userDataFetched) { // Only proceed if user data was successfully fetched and user is authenticated
    initTimerDisplay();
    initGame(); // This will use the globally set coins, streak, etc. from the backend
  }

  if (localStorage.getItem('showPlayAgainMessage') === 'true') {
    showTemporaryMessage('All Stats except Streak have been reset', false);
    localStorage.removeItem('showPlayAgainMessage');
  }

  if (localStorage.getItem('showStatsResetMessage') === 'true') {
    showTemporaryMessage('Stats have been reset!', false);
    localStorage.removeItem('showStatsResetMessage');
  }

  const closeHintPopupBtn = document.getElementById('close-hint-popup');
  if (closeHintPopupBtn) {
    closeHintPopupBtn.addEventListener('click', closeHintPopup);
  }

  const closePopupBtn = document.getElementById('close-popup')
  if (closePopupBtn) {
    closePopupBtn.addEventListener('click', closeResultPopup)
  }

  const continueBtn = document.getElementById('popup-continue')
  if (continueBtn) {
    continueBtn.addEventListener('click', closeResultPopup)
  }

  const closeTimerPopupBtn = document.getElementById('close-timer-popup')
  if (closeTimerPopupBtn) {
    closeTimerPopupBtn.addEventListener('click', closeTimerPopup)
  }

  const timer10Btn = document.getElementById('timer-10')
  if (timer10Btn) {
    timer10Btn.addEventListener('click', () => setTimerDuration(10))
  }

  const timer15Btn = document.getElementById('timer-15')
  if (timer15Btn) {
    timer15Btn.addEventListener('click', () => setTimerDuration(15))
  }

  const timer20Btn = document.getElementById('timer-20')
  if (timer20Btn) {
    timer20Btn.addEventListener('click', () => setTimerDuration(20))
  }

  const timerOffBtn = document.getElementById('timer-off')
  if (timerOffBtn) {
    timerOffBtn.addEventListener('click', () => setTimerDuration(0))
  }

  const howToPlayBtn = document.getElementById('how-to-play-btn')
  if (howToPlayBtn) {
    howToPlayBtn.addEventListener('click', showHowToPlayPopup)
  }

  const closeHowToPlayBtn = document.getElementById('close-how-to-play-btn');
  if (closeHowToPlayBtn) {
    closeHowToPlayBtn.addEventListener('click', closeHowToPlayPopup);
  }

  const howToPlayGotItBtn = document.getElementById('how-to-play-got-it-btn');
  if (howToPlayGotItBtn) {
    howToPlayGotItBtn.addEventListener('click', closeHowToPlayPopup);
  }
  
  

  if (resetBtn) {
    resetBtn.addEventListener('click', () => initGame())
  }

  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      if (gameOver) return;
      showHintPopup();
    });
  }

  const resetStatsBtn = document.getElementById('reset-stats-btn')
  if (resetStatsBtn) {
    resetStatsBtn.addEventListener('click', () => {
      showConfirmPopup(
        'Reset Stats',
        'Are you sure you want to reset your stats (coins, streak, level, XP)? This cannot be undone.',
        resetStats
      )
    })
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  document.addEventListener('keydown', e => {
    if (gameOver) return
    let key = e.key.toLowerCase()
    if (allKeys.includes(key)) {
      handleGuess(key)
    }
  })

  const revealLetterBtn = document.getElementById('reveal-letter-btn');
  if (revealLetterBtn) {
    revealLetterBtn.onclick = function () {
      if (coins < HINT_COST_REVEAL) {
        showTemporaryMessage('Not enough coins for this hint.', true);
        return;
      }
      const unrevealed = selectedWord.split('').filter(l => !guessedLetters.includes(l));
      if (unrevealed.length === 0) {
        showTemporaryMessage('All letters already revealed!', true);
        return;
      }
      const letter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      handleGuess(letter);
      coins -= HINT_COST_REVEAL;
      saveCoins();
      updateCoinDisplay();
      showTemporaryMessage(`A letter was revealed: ${letter.toUpperCase()}`, false);
      closeHintPopup();
    };
  }
  const removeLetterBtn = document.getElementById('remove-letter-btn');
  if (removeLetterBtn) {
    removeLetterBtn.onclick = function () {
      if (coins < HINT_COST_REMOVE) {
        showTemporaryMessage('Not enough coins for this hint.', true);
        return;
      }
      const allLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
      const possible = allLetters.filter(l =>
        !selectedWord.includes(l) && !guessedLetters.includes(l)
      );
      if (possible.length === 0) {
        showTemporaryMessage('No incorrect letters left to remove or all non-word letters already used!', true);
        return;
      }
      const availableToDisable = possible.filter(l => {
        const keyBtn = document.getElementById(`key-${l}`);
        return keyBtn && !keyBtn.disabled;
      });

      if (availableToDisable.length === 0) {
        showTemporaryMessage('No incorrect, available letters left to remove!', true);
        return;
      }

      const letter = availableToDisable[Math.floor(Math.random() * availableToDisable.length)];
      const btn = document.getElementById(`key-${letter}`);
      if (btn) {
        btn.disabled = true;
        btn.classList.add('powerup-removed');
      }
      allGuessedLetters.push(letter);
      updateGuessedLetters();
      showTemporaryMessage(`An incorrect letter (${letter.toUpperCase()}) was removed.`, false);
      coins = Math.max(0, coins - HINT_COST_REMOVE);
      saveCoins();
      updateCoinDisplay();
      closeHintPopup();
    };
  }
  const extraGuessBtn = document.getElementById('extra-guess-btn');
  if (extraGuessBtn) {
    extraGuessBtn.onclick = function () {
      if (coins < HINT_COST_EXTRA_GUESS) {
        showTemporaryMessage('Not enough coins for this hint.', true);
        return;
      }
      if (wrongGuesses <= 0) {
        showTemporaryMessage('You have not made any wrong guesses yet!', true);
        return;
      }
      if (wrongGuesses >= maxWrong) {
        showTemporaryMessage('Game is already over!', true);
        return;
      }
      wrongGuesses = Math.max(0, wrongGuesses - 1);
      updateHangmanImage();
      updateGuessCounter();
      showTemporaryMessage('You gained an extra guess!', false);
      coins -= HINT_COST_EXTRA_GUESS;
      saveCoins();
      updateCoinDisplay();
      closeHintPopup();
    };
  }


})
