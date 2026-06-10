import { ref, computed, watch, onUnmounted } from 'vue'
import { MODES, STRETCH_PROMPTS } from '../config/modes.js'
import { playChime, startAmbient, fadeOutAmbient, stopAmbient } from './useAudio.js'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/apple-touch-icon.png' })
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

let themeColorMeta = null
function setThemeColor(color) {
  if (!themeColorMeta) themeColorMeta = document.querySelector('meta[name="theme-color"]')
  themeColorMeta?.setAttribute('content', color)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function loadTodayMinutes() {
  const stored = loadJSON('pomo-today', null)
  if (stored && stored.date === todayKey()) return stored.minutes
  return 0
}

export function useTimer() {
  const mode = ref('work')
  const running = ref(false)
  const sessions = ref(loadJSON('pomo-sessions', 0))
  const durations = ref(loadJSON('pomo-durations', { work: 25, shortBreak: 5, longBreak: 15 }))
  const timeLeft = ref(durations.value.work * 60)
  const currentStretchPrompt = ref(STRETCH_PROMPTS[0])
  const todayMinutes = ref(loadTodayMinutes())

  let intervalId = null
  let wakeLock = null

  const showCompletion = ref(false)

  const cfg = computed(() => MODES[mode.value])
  const totalDuration = computed(() => durations.value[mode.value] * 60)
  const progress = computed(() => 1 - timeLeft.value / totalDuration.value)
  const isBreak = computed(() => mode.value === 'shortBreak' || mode.value === 'longBreak')
  const breakWarning = computed(() => isBreak.value && running.value && (timeLeft.value / totalDuration.value) <= 0.2)

  watch(durations, (val) => localStorage.setItem('pomo-durations', JSON.stringify(val)), { deep: true })
  watch(sessions, (val) => localStorage.setItem('pomo-sessions', JSON.stringify(val)))
  watch(timeLeft, (t) => {
    document.title = running.value ? `${formatTime(t)} — ${cfg.value.label}` : 'Pomodoro Focus'
  })
  watch(mode, (m) => setThemeColor(MODES[m].bg))

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen')
    } catch {}
  }

  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release(); wakeLock = null }
  }

  function onSessionComplete() {
    sessions.value++
    todayMinutes.value += durations.value.work
    localStorage.setItem('pomo-today', JSON.stringify({ date: todayKey(), minutes: todayMinutes.value }))
    const nextMode = sessions.value % 4 === 0 ? 'longBreak' : 'shortBreak'
    playChime('work')
    sendNotification('Focus session complete!', `Time for a ${nextMode === 'longBreak' ? 'long' : 'short'} break.`)
    currentStretchPrompt.value = STRETCH_PROMPTS[Math.floor(Math.random() * STRETCH_PROMPTS.length)]
    showCompletion.value = true
    mode.value = nextMode
    timeLeft.value = durations.value[nextMode] * 60
    // Do not start ambient here — startTimer starts it when the user presses Start
  }

  function onBreakComplete() {
    playChime('break')
    sendNotification('Break over!', 'Ready to focus again?')
    mode.value = 'work'
    timeLeft.value = durations.value.work * 60
    // Do not start ambient here — startTimer starts it when the user presses Start
  }

  function startTimer() {
    running.value = true
    requestWakeLock()
    requestNotificationPermission()
    startAmbient(mode.value === 'work' ? 'rain' : 'lofi')

    intervalId = setInterval(() => {
      if (timeLeft.value <= 1) {
        clearInterval(intervalId)
        intervalId = null
        running.value = false
        releaseWakeLock()
        mode.value === 'work' ? onSessionComplete() : onBreakComplete()
        return
      }
      timeLeft.value--
    }, 1000)
  }

  function pauseTimer() {
    running.value = false
    clearInterval(intervalId)
    intervalId = null
    releaseWakeLock()
    document.title = 'Pomodoro Focus'
    fadeOutAmbient()
  }

  function toggleTimer() {
    running.value ? pauseTimer() : startTimer()
  }

  function resetTimer() {
    pauseTimer()
    timeLeft.value = durations.value[mode.value] * 60
  }

  function switchMode(newMode) {
    pauseTimer()
    mode.value = newMode
    timeLeft.value = durations.value[newMode] * 60
  }

  function updateDuration(key, val) {
    const num = Math.max(1, Math.min(120, parseInt(val) || 1))
    durations.value[key] = num
    if (key === mode.value && !running.value) timeLeft.value = num * 60
  }

  onUnmounted(() => {
    clearInterval(intervalId)
    releaseWakeLock()
    stopAmbient()
  })

  return {
    mode, running, sessions, durations, timeLeft, currentStretchPrompt, todayMinutes,
    cfg, totalDuration, progress, isBreak, breakWarning, showCompletion,
    formatTime, toggleTimer, resetTimer, switchMode, updateDuration,
  }
}
