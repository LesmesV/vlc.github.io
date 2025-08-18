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
    console.log(`--- Playing beep (${frequency}Hz). AudioContext state:`, audioCtx.state);
    const oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
}

function tick() {
    timeRemaining--;
    updateDisplay();

    if (timeRemaining === 0) {
        playBeep(1200);
        clearInterval(timerInterval);
        timerInterval = null;
        currentExerciseIndex++;
        if (currentExerciseIndex < workoutPlan.length) {
            speak(`Next exercise: ${workoutPlan[currentExerciseIndex].name}`);
            setTimeout(startTimer, 1000);
        } else {
            speak("Workout complete!");
            exerciseTitle.textContent = "Finished!";
            currentExerciseIndex = 0;
            timeRemaining = 0;
        }
    } else if (timeRemaining <= 3 && timeRemaining > 0) {
        playBeep(880);
    }
}

function startNextExercise() {
    if (workoutPlan[currentExerciseIndex]) {
        timeRemaining = workoutPlan[currentExerciseIndex].duration;
        updateDisplay();
    }
}

function startTimer() {
    console.log('startTimer called. Current AudioContext state:', audioCtx.state);
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log('AudioContext resumed successfully.');
        });
    }

    if (timerInterval || workoutPlan.length === 0) return;

    if (currentExerciseIndex === 0 && timeRemaining === 0) {
        speak(`Starting with ${workoutPlan[0].name}`);
    }
    
    startNextExercise();
    timerInterval = setInterval(tick, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    currentExerciseIndex = 0;
    if (workoutPlan.length > 0) {
        timeRemaining = workoutPlan[0].duration;
        updateDisplay();
        exerciseTitle.textContent = "Ready?";
    } else {
        timeRemaining = 0;
        exerciseTitle.textContent = "Ready?";
        countdownDisplay.textContent = "00:00";
    }
}

function speak(text) {
    console.log('Speaking:', text);
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}

function saveWorkout() {
    const title = workoutTitleInput.value.trim();
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
    if (workoutPlan.length > 0) {
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
testBeepBtn.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    playBeep(1000);
});
