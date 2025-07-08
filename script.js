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
    exerciseTitle.textContent = workoutPlan[currentExerciseIndex].name;
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
    // This function now correctly handles the timer logic without lag
    timeRemaining--;
    updateDisplay();

    if (timeRemaining === 0) {
        playBeep(1200); // High-pitched beep at zero

        currentExerciseIndex++;
        if (currentExerciseIndex < workoutPlan.length) {
            speak(`Next exercise: ${workoutPlan[currentExerciseIndex].name}`);
            startNextExercise();
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            speak("Workout complete!");
            exerciseTitle.textContent = "Finished!";
        }
    } else if (timeRemaining <= 3 && timeRemaining > 0) {
        playBeep(880); // Standard countdown beeps
    }
}

function startNextExercise() {
    timeRemaining = workoutPlan[currentExerciseIndex].duration;
    updateDisplay();
}

function startTimer() {
    // This function correctly resumes audio and adds the necessary delay
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    if (timerInterval || workoutPlan.length === 0) return;
    
    speak(`Starting with ${workoutPlan[0].name}`);
    startNextExercise();
    
    // This setTimeout is crucial and was missing from your last file
    setTimeout(() => {
        timerInterval = setInterval(tick, 1000);
    }, 500); // 500ms delay
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

// --- FINAL TEST FOR BEEP ---
const testBeepBtn = document.getElementById('test-beep-btn');

if (testBeepBtn) { // Check if the button exists before adding listener
    testBeepBtn.addEventListener('click', () => {
        console.log('Test Beep button clicked.');
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        playBeep(880);
    });
}
