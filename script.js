// ===== Word Bank (category: words) =====
const wordBank = {
  Animals: ['ELEPHANT', 'GIRAFFE', 'DOLPHIN', 'PENGUIN', 'KANGAROO', 'CHEETAH', 'OCTOPUS', 'CROCODILE'],
  Countries: ['PAKISTAN', 'GERMANY', 'CANADA', 'BRAZIL', 'JAPAN', 'EGYPT', 'AUSTRALIA', 'TURKEY'],
  Fruits: ['PINEAPPLE', 'STRAWBERRY', 'WATERMELON', 'MANGO', 'BANANA', 'POMEGRANATE', 'BLUEBERRY'],
  Sports: ['CRICKET', 'FOOTBALL', 'BADMINTON', 'SWIMMING', 'HOCKEY', 'BASKETBALL', 'VOLLEYBALL']
};

const TIME_LIMIT = 30; // seconds per word

// ===== State =====
let currentWord = '';
let currentCategory = '';
let score = 0;
let highScore = parseInt(localStorage.getItem('wordGameHighScore')) || 0;
let timeLeft = TIME_LIMIT;
let timerInterval = null;

// ===== DOM Elements =====
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const categoryLabel = document.getElementById('category-label');
const scrambledWordEl = document.getElementById('scrambled-word');
const guessInput = document.getElementById('guess-input');
const submitBtn = document.getElementById('submit-btn');
const skipBtn = document.getElementById('skip-btn');
const feedbackMessage = document.getElementById('feedback-message');
const gameCard = document.getElementById('game-card');
const timerCard = document.getElementById('timer-card');
const gameoverCard = document.getElementById('gameover-card');
const gameoverText = document.getElementById('gameover-text');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

// ===== Theme Toggle =====
if (localStorage.getItem('theme') === 'dark') {
  document.body.setAttribute('data-theme', 'dark');
  themeToggleBtn.textContent = '☀️';
}

themeToggleBtn.addEventListener('click', () => {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.body.removeAttribute('data-theme');
    themeToggleBtn.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  } else {
    document.body.setAttribute('data-theme', 'dark');
    themeToggleBtn.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  }
});

// ===== Scramble a word (guaranteed different from original) =====
function scrambleWord(word) {
  let scrambled = word;
  while (scrambled === word) {
    scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
  }
  return scrambled;
}

// ===== Pick a random word from a random category =====
function pickNewWord() {
  const categories = Object.keys(wordBank);
  currentCategory = categories[Math.floor(Math.random() * categories.length)];
  const words = wordBank[currentCategory];
  currentWord = words[Math.floor(Math.random() * words.length)];

  categoryLabel.textContent = `Category: ${currentCategory}`;
  scrambledWordEl.textContent = scrambleWord(currentWord);
  guessInput.value = '';
  feedbackMessage.textContent = '';
  feedbackMessage.className = '';
}

// ===== Update Score Display =====
function updateScoreDisplay() {
  scoreDisplay.textContent = score;
  highScoreDisplay.textContent = highScore;
}

// ===== Timer =====
function startTimer() {
  timeLeft = TIME_LIMIT;
  timerBar.style.width = '100%';
  timerBar.style.background = 'var(--accent)';
  timerText.textContent = `${timeLeft}s`;

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    timerText.textContent = `${timeLeft}s`;
    timerBar.style.width = `${(timeLeft / TIME_LIMIT) * 100}%`;

    if (timeLeft <= 10) {
      timerBar.style.background = '#e05252';
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeUp();
    }
  }, 1000);
}

// ===== Handle Correct Answer =====
function handleCorrectAnswer() {
  clearInterval(timerInterval);
  const points = 10 + timeLeft; // faster answer = more points
  score += points;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('wordGameHighScore', highScore);
  }
  updateScoreDisplay();

  feedbackMessage.textContent = `Correct! +${points} points`;
  feedbackMessage.className = 'feedback-correct';

  setTimeout(() => {
    pickNewWord();
    startTimer();
  }, 1200);
}

// ===== Handle Wrong Guess (doesn't end the word, just shakes) =====
function handleWrongGuess() {
  feedbackMessage.textContent = 'Not quite, try again!';
  feedbackMessage.className = 'feedback-wrong';
}

// ===== Handle Time Up =====
function handleTimeUp() {
    pauseMusic();
  gameCard.style.display = 'none';
  timerCard.style.display = 'none';
  gameoverCard.style.display = 'block';
  gameoverText.textContent = `The word was "${currentWord}". Your score: ${score} (Best: ${highScore})`;
}

// ===== Submit Guess =====
submitBtn.addEventListener('click', () => {
  const guess = guessInput.value.trim().toUpperCase();
  if (guess === '') return;

  if (guess === currentWord) {
    handleCorrectAnswer();
  } else {
    handleWrongGuess();
  }
});

// Allow Enter key to submit
guessInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitBtn.click();
});

// ===== Skip Word (no points, moves on immediately) =====
skipBtn.addEventListener('click', () => {
  pickNewWord();
  startTimer();
});

// ===== Restart / Next Word after Time Up =====
restartBtn.addEventListener('click', () => {
  gameoverCard.style.display = 'none';
  gameCard.style.display = 'block';
  timerCard.style.display = 'block';
  pickNewWord();
  startTimer();
  if (!musicMuted) startMusic();
});

// ===== Background Music (generated with Web Audio API) =====
const musicToggleBtn = document.getElementById('music-toggle-btn');
const musicIconOn = document.getElementById('music-icon-on');
const musicIconOff = document.getElementById('music-icon-off');

let audioCtx = null;
let musicPlaying = false;
let musicInterval = null;
let noteIndex = 0;
let musicMuted = localStorage.getItem('musicMuted') === 'true';

// Simple calm melody (C major pentatonic) + bass line
const melody = [261.63, 329.63, 392.00, 329.63, 440.00, 392.00, 329.63, 293.66];
const bassLine = [130.81, 174.61, 196.00, 130.81];

function playNote(freq, duration, type, volume) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  // Soft attack and fade-out so notes don't click
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function musicStep() {
  playNote(melody[noteIndex % melody.length], 0.5, 'sine', 0.08);
  if (noteIndex % 2 === 0) {
    playNote(bassLine[(noteIndex / 2) % bassLine.length], 0.9, 'triangle', 0.06);
  }
  noteIndex++;
}

function startMusic() {
  if (musicPlaying) return;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  musicInterval = setInterval(musicStep, 420);
  musicPlaying = true;
}

function pauseMusic() {
  clearInterval(musicInterval);
  musicPlaying = false;
}

function updateMusicIcon() {
  musicIconOn.style.display = musicMuted ? 'none' : 'block';
  musicIconOff.style.display = musicMuted ? 'block' : 'none';
}

musicToggleBtn.addEventListener('click', () => {
  if (musicPlaying) {
    pauseMusic();
    musicMuted = true;
  } else {
    startMusic();
    musicMuted = false;
  }
  localStorage.setItem('musicMuted', musicMuted);
  updateMusicIcon();
});

// Browsers block autoplay, so start the music on the first tap or key press
function startOnFirstInteraction() {
  if (!musicMuted) startMusic();
  document.removeEventListener('click', startOnFirstInteraction);
  document.removeEventListener('keydown', startOnFirstInteraction);
}
document.addEventListener('click', startOnFirstInteraction);
document.addEventListener('keydown', startOnFirstInteraction);

updateMusicIcon();

// ===== Initial Load =====
updateScoreDisplay();
pickNewWord();
startTimer();

// ===== Register Service Worker (PWA) =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('Service worker registered'))
      .catch((err) => console.error('Service worker failed:', err));
  });
}