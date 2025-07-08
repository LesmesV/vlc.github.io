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

// --- 2. WORKOUT DATA AND STATE ---
let workoutPlan = []; // This will store our exercises {name, duration}
let currentExerciseIndex = 0;
let timeRemaining = 0;
let timerInterval = null; // This will hold our setInterval function
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- 3. FUNCTIONS ---

function addExercise() {
    const name = exerciseInput.value;
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

    // Ensure there's a valid exercise to display a title for
    if (workoutPlan[currentExerciseIndex]) {
        exerciseTitle.textContent = workoutPlan[currentExerciseIndex].name;
    }
}

function playBeep(frequency) {
    const oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
}

function tick() {
    if (timeRemaining > 0) {
        // Countdown beeps
        if (timeRemaining <= 4 && timeRemaining > 1) { // Beeps when display is 3, 2, 1
            playBeep(880); // Standard pitch
        }
        timeRemaining--;
        updateDisplay();
    } else {
        // Timer hits zero
        clearInterval(timerInterval); // Stop the current timer
        timerInterval = null;
        
        playBeep(1200); // Play final high-pitched beep

        // Move to the next exercise
        currentExerciseIndex++;
        if (currentExerciseIndex < workoutPlan.length) {
            // Announce and start the next exercise after a short delay
            speak(`Next exercise: ${workoutPlan[currentExerciseIndex].name}`);
            setTimeout(startTimer, 1000); // Start the next timer after 1 second
        } else {
            // End of workout
            speak("Workout complete!");
            exerciseTitle.textContent = "Finished!";
        }
    }
}

function startNextExercise() {
    if (workoutPlan[currentExerciseIndex]) {
        timeRemaining = workoutPlan[currentExerciseIndex].duration;
        updateDisplay();
    }
}

function startTimer() {
    // Resume audio context if needed
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (timerInterval || workoutPlan.length === 0) return;

    // Announce the start only for the very first exercise
    if (currentExerciseIndex === 0 && timeRemaining === 0) {
        speak(`Starting with ${workoutPlan[0].name}`);
    }
    
    startNextExercise();

    // Start the timer interval
    timerInterval = setInterval(tick, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    workoutPlan = [];
    exerciseList.innerHTML = '';
    currentExerciseIndex = 0;
    timeRemaining = 0; // Reset time
    exerciseTitle.textContent = "Ready?";
    countdownDisplay.textContent = "00:00";
}

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}

function saveWorkout() {
    const title = workoutTitleInput.value;
    if (!title || workoutPlan.length === 0) {
        alert("Please enter a title and add at least one exercise.");
        return;
    }

    const allWorkouts = JSON.parse(localStorage.getItem('allMyWorkouts')) || {};
    allWorkouts[title] = workoutPlan;
    localStorage.setItem('allMyWorkouts', JSON.stringify(allWorkouts));

    alert(`Workout "${title}" saved!`);
    populateDropdown();
    workoutTitleInput.value = '';
}

function populateDropdown() {
    const allWorkouts = JSON.parse(localStorage.getItem('allMyWorkouts')) || {};
    savedWorkoutsDropdown.innerHTML = '<option value="">--- Load a Saved Workout ---</option>';

    for (const title in allWorkouts) {
        const option = document.createElement('option');
        option.value = title;
        option.textContent = title;
        savedWorkoutsDropdown.appendChild(option);
    }
}

function loadSelectedWorkout() {
    const selectedTitle = savedWorkoutsDropdown.value;
    if (!selectedTitle) {
        resetTimer();
        return;
    }

    const allWorkouts = JSON.parse(localStorage.getItem('allMyWorkouts'));
    const selectedPlan = allWorkouts[selectedTitle];

    workoutPlan = selectedPlan;
    currentExerciseIndex = 0;

    exerciseList.innerHTML = '';
    workoutPlan.forEach(exercise => {
        const listItem = document.createElement('li');
        listItem.textContent = `${exercise.name} (${exercise.duration}s)`;
        exerciseList.appendChild(listItem);
    });

    if(workoutPlan.length > 0) {
        timeRemaining = workoutPlan[0].duration;
        updateDisplay();
    }
}

// --- 4. EVENT LISTENERS ---
addExerciseBtn.addEventListener('click', addExercise);
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
saveWorkoutBtn.addEventListener('click', saveWorkout);
savedWorkoutsDropdown.addEventListener('change', loadSelectedWorkout);

document.addEventListener('DOMContentLoaded', populateDropdown);
