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
    const title = savedWorkoutsDropdown.value;
    if (!title) return;
    workoutPlan = JSON.parse(JSON.stringify(allMyWorkouts[title]));
    workoutTitleInput.value = title;
    renderWorkout();
});

// ===============================
// Timer Logic
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${minutes}:${seconds}`;
}

function startTimer() {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (!workoutPlan.length) {
        alert('Please add exercises first!');
        return;
    }

    if (preStart) {
        timeLeft = 15; // pre-start countdown
        speak(`First exercise: ${workoutPlan[0].name}`);
        preStart = false;
    } else if (currentExerciseIndex < workoutPlan.length) {
        timeLeft = workoutPlan[currentExerciseIndex].duration;
    } else {
        timerDisplay.textContent = 'Finished!';
        speak('Workout complete!');
        return;
    }

    timer = setInterval(() => {
        updateTimerDisplay();

        if (timeLeft === 10 && currentExerciseIndex < workoutPlan.length - 1) {
            speak(`Next: ${workoutPlan[currentExerciseIndex + 1].name}`);
        }

        if ([3, 2, 1].includes(timeLeft)) {
            createBeep(200, 880);
        }

        if (timeLeft <= 0) {
            createBeep(500, 1200);
            clearInterval(timer);
            currentExerciseIndex++;
            if (currentExerciseIndex < workoutPlan.length) {
                startTimer();
            } else {
                timerDisplay.textContent = 'Finished!';
                speak('Workout complete!');
                preStart = true;
                currentExerciseIndex = 0;
            }
        }

        timeLeft--;
    }, 1000);
}

function pauseTimer() {
    clearInterval(timer);
}

function resetTimer() {
    clearInterval(timer);
    currentExerciseIndex = 0;
    preStart = true;
    timerDisplay.textContent = 'Ready?';
}

// ===============================
// Button Event Listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
testBeepBtn.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    createBeep();
});

// ===============================
// Initial Setup
updateSavedWorkoutsDropdown();
renderWorkout();
