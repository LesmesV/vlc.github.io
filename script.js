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

// --- 2. WORKOUT DATA AND STATE ---
let workoutPlan = []; // This will store our exercises {name, duration}
let currentExerciseIndex = 0;
let timeRemaining = 0;
let timerInterval = null; // This will hold our setInterval function
const beepSound = new Audio('https://cdn.freesound.org/previews/573/573381_13112340-lq.mp3'); // A simple beep sound

// --- 3. FUNCTIONS ---

// Function to add an exercise to the plan
function addExercise() {
    const name = exerciseInput.value;
    const duration = parseInt(durationInput.value, 10);

    if (name && duration > 0) {
        // Add to our workout data
        workoutPlan.push({ name, duration });

        // Display it on the page
        const listItem = document.createElement('li');
        listItem.textContent = `${name} (${duration}s)`;
        exerciseList.appendChild(listItem);

        // Clear the input fields
        exerciseInput.value = '';
        durationInput.value = '';
    }
}

// Function to update the timer display
function updateDisplay() {
    const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const seconds = (timeRemaining % 60).toString().padStart(2, '0');
    countdownDisplay.textContent = `${minutes}:${seconds}`;
    exerciseTitle.textContent = workoutPlan[currentExerciseIndex].name;
}

// Function that runs every second
function tick() {
    if (timeRemaining > 0) {
        timeRemaining--;
        updateDisplay();

        // Play a beep in the last 3 seconds
        if (timeRemaining <= 3 && timeRemaining > 0) {
            beepSound.play();
        }
    } else {
        // Move to the next exercise or end workout
        currentExerciseIndex++;
        if (currentExerciseIndex < workoutPlan.length) {
            // Announce the next exercise
            speak(`Next exercise: ${workoutPlan[currentExerciseIndex].name}`);
            startNextExercise();
        } else {
            // End of workout
            clearInterval(timerInterval);
            timerInterval = null;
            speak("Workout complete!");
            exerciseTitle.textContent = "Finished!";
        }
    }
}

// Function to start the workout or the next exercise
function startNextExercise() {
    timeRemaining = workoutPlan[currentExerciseIndex].duration;
    updateDisplay();
}

// Main function to start the timer
function startTimer() {
    if (timerInterval || workoutPlan.length === 0) return; // Don't start if already running or no exercises
    
    speak(`Starting with ${workoutPlan[0].name}`);
    startNextExercise();
    timerInterval = setInterval(tick, 1000); // Run the 'tick' function every 1 second
}

// Function to pause the timer
function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

// Function to reset everything
function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    workoutPlan = [];
    exerciseList.innerHTML = '';
    currentExerciseIndex = 0;
    exerciseTitle.textContent = "Ready?";
    countdownDisplay.textContent = "00:00";
}

// Function for text-to-speech announcements
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}

// --- 4. EVENT LISTENERS (Connecting buttons to functions) ---
addExerciseBtn.addEventListener('click', addExercise);
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);