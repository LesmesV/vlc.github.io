document.addEventListener("DOMContentLoaded", () => {
    // --- ELEMENTS ---
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

    // --- STATE ---
    let workoutPlan = [];
    let currentExerciseIndex = 0;
    let timeRemaining = 0;
    let timerInterval = null;
    const PRE_START_DURATION = 15; // seconds before first exercise
    let preStartMode = false;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // --- FUNCTIONS ---

    function addExercise() {
        const name = exerciseInput.value.trim();
        const duration = parseInt(durationInput.value, 10);
        if (name && duration > 10) { // enforce >10s
            workoutPlan.push({ name, duration });
            renderExerciseList();
            exerciseInput.value = '';
            durationInput.value = '';
        } else {
            alert("Exercises must be at least 10 seconds long.");
        }
    }

    function renderExerciseList() {
        exerciseList.innerHTML = '';
        workoutPlan.forEach((exercise, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = `${exercise.name} (${exercise.duration}s)`;

            // Button container
            const actions = document.createElement('div');
            actions.classList.add('exercise-actions');

            // Edit button
            const editBtn = document.createElement('button');
            editBtn.textContent = "Edit";
            editBtn.classList.add('edit-btn');
            editBtn.onclick = () => editExercise(index);

            // Delete button
            const delBtn = document.createElement('button');
            delBtn.textContent = "Delete";
            delBtn.classList.add('delete-btn');
            delBtn.onclick = () => deleteExercise(index);

            // Up button
            const upBtn = document.createElement('button');
            upBtn.textContent = "↑";
            upBtn.classList.add('up-btn');
            upBtn.onclick = () => moveExerciseUp(index);
            if (index === 0) upBtn.disabled = true; // disable at top

            // Down button
            const downBtn = document.createElement('button');
            downBtn.textContent = "↓";
            downBtn.classList.add('down-btn');
            downBtn.onclick = () => moveExerciseDown(index);
            if (index === workoutPlan.length - 1) downBtn.disabled = true; // disable at bottom

            // Append buttons
            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
            actions.appendChild(upBtn);
            actions.appendChild(downBtn);

            listItem.appendChild(actions);
            exerciseList.appendChild(listItem);
        });
    }

    function editExercise(index) {
        const ex = workoutPlan[index];
        exerciseInput.value = ex.name;
        durationInput.value = ex.duration;
        workoutPlan.splice(index, 1); // remove old entry
        renderExerciseList();
    }

    function deleteExercise(index) {
        workoutPlan.splice(index, 1);
        renderExerciseList();
    }

    function moveExerciseUp(index) {
        if (index > 0) {
            [workoutPlan[index - 1], workoutPlan[index]] = [workoutPlan[index], workoutPlan[index - 1]];
            renderExerciseList();
        }
    }

    function moveExerciseDown(index) {
        if (index < workoutPlan.length - 1) {
            [workoutPlan[index + 1], workoutPlan[index]] = [workoutPlan[index], workoutPlan[index + 1]];
            renderExerciseList();
        }
    }

    function updateDisplay() {
        const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        const seconds = (timeRemaining % 60).toString().padStart(2, '0');
        countdownDisplay.textContent = `${minutes}:${seconds}`;
        if (!preStartMode && workoutPlan[currentExerciseIndex]) {
            exerciseTitle.textContent = workoutPlan[currentExerciseIndex].name;
        } else if (preStartMode) {
            exerciseTitle.textContent = "Get Ready!";
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
        timeRemaining--;
        updateDisplay();

        if (preStartMode) {
            if (timeRemaining === PRE_START_DURATION - 1) {
                speak(`First exercise: ${workoutPlan[0].name}`);
            }
            if (timeRemaining <= 3 && timeRemaining > 0) {
                playBeep(880);
            }
            if (timeRemaining === 0) {
                playBeep(1200);
                clearInterval(timerInterval);
                preStartMode = false;
                currentExerciseIndex = 0;
                startTimer();
            }
            return;
        }

        // During exercises
        if (timeRemaining === 10 && currentExerciseIndex + 1 < workoutPlan.length) {
            speak(`Next exercise: ${workoutPlan[currentExerciseIndex + 1].name}`);
        }
        if (timeRemaining <= 3 && timeRemaining > 0) {
            playBeep(880);
        }
        if (timeRemaining === 0) {
            playBeep(1200);
            clearInterval(timerInterval);
            timerInterval = null;
            currentExerciseIndex++;
            if (currentExerciseIndex < workoutPlan.length) {
                setTimeout(startTimer, 1000);
            } else {
                speak("Workout complete!");
                exerciseTitle.textContent = "Finished!";
                currentExerciseIndex = 0;
                timeRemaining = 0;
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
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        if (timerInterval || workoutPlan.length === 0) return;

        // Pre-start countdown before first exercise
        if (currentExerciseIndex === 0 && timeRemaining === 0) {
            preStartMode = true;
            timeRemaining = PRE_START_DURATION;
            updateDisplay();
            timerInterval = setInterval(tick, 1000);
            return;
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
        preStartMode = false;
        currentExerciseIndex = 0;
        timeRemaining = 0;
        exerciseTitle.textContent = "Ready?";
        countdownDisplay.textContent = "00:00";
    }

    function speak(text) {
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
        workoutPlan = [...allWorkouts[selectedTitle]];
        workoutTitleInput.value = selectedTitle; // show title for editing
        currentExerciseIndex = 0;
        renderExerciseList();
        if (workoutPlan.length > 0) {
            timeRemaining = 0;
            updateDisplay();
        }
    }

    // --- EVENT LISTENERS ---
    addExerciseBtn.addEventListener('click', addExercise);
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    saveWorkoutBtn.addEventListener('click', saveWorkout);
    savedWorkoutsDropdown.addEventListener('change', loadSelectedWorkout);
    testBeepBtn.addEventListener('click', () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        playBeep(1000);
    });

    populateDropdown();
});
