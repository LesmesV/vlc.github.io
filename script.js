'use strict';
const $ = id => document.getElementById(id);
const STORAGE_KEY = 'allMyWorkouts';
const CLOUD_CONFIG = {
  apiKey: 'AIzaSyAd4BY1U5AHB4qdDk3TlzD_r8D7QVNmWpk',
  authDomain: 'workout-app-a8daa.firebaseapp.com',
  projectId: 'workout-app-a8daa',
  appId: '1:460195350325:web:edf8c1757373bbb334ee7c'
};
const cloudConfigured = CLOUD_CONFIG.apiKey !== 'YOUR_API_KEY' && CLOUD_CONFIG.projectId !== 'YOUR_PROJECT_ID' && CLOUD_CONFIG.appId !== 'YOUR_APP_ID';
const workoutList = $('workout-list');
const nameInput = $('exercise-name-input');
const durationInput = $('exercise-duration-input');
const addBtn = $('add-exercise-btn');
const timerDisplay = $('timer-display');
const currentDisplay = $('current-exercise');
const progressBar = $('timer-progress');
const status = $('status-message');
const startBtn = $('start-btn');
const pauseBtn = $('pause-btn');
const resetBtn = $('reset-btn');
const testBeepBtn = $('test-beep-btn');
const titleInput = $('workout-title-input');
const saveBtn = $('save-workout-btn');
const savedSelect = $('saved-workouts');
const cloudStatus = $('cloud-status');
const cloudDescription = $('cloud-description');
const emailInput = $('cloud-email');
const passwordInput = $('cloud-password');
const signInBtn = $('cloud-sign-in');
const createAccountBtn = $('cloud-create-account');
const signOutBtn = $('cloud-sign-out');

let workoutPlan = [];
let editingIndex = -1;
let savedWorkouts = readSavedWorkouts();
let currentIndex = -1;
let phase = 'idle';
let pausedPhase = 'idle';
let intervalId = null;
let phaseEndsAt = 0;
let pausedRemaining = 0;
let lastCueSecond = null;
let audioContext = null;
let cloudAuth = null;
let cloudDb = null;
let cloudUser = null;
let cloudReady = false;
let cloudSaveTimeout = null;

function readSavedWorkouts() {
  try {
    const rawCurrent = localStorage.getItem(STORAGE_KEY);
    if (rawCurrent) {
      const current = JSON.parse(rawCurrent);
      if (current && !Array.isArray(current) && typeof current === 'object') return current;
    }
    const legacy = JSON.parse(localStorage.getItem('workouts') || '[]');
    const migrated = {};
    if (Array.isArray(legacy)) legacy.forEach(item => {
      if (item && item.title && Array.isArray(item.exercises)) migrated[item.title] = item.exercises;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch (error) {
    console.warn('Could not read saved workouts', error);
    return {};
  }
}
function setStatus(message, type) {
  status.textContent = message;
  status.dataset.type = type || '';
}
function persistLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedWorkouts));
    refreshSavedList();
    scheduleCloudSave();
    return true;
  } catch (error) {
    setStatus('Could not save on this device. Check browser storage.', 'error');
    return false;
  }
}
function refreshSavedList() {
  const selected = savedSelect.value;
  savedSelect.replaceChildren(new Option('-- Load Saved Workout --', ''));
  Object.keys(savedWorkouts).sort((a, b) => a.localeCompare(b)).forEach(title => savedSelect.add(new Option(title, title)));
  if (Object.prototype.hasOwnProperty.call(savedWorkouts, selected)) savedSelect.value = selected;
}
function ensureAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  if (!audioContext) audioContext = new Audio();
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}
function beep(duration, frequency) {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency || 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.48, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (duration || 120) / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (duration || 120) / 1000 + 0.02);
  } catch (error) { console.warn('Audio playback failed', error); }
}
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (error) { console.warn('Speech failed', error); }
}
function formatTime(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(whole / 60)).padStart(2, '0') + ':' + String(whole % 60).padStart(2, '0');
}
function button(label, className, callback) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.className = className;
  el.addEventListener('click', callback);
  return el;
}
function renderWorkout() {
  workoutList.replaceChildren();
  if (!workoutPlan.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-workout';
    empty.textContent = 'Add exercises to build your workout.';
    workoutList.appendChild(empty);
    return;
  }
  workoutPlan.forEach((exercise, index) => {
    const item = document.createElement('li');
    item.className = 'exercise-item' + (phase === 'exercise' && currentIndex === index ? ' is-current' : '');
    const details = document.createElement('div');
    details.className = 'exercise-details';
    const name = document.createElement('span');
    name.className = 'exercise-name';
    name.textContent = exercise.name;
    const duration = document.createElement('span');
    duration.className = 'exercise-duration';
    duration.textContent = exercise.duration + ' sec';
    details.append(name, duration);
    const actions = document.createElement('div');
    actions.className = 'exercise-actions';
    const locked = phase !== 'idle' && phase !== 'finished';
    const edit = button('Edit', 'edit-btn', () => {
      if (lockedNow()) return;
      editingIndex = index;
      nameInput.value = exercise.name;
      durationInput.value = exercise.duration;
      addBtn.textContent = 'Update Exercise';
      nameInput.focus();
      setStatus('Edit the details, then select Update Exercise.');
    });
    const remove = button('Delete', 'delete-btn', () => {
      if (lockedNow()) return;
      workoutPlan.splice(index, 1);
      if (editingIndex === index) cancelEdit();
      renderWorkout();
    });
    const up = button('↑', 'move-btn', () => moveExercise(index, -1));
    const down = button('↓', 'move-btn', () => moveExercise(index, 1));
    up.disabled = index === 0 || locked;
    down.disabled = index === workoutPlan.length - 1 || locked;
    edit.disabled = remove.disabled = locked;
    up.setAttribute('aria-label', 'Move ' + exercise.name + ' up');
    down.setAttribute('aria-label', 'Move ' + exercise.name + ' down');
    actions.append(edit, remove, up, down);
    item.append(details, actions);
    workoutList.appendChild(item);
  });
}
function lockedNow() {
  return phase !== 'idle' && phase !== 'finished';
}
function cancelEdit() {
  editingIndex = -1;
  nameInput.value = '';
  durationInput.value = '';
  addBtn.textContent = 'Add Exercise';
}
function moveExercise(index, direction) {
  const next = index + direction;
  if (next < 0 || next >= workoutPlan.length || lockedNow()) return;
  [workoutPlan[index], workoutPlan[next]] = [workoutPlan[next], workoutPlan[index]];
  renderWorkout();
}
function updateDisplay(seconds, label) {
  timerDisplay.textContent = formatTime(seconds);
  timerDisplay.classList.toggle('is-countdown', phase === 'preparation');
  currentDisplay.textContent = label;
  const total = phase === 'preparation' ? 10 : Math.max(1, Number(workoutPlan[currentIndex]?.duration) || 1);
  progressBar.style.width = (Math.max(0, Math.min(1, seconds / total)) * 100) + '%';
}
function stopInterval() {
  if (intervalId !== null) clearInterval(intervalId);
  intervalId = null;
}
function beginWorkout() {
  if (!workoutPlan.length) return setStatus('Add at least one exercise before starting.', 'error');
  stopInterval();
  ensureAudio();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  currentIndex = 0;
  phase = 'preparation';
  phaseEndsAt = Date.now() + 10000;
  lastCueSecond = null;
  startBtn.disabled = true;
  startBtn.textContent = 'Workout Running';
  pauseBtn.disabled = false;
  pauseBtn.textContent = 'Pause';
  setStatus('Get ready. Your first exercise starts in 10 seconds.');
  tick();
  intervalId = setInterval(tick, 100);
}
function startExercise(index) {
  currentIndex = index;
  phase = 'exercise';
  phaseEndsAt = Date.now() + Number(workoutPlan[index].duration) * 1000;
  lastCueSecond = null;
  setStatus('Exercise ' + (index + 1) + ' of ' + workoutPlan.length + ': ' + workoutPlan[index].name);
  renderWorkout();
}
function tick() {
  if (phase !== 'preparation' && phase !== 'exercise') return;
  const remaining = Math.max(0, (phaseEndsAt - Date.now()) / 1000);
  const seconds = Math.ceil(remaining);
  if (phase === 'preparation') {
    updateDisplay(remaining, 'Starting: ' + workoutPlan[0].name);
    if (seconds === 5 && lastCueSecond !== 5) speak(workoutPlan[0].name);
    if ([3, 2, 1].includes(seconds) && lastCueSecond !== seconds) beep(150, seconds === 1 ? 1050 : 800);
  } else {
    updateDisplay(remaining, 'Now: ' + workoutPlan[currentIndex].name);
    if (seconds === 5 && lastCueSecond !== 5 && currentIndex < workoutPlan.length - 1) {
      speak('Next: ' + workoutPlan[currentIndex + 1].name);
    }
    if ([3, 2, 1].includes(seconds) && lastCueSecond !== seconds && currentIndex < workoutPlan.length - 1) {
      beep(110, seconds === 1 ? 1050 : 800);
    }
  }
  lastCueSecond = seconds;
  if (remaining <= 0) {
    if (phase === 'preparation') startExercise(0);
    else if (currentIndex < workoutPlan.length - 1) startExercise(currentIndex + 1);
    else finishWorkout();
  }
}
function pauseWorkout() {
  if (phase !== 'preparation' && phase !== 'exercise') return;
  pausedPhase = phase;
  pausedRemaining = Math.max(0, (phaseEndsAt - Date.now()) / 1000);
  stopInterval();
  phase = 'paused';
  startBtn.disabled = false;
  startBtn.textContent = 'Resume';
  pauseBtn.disabled = true;
  pauseBtn.textContent = 'Paused';
  timerDisplay.textContent = formatTime(pausedRemaining);
  setStatus('Workout paused. Resume when you are ready.');
}
function resumeWorkout() {
  if (phase !== 'paused') return beginWorkout();
  phase = pausedPhase;
  phaseEndsAt = Date.now() + pausedRemaining * 1000;
  lastCueSecond = Math.ceil(pausedRemaining);
  startBtn.disabled = true;
  startBtn.textContent = 'Workout Running';
  pauseBtn.disabled = false;
  pauseBtn.textContent = 'Pause';
  setStatus(phase === 'preparation' ? 'Starting: ' + workoutPlan[0].name : 'Now: ' + workoutPlan[currentIndex].name);
  intervalId = setInterval(tick, 100);
}
function finishWorkout() {
  stopInterval();
  phase = 'finished';
  currentIndex = -1;
  timerDisplay.textContent = '00:00';
  currentDisplay.textContent = 'Workout complete';
  progressBar.style.width = '0%';
  startBtn.disabled = false;
  startBtn.textContent = 'Start Workout';
  pauseBtn.disabled = true;
  pauseBtn.textContent = 'Pause';
  setStatus('Workout complete. Reset to run it again.');
  speak('Workout complete.');
  renderWorkout();
}
function resetWorkout() {
  stopInterval();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  phase = 'idle';
  pausedPhase = 'idle';
  currentIndex = -1;
  pausedRemaining = 0;
  lastCueSecond = null;
  startBtn.disabled = false;
  startBtn.textContent = 'Start Workout';
  pauseBtn.disabled = true;
  pauseBtn.textContent = 'Pause';
  timerDisplay.textContent = 'Ready?';
  currentDisplay.textContent = 'Build your workout, then press Start Workout';
  progressBar.style.width = '0%';
  setStatus('Ready when you are.');
  renderWorkout();
}
addBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  const duration = Number.parseInt(durationInput.value, 10);
  if (lockedNow()) return setStatus('Reset the timer before editing the workout.', 'error');
  if (!name) return setStatus('Enter an exercise name.', 'error');
  if (!Number.isFinite(duration) || duration < 10) return setStatus('Each exercise must be at least 10 seconds long.', 'error');
  const wasEditing = editingIndex >= 0;
  const exercise = { name, duration };
  if (wasEditing) workoutPlan[editingIndex] = exercise;
  else workoutPlan.push(exercise);
  cancelEdit();
  renderWorkout();
  setStatus(name + ' ' + (wasEditing ? 'updated.' : 'added.'));
  nameInput.focus();
});
[nameInput, durationInput].forEach(input => input.addEventListener('keydown', event => {
  if (event.key === 'Enter') addBtn.click();
}));
saveBtn.addEventListener('click', () => {
  const title = titleInput.value.trim();
  if (!title) return setStatus('Give this workout a name before saving.', 'error');
  if (!workoutPlan.length) return setStatus('Add at least one exercise before saving.', 'error');
  savedWorkouts[title] = workoutPlan.map(exercise => ({ name: exercise.name, duration: exercise.duration }));
  if (persistLocal()) {
    savedSelect.value = title;
    setStatus('“' + title + '” saved on this device' + (cloudReady ? ' and syncing to your account.' : '.'));
  }
});
savedSelect.addEventListener('change', () => {
  const title = savedSelect.value;
  if (!title || !savedWorkouts[title]) return;
  if (lockedNow()) {
    savedSelect.value = '';
    return setStatus('Reset the timer before loading another workout.', 'error');
  }
  workoutPlan = savedWorkouts[title].map(exercise => ({ name: exercise.name, duration: Number(exercise.duration) }));
  titleInput.value = title;
  cancelEdit();
  resetWorkout();
  setStatus('Loaded “' + title + '”.');
});
startBtn.addEventListener('click', () => phase === 'paused' ? resumeWorkout() : beginWorkout());
pauseBtn.addEventListener('click', pauseWorkout);
resetBtn.addEventListener('click', resetWorkout);
testBeepBtn.addEventListener('click', () => {
  ensureAudio();
  beep(180, 880);
  setStatus('Test beep played. If you could not hear it, check your device volume.');
});

// Cloud sync is optional until Firebase project settings are added below.
function setCloudControls(enabled) {
  [emailInput, passwordInput, signInBtn, createAccountBtn].forEach(control => control.disabled = !enabled);
}
async function initialiseCloud() {
  if (!cloudConfigured || !window.firebase) {
    cloudStatus.textContent = 'Cloud sync not connected';
    cloudDescription.textContent = 'Workouts are saved on this device only until Firebase is configured.';
    setCloudControls(false);
    return;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(CLOUD_CONFIG);
    cloudAuth = firebase.auth();
    cloudDb = firebase.firestore();
    await cloudAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    cloudAuth.onAuthStateChanged(async user => {
      cloudUser = user || null;
      cloudReady = Boolean(user);
      setCloudControls(true);
      signOutBtn.hidden = !user;
      if (!user) {
        cloudStatus.textContent = 'Cloud sync not connected';
        cloudDescription.textContent = 'Sign in to sync your saved workouts across devices.';
        cloudStatus.dataset.state = 'local';
        return;
      }
      emailInput.value = user.email || '';
      cloudStatus.textContent = 'Signed in as ' + (user.email || 'your account');
      cloudDescription.textContent = 'Connecting to your saved workouts…';
      cloudStatus.dataset.state = 'connected';
      await loadCloudWorkouts();
    });
  } catch (error) {
    console.error('Firebase setup failed', error);
    cloudStatus.textContent = 'Cloud sync needs setup';
    cloudDescription.textContent = 'Cloud sync could not connect. Your locally saved workouts remain on this device.';
    setStatus('Local saving works. Cloud sync could not connect; check Firebase setup.', 'error');
  }
}
async function loadCloudWorkouts() {
  if (!cloudReady || !cloudUser || !cloudDb) return;
  try {
    const ref = cloudDb.collection('users').doc(cloudUser.uid).collection('settings').doc('workouts');
    const snapshot = await ref.get();
    const remote = snapshot.exists && snapshot.data().workouts ? snapshot.data().workouts : {};
    const local = savedWorkouts;
    savedWorkouts = Object.assign({}, remote, local);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedWorkouts));
    refreshSavedList();
    if (Object.keys(local).length) await saveCloudWorkouts();
    cloudDescription.textContent = 'Your saved workouts are synced to this Firebase account and available on devices where you sign in.';
    setStatus('Your workouts are available on this device and sync to your signed-in account.');
  } catch (error) {
    console.error('Cloud load failed', error);
    cloudStatus.textContent = 'Cloud load failed';
    cloudDescription.textContent = 'Cloud loading failed. Your local workouts are still available on this device.';
    setStatus('Could not load cloud workouts. Your local workouts are still available.', 'error');
  }
}
function scheduleCloudSave() {
  if (!cloudReady) return;
  clearTimeout(cloudSaveTimeout);
  cloudSaveTimeout = setTimeout(saveCloudWorkouts, 500);
}
async function saveCloudWorkouts() {
  if (!cloudReady || !cloudUser || !cloudDb) return;
  try {
    await cloudDb.collection('users').doc(cloudUser.uid).collection('settings').doc('workouts').set({
      workouts: savedWorkouts,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    cloudStatus.textContent = 'Signed in as ' + (cloudUser.email || 'your account') + ' · synced';
    cloudDescription.textContent = 'Your saved workouts are synced to this Firebase account and available on devices where you sign in.';
  } catch (error) {
    console.error('Cloud save failed', error);
    cloudStatus.textContent = 'Cloud save failed';
    cloudDescription.textContent = 'Cloud saving failed. Your workouts are still saved on this device; check Firebase rules and connection.';
    setStatus('Saved on this device, but cloud sync failed. Check your connection and Firebase rules.', 'error');
  }
}
function authErrorMessage(error) {
  const messages = {
    'auth/invalid-email': 'That email address does not look valid.',
    'auth/user-not-found': 'No account found for that email. Create an account or check the address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists for that email. Try signing in.',
    'auth/weak-password': 'Choose a password with at least 6 characters.',
    'auth/operation-not-allowed': 'Enable email/password sign-in in Firebase Authentication.',
    'auth/network-request-failed': 'Network error. Check your internet connection and try again.'
  };
  return messages[error.code] || 'Authentication failed. Check your details and Firebase setup.';
}
signInBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return setStatus('Enter your email and password to sign in.', 'error');
  try {
    await cloudAuth.signInWithEmailAndPassword(email, password);
    passwordInput.value = '';
    setStatus('Signed in. Loading your cloud workouts…');
  } catch (error) { setStatus(authErrorMessage(error), 'error'); }
});
createAccountBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return setStatus('Enter an email and password to create an account.', 'error');
  if (password.length < 6) return setStatus('Choose a password with at least 6 characters.', 'error');
  try {
    await cloudAuth.createUserWithEmailAndPassword(email, password);
    passwordInput.value = '';
    setStatus('Account created. Your workouts will sync to this account.');
  } catch (error) { setStatus(authErrorMessage(error), 'error'); }
});
signOutBtn.addEventListener('click', async () => {
  if (cloudAuth) {
    try { await cloudAuth.signOut(); setStatus('Signed out. Your workouts remain saved on this device.'); }
    catch (error) { setStatus('Could not sign out. Please try again.', 'error'); }
  }
});
function init() {
  refreshSavedList();
  renderWorkout();
  resetWorkout();
  initialiseCloud();
  if (!('speechSynthesis' in window)) setStatus('Speech announcements are not supported here; countdown beeps still work.');
}
init();