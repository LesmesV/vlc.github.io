// --- 1. GETTING ELEMENTS FROM HTML ---
const exerciseTitle = document.getElementById('exercise-title');
const countdownDisplay = document.getElementById('countdown');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const addExerciseBtn = document.getElementById('add-exercise-btn');
const exerciseInput = document.getElementById('exercise-input');
const durationInput = document.getElementById('duration-input');
const exerciseList = document.getElementById('exercise-list');
const workoutTitleInput = document.getElementById('workout-title-input');
const saveWorkoutBtn = document.getElementById('save-workout-btn');
const savedWorkoutsDropdown = document.getElementById('saved-workouts-dropdown');
const testBeepBtn = document.getElementById('test-beep-btn');

// --- 2. WORKOUT DATA AND STATE ---
let workoutPlan = [];
let currentExerciseIndex = 0;
let timeRemaining = 0;
let timerInterval = null;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
console.log('AudioContext created. Initial state:', audioCtx.state);

// --- 3. FUNCTIONS ---

function addExercise() {
    const name = exerciseInput.value.trim();
    const duration = parseInt(durationInput.value, 10);
    if (name && duration > 0) {
        workoutPlan.push({ name, duration });
        const listItem = document.createElement('li');
        listItem.textContent = `${name} (${duration}s)`;
        exerciseList.appendChild(listItem);
        exerciseInput.value = '';
        durationInput.value = '';
    }
}

function updateDisplay() {
    const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const seconds = (timeRemaining % 60).toString().padStart(2, '0');
    countdownDisplay.textContent = `${minutes}:${seconds}`;
    if (workoutPlan[currentExerciseIndex]) {
        exerciseTitle.textContent = workoutPlan[currentExerciseIndex].name;
    }
}

function playBeep(frequency) {
    console.log(`--- Playing beep (${frequency}Hz). Audio
