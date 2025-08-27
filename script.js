// ===============================
// Workout Timer Script
// ===============================

// Workout data
let workoutPlan = [];
let currentExerciseIndex = 0;
let timer = null;
let timeLeft = 0;
let preStart = true;

// Load saved workouts from localStorage
let allMyWorkouts = JSON.parse(localStorage.getItem('allMyWorkouts')) || {};

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
    const duration = parseInt(exerciseDurationInput.value);
    if (!name || isNaN(duration) || duration < 10) {
        alert('Please enter a valid name and duration ≥ 10s.');
        return;
    }
    workoutPlan.push({ name, duration });
    exerciseNameInput.value = '';
    exerciseDurationInput.value = '';
    renderWorkout();
});

// ===============================
// Save Workout
function updateSavedWorkoutsDropdown() {
    savedWorkoutsDropdown.innerHTML = '<option value="">-- Load Saved Workout --</option>';
    Object.keys(allMyWorkouts).forEach(title => {
        const option = document.createElement('option');
        option.value = title;
        option.textContent = title;
        savedWorkoutsDropdown.appendChild(option);
    });
}

saveWorkoutBtn.addEventListener('click', () => {
    const title = workoutTitleInput.value.trim();
    if (!title) {
        alert('Please provide a workout title.');
        return;
    }
    allMyWorkouts[title] = workoutPlan;
    localStorage.setItem('allMyWorkouts', JSON.stringify(allMyWorkouts));
    updateSavedWorkoutsDropdown();
    alert('Workout saved!');
});

// ===============================
// Load Workout
savedWorkoutsDropdown.addEventListener('change', () => {
    const title = savedWorkou
