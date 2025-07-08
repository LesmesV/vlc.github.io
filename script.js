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

// Your NEW function
function playBeep(frequency) {
    // The line that was here is now gone.
    const oscillator = audioCtx.createOscillator();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime); 
    
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
}

// --- THIS IS THE 2ND CHANGE: AN UPDATED tick FUNCTION ---
function tick() {
    if (timeRemaining > 0) {
        timeRemaining--;
        updateDisplay();

        // Play standard beeps for the countdown (at 2 and 1 seconds left)
        if (timeRemaining <= 3 && timeRemaining > 0) {
            playBeep(880); // Standard pitch
        }
    } else {
        // Timer just hit zero. Play the final, high-pitched beep.
        playBeep(1200); // Higher pitch

        // Move to the next exercise or end workout
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
    }
}

// Function to start the workout or the next exercise
function startNextExercise() {
    timeRemaining = workoutPlan[currentExerciseIndex].duration;
    updateDisplay();
}

// Main function to start the timer
function startTimer() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
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

// --- 4. EVENT LISTENERS (Connecting buttons to functions) ---
addExerciseBtn.addEventListener('click', addExercise);
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
saveWorkoutBtn.addEventListener('click', saveWorkout);
savedWorkoutsDropdown.addEventListener('change', loadSelectedWorkout);

document.addEventListener('DOMContentLoaded', populateDropdown);



