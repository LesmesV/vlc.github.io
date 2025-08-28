// ===============================
// Workout Timer Script
// ===============================

// Workout data
let workoutPlan = [];
let currentExerciseIndex = 0;
let timer = null;
let timeLeft = 0;
let preStart = true;

// Load saved workouts with backward compatibility
let oldWorkouts = JSON.parse(localStorage.getItem('workouts')) || [];
let allMyWorkouts = JSON.parse(localStorage.getItem('allMyWorkouts')) || {};

// Migrate old workouts if needed
if (oldWorkouts.length && Object.keys(allMyWorkouts).length === 0) {
    oldWorkouts.forEach(w => {
        allMyWorkouts[w.title] = w.exercises;
    });
    localStorage.setItem('allMyWorkouts', JSON.stringify(allMyWorkouts));
    localStorage.removeItem('workouts'); // optional: clean old key
}

// ===============================
// DOM Elements
const workoutList = document.getElementById('workout-list');
const exerciseNameInput = document.getElementById('exercise-name-input');
const exerciseDurationInput = document.getElementById('exercise-duration-input');
const addExerciseBtn = document.getElementById('add-exercise-btn');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const testBeepBtn = document.getElementById('test-beep-btn');
const workoutTitleInput = document.getElementById('workout-title-input');
const saveWorkoutBtn = document.getElementById('save-workout-btn');
const savedWorkoutsDropdown = document.getElementById('saved-workouts');

// ===============================
// Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// ===============================
// Helper Functions
function createBeep(duration = 200, frequency = 880) {
    const oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration / 1000);
}

function speak(text) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}

// ===============================
// Render Workout List
function renderWorkout() {
    workoutList.innerHTML = '';
    workoutPlan.forEach((exercise, index) => {
        const li = document.createElement('li');
        li.className = 'exercise-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'exercise-name';
        nameSpan.textContent = `${exercise.name} (${exercise.duration}s)`;

        const btnContainer = document.createElement('div');

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => {
            exerciseNameInput.value = exercise.name;
            exerciseDurationInput.value = exercise.duration;
            workoutPlan.splice(index, 1);
            renderWorkout();
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => {
            workoutPlan.splice(index, 1);
            renderWorkout();
        };

        const upBtn = document.createElement('button');
        upBtn.className = 'up-btn';
        upBtn.textContent = '↑';
        upBtn.disabled = index === 0;
        upBtn.onclick = () => {
            [workoutPlan[index - 1], workoutPlan[index]] = [workoutPlan[index], workoutPlan[index - 1]];
            renderWorkout();
        };

        const downBtn = document.createElement('button');
        downBtn.className = 'down-btn';
        downBtn.textContent = '↓';
        downBtn.disabled = index === workoutPlan.length - 1;
        downBtn.onclick = () => {
            [workoutPlan[index + 1], workoutPlan[index]] = [workoutPlan[index], workoutPlan[index + 1]];
            renderWorkout();
        };

        btnContainer.append(editBtn, deleteBtn, upBtn, downBtn);
        li.append(nameSpan, btnContainer);
        workoutList.appendChild(li);
    });
}

// ===============================
// Add Exercise
addExerciseBtn.addEventListener('click', () => {
    const name = exerciseNameInput.value.trim();
    const duration = parseInt(exerciseD
