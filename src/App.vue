<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import ProgressRing from './components/ProgressRing.vue'

// ── Mode config ──
const MODES = {
  work:       { label: 'Focus',       color: '#8B9ADF', bg: '#12121E', ring: '#8B9ADF', track: '#252540', cardBg: '#1A1A2E', inputBg: '#1F1F33', doneBg: 'rgba(139,154,223,0.06)' },
  shortBreak: { label: 'Short Break', color: '#6BC4B4', bg: '#101A18', ring: '#6BC4B4', track: '#1E3832', cardBg: '#162420', inputBg: '#1B2A26', doneBg: 'rgba(107,196,180,0.06)' },
  longBreak:  { label: 'Long Break',  color: '#E8A0BF', bg: '#1A1018', ring: '#E8A0BF', track: '#3D2035', cardBg: '#251520', inputBg: '#2A1A26', doneBg: 'rgba(232,160,191,0.06)' },
}

// ── Helpers ──
function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

// ── State ──
const mode = ref('work')
const running = ref(false)
const sessions = ref(loadJSON('pomo-sessions', 0))
const durations = ref(loadJSON('pomo-durations', { work: 25, shortBreak: 5, longBreak: 15 }))
const timeLeft = ref(durations.value.work * 60)
const showSettings = ref(false)

const todos = ref(loadJSON('pomo-todos', []))
const newTodo = ref('')
const editingId = ref(null)
const editText = ref('')

const todoInput = ref(null)
const editInput = ref(null)

let intervalId = null
let wakeLock = null

// ── Stretch prompts ──
const STRETCH_PROMPTS = [
  'Roll your shoulders back slowly, 5 times each direction.',
  'Stand up and reach both arms overhead. Hold for 10 seconds.',
  'Tilt your head gently to each side. Feel the neck stretch.',
  'Look away from the screen — focus on something 20 feet away for 20 seconds.',
  'Shake out your hands and wiggle your fingers for 15 seconds.',
  'Take 4 slow deep breaths. In for 4 counts, out for 6.',
  'Roll your ankles and point your toes a few times.',
  'Gently roll your wrists in circles, both directions.',
  'Stand up, march in place for 30 seconds.',
  'Close your eyes and relax your jaw. Notice where you\'re holding tension.',
]

// ── Derived ──
const cfg = computed(() => MODES[mode.value])
const totalDuration = computed(() => durations.value[mode.value] * 60)
const progress = computed(() => 1 - timeLeft.value / totalDuration.value)
const pendingTodos = computed(() => todos.value.filter(t => !t.done))
const doneTodos = computed(() => todos.value.filter(t => t.done))
const completedCount = computed(() => doneTodos.value.length)
const isBreak = computed(() => mode.value === 'shortBreak' || mode.value === 'longBreak')
const breakWarning = computed(() => isBreak.value && running.value && (timeLeft.value / totalDuration.value) <= 0.2)
const currentStretchPrompt = ref(STRETCH_PROMPTS[0])

// ── Persistence ──
watch(todos, (val) => localStorage.setItem('pomo-todos', JSON.stringify(val)), { deep: true })
watch(durations, (val) => localStorage.setItem('pomo-durations', JSON.stringify(val)), { deep: true })
watch(sessions, (val) => localStorage.setItem('pomo-sessions', JSON.stringify(val)))

// ── Update page title with timer ──
watch(timeLeft, (t) => {
  document.title = running.value ? `${formatTime(t)} — ${cfg.value.label}` : 'Pomodoro Focus'
})

// ── Update theme-color meta tag on mode change ──
watch(mode, (m) => {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', MODES[m].bg)
})

// ── Wake Lock ──
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen')
    }
  } catch { /* silently fail */ }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release()
    wakeLock = null
  }
}

// ── Sound ──
let sharedCtx = null

function getAudioCtx() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (sharedCtx.state === 'suspended') sharedCtx.resume()
  return sharedCtx
}

function playChime(type = 'work') {
  const ctx = getAudioCtx()
  const notes = type === 'work'
    ? [523.25, 659.25, 783.99, 1046.5]
    : [783.99, 659.25, 523.25]

  let time = ctx.currentTime
  notes.forEach((freq) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, time)
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(0.25, time + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6)
    osc.start(time)
    osc.stop(time + 0.6)
    time += 0.18
  })
}

// ── Ambient sound ──
const ambientEnabled = ref(true)
let ambientNodes = []
let ambientMaster = null
let fadeOutTimer = null

function stopAmbient() {
  if (fadeOutTimer) { clearTimeout(fadeOutTimer); fadeOutTimer = null }
  ambientNodes.forEach(n => { try { n.stop() } catch {} })
  ambientNodes = []
  ambientMaster = null
}

function startAmbient(type) {
  stopAmbient()
  if (!ambientEnabled.value) return

  const ctx = getAudioCtx()
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, ctx.currentTime)
  master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2)
  master.connect(ctx.destination)
  ambientMaster = master

  if (type === 'rain') {
    const bufferSize = ctx.sampleRate * 3
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c)
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2200

    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 600
    bp.Q.value = 0.6

    const gain = ctx.createGain()
    gain.gain.value = 0.35

    noise.connect(lp)
    lp.connect(bp)
    bp.connect(gain)
    gain.connect(master)
    noise.start()
    ambientNodes.push(noise)

  } else {
    // Lo-fi warm pad: Fmaj7 voicing (F2, C3, E3, A3) + slow LFO shimmer
    const chordFreqs = [87.3, 130.8, 164.8, 220]
    chordFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = i === 0 ? 'sine' : 'triangle'
      osc.frequency.value = freq
      osc.detune.value = (Math.random() - 0.5) * 10

      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 700

      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.25 + Math.random() * 0.15
      const lfoDepth = ctx.createGain()
      lfoDepth.gain.value = 0.04
      lfo.connect(lfoDepth)

      const gain = ctx.createGain()
      gain.gain.value = i === 0 ? 0.18 : 0.1
      lfoDepth.connect(gain.gain)

      osc.connect(lp)
      lp.connect(gain)
      gain.connect(master)
      osc.start()
      lfo.start()
      ambientNodes.push(osc, lfo)
    })
  }
}

function toggleAmbient() {
  ambientEnabled.value = !ambientEnabled.value
  if (!running.value) return
  ambientEnabled.value
    ? startAmbient(mode.value === 'work' ? 'rain' : 'lofi')
    : fadeOutAmbient()
}

function fadeOutAmbient() {
  if (!ambientMaster) return
  const ctx = getAudioCtx()
  ambientMaster.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5)
  fadeOutTimer = setTimeout(stopAmbient, 1600)
}

// ── Notifications ──
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/apple-touch-icon.png' })
  }
}

// ── Timer logic ──
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

      if (mode.value === 'work') {
        sessions.value++
        const nextMode = sessions.value % 4 === 0 ? 'longBreak' : 'shortBreak'
        playChime('work')
        sendNotification('Focus session complete!', `Time for a ${nextMode === 'longBreak' ? 'long' : 'short'} break.`)
        currentStretchPrompt.value = STRETCH_PROMPTS[Math.floor(Math.random() * STRETCH_PROMPTS.length)]
        mode.value = nextMode
        timeLeft.value = durations.value[nextMode] * 60
        startAmbient('lofi')
      } else {
        playChime('break')
        sendNotification('Break over!', 'Ready to focus again?')
        mode.value = 'work'
        timeLeft.value = durations.value.work * 60
        startAmbient('rain')
      }
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
  if (key === mode.value && !running.value) {
    timeLeft.value = num * 60
  }
}

// ── Todo logic ──
function addTodo() {
  const text = newTodo.value.trim()
  if (!text) return
  todos.value.push({ id: Date.now(), text, done: false })
  newTodo.value = ''
  nextTick(() => todoInput.value?.focus())
}

function toggleTodo(id) {
  const t = todos.value.find(t => t.id === id)
  if (t) t.done = !t.done
}

function deleteTodo(id) {
  todos.value = todos.value.filter(t => t.id !== id)
}

function startEdit(todo) {
  editingId.value = todo.id
  editText.value = todo.text
  nextTick(() => editInput.value?.focus())
}

function saveEdit(id) {
  const t = todos.value.find(t => t.id === id)
  if (t) t.text = editText.value.trim() || t.text
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

// ── Cleanup ──
onUnmounted(() => {
  clearInterval(intervalId)
  releaseWakeLock()
  stopAmbient()
})
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center px-4 py-12 pb-12 transition-colors duration-500"
    :style="{ background: cfg.bg }"
  >
    <!-- Mode tabs -->
    <div class="flex gap-1 rounded-full p-1 mb-6" style="background: rgba(255,255,255,0.06)">
      <button
        v-for="(val, key) in MODES" :key="key"
        @click="switchMode(key)"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
        :style="{
          background: mode === key ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: mode === key ? val.color : 'rgba(255,255,255,0.35)',
          boxShadow: mode === key ? '0 1px 6px rgba(0,0,0,0.3)' : 'none',
        }"
      >
        {{ val.label }}
      </button>
    </div>

    <!-- Timer ring -->
    <div class="relative flex items-center justify-center mb-6">
      <ProgressRing
        :radius="110" :stroke="8"
        :progress="progress"
        :color="cfg.ring" :track-color="cfg.track"
      />
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span
          class="timer-display"
          :style="{ color: cfg.color }"
        >
          {{ formatTime(timeLeft) }}
        </span>
        <span
          class="text-xs mt-1.5 font-medium uppercase tracking-widest"
          :style="{ color: cfg.color, opacity: 0.5 }"
        >
          {{ cfg.label }}
        </span>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-3 mb-2">
      <button
        @click="toggleTimer"
        class="px-8 py-2.5 rounded-full text-sm font-semibold tracking-wide uppercase transition-transform active:scale-95"
        :style="{ background: cfg.color, color: cfg.bg }"
      >
        {{ running ? 'Pause' : 'Start' }}
      </button>

      <button
        @click="resetTimer"
        class="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style="background: rgba(255,255,255,0.07)"
        title="Reset"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 2v5h5" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2.5 7A6 6 0 1 1 3.8 11" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>

      <button
        @click="showSettings = !showSettings"
        class="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        :style="{ background: showSettings ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)' }"
        title="Settings"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2" stroke="rgba(255,255,255,0.4)" stroke-width="1.3"/>
          <path d="M8 1v2m0 10v2M1 8h2m10 0h2m-1.5-5.5L12 4m-8 8-1.5 1.5m0-11L4 4m8 8 1.5 1.5" stroke="rgba(255,255,255,0.4)" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Session dots -->
    <div class="flex items-center gap-1.5 mb-6">
      <div
        v-for="i in 4" :key="i"
        class="w-2.5 h-2.5 rounded-full transition-colors"
        :style="{ background: (i - 1) < (sessions % 4) ? cfg.color : cfg.track }"
      />
      <span class="text-xs ml-1.5" style="color: rgba(255,255,255,0.3)">
        {{ sessions }} session{{ sessions !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Settings panel -->
    <Transition name="settings">
      <div
        v-if="showSettings"
        class="w-full max-w-sm rounded-2xl p-4 mb-6"
        :style="{ background: cfg.cardBg, boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }"
      >
        <div class="flex items-center justify-between mb-4">
          <p class="text-xs font-semibold uppercase tracking-widest" style="color: rgba(255,255,255,0.3)">Ambient sound</p>
          <button
            @click="toggleAmbient"
            class="text-xs px-3 py-1 rounded-full transition-colors"
            :style="{ background: ambientEnabled ? cfg.color : 'rgba(255,255,255,0.08)', color: ambientEnabled ? cfg.bg : 'rgba(255,255,255,0.4)' }"
          >{{ ambientEnabled ? 'On' : 'Off' }}</button>
        </div>
        <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color: rgba(255,255,255,0.3)">
          Duration (minutes)
        </p>
        <div class="flex gap-3">
          <label
            v-for="[key, label] in [['work','Focus'],['shortBreak','Short'],['longBreak','Long']]"
            :key="key"
            class="flex-1 flex flex-col items-center gap-1"
          >
            <span class="text-xs" style="color: rgba(255,255,255,0.4)">{{ label }}</span>
            <input
              type="number" :min="1" :max="120"
              :value="durations[key]"
              @input="updateDuration(key, $event.target.value)"
              class="w-full text-center rounded-lg border py-1.5 text-sm font-medium focus:outline-none focus:ring-2"
              :style="{ borderColor: 'rgba(255,255,255,0.1)', background: cfg.inputBg, color: 'rgba(255,255,255,0.85)' }"
            />
          </label>
        </div>
      </div>
    </Transition>

    <!-- Break warning -->
    <Transition name="settings">
      <div
        v-if="breakWarning"
        class="w-full max-w-sm rounded-2xl px-5 py-3 mb-4 text-center"
        :style="{ background: cfg.cardBg }"
      >
        <p class="text-sm font-medium" :style="{ color: cfg.color }">Break ending soon — start wrapping up.</p>
      </div>
    </Transition>

    <!-- Break stretch prompt -->
    <Transition name="settings">
      <div v-if="isBreak && running" class="w-full max-w-sm mb-6">
        <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color: rgba(255,255,255,0.3)">
          Stretch prompt
        </p>
        <div
          class="rounded-2xl px-5 py-4"
          :style="{ background: cfg.cardBg }"
        >
          <p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.75)">{{ currentStretchPrompt }}</p>
        </div>
      </div>
    </Transition>

    <!-- To-do list -->
    <div class="w-full max-w-sm" :class="{ 'opacity-30 pointer-events-none select-none': isBreak && running }">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold uppercase tracking-widest" style="color: rgba(255,255,255,0.3)">
          Tasks
        </h2>
        <span v-if="todos.length" class="text-xs" style="color: rgba(255,255,255,0.2)">
          {{ completedCount }}/{{ todos.length }} done
        </span>
      </div>

      <!-- Add input -->
      <div class="flex gap-2 mb-4">
        <input
          ref="todoInput"
          v-model="newTodo"
          @keydown.enter="addTodo"
          type="text"
          placeholder="What are you working on?"
          class="flex-1 rounded-xl px-4 py-2.5 text-sm border focus:outline-none focus:ring-2 placeholder:opacity-30"
          :style="{ borderColor: 'rgba(255,255,255,0.08)', background: cfg.cardBg, color: 'rgba(255,255,255,0.85)' }"
        />
        <button
          @click="addTodo"
          class="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 transition-transform active:scale-95"
          :style="{ background: cfg.color, color: cfg.bg }"
        >+</button>
      </div>

      <!-- Pending tasks -->
      <TransitionGroup name="task" tag="div" class="flex flex-col gap-2">
        <div
          v-for="todo in pendingTodos" :key="todo.id"
          class="flex items-center gap-3 rounded-xl px-4 py-3 group"
          :style="{ background: cfg.cardBg, boxShadow: '0 1px 6px rgba(0,0,0,0.15)' }"
        >
          <button
            @click="toggleTodo(todo.id)"
            class="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
            :style="{ borderColor: cfg.track }"
          />

          <input
            v-if="editingId === todo.id"
            ref="editInput"
            v-model="editText"
            @keydown.enter="saveEdit(todo.id)"
            @keydown.escape="cancelEdit"
            @blur="saveEdit(todo.id)"
            class="flex-1 text-sm bg-transparent border-b focus:outline-none"
            :style="{ borderColor: cfg.color, color: 'rgba(255,255,255,0.85)' }"
          />
          <span
            v-else
            @dblclick="startEdit(todo)"
            class="flex-1 text-sm cursor-pointer select-none"
            style="color: rgba(255,255,255,0.8)"
          >
            {{ todo.text }}
          </span>

          <button
            @click="deleteTodo(todo.id)"
            class="opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs transition-opacity"
            style="color: rgba(255,255,255,0.2)"
          >✕</button>
        </div>
      </TransitionGroup>

      <!-- Completed tasks -->
      <div v-if="doneTodos.length" class="mt-4">
        <p class="text-xs font-medium uppercase tracking-widest mb-2" style="color: rgba(255,255,255,0.2)">
          Completed
        </p>
        <TransitionGroup name="task" tag="div" class="flex flex-col gap-1.5">
          <div
            v-for="todo in doneTodos" :key="todo.id"
            class="flex items-center gap-3 rounded-xl px-4 py-2.5 group"
            :style="{ background: cfg.doneBg }"
          >
            <button
              @click="toggleTodo(todo.id)"
              class="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
              :style="{ background: cfg.track }"
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M2 5l2.5 2.5L8 3" :stroke="cfg.color" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <span class="flex-1 text-sm line-through" style="color: rgba(255,255,255,0.25)">
              {{ todo.text }}
            </span>
            <button
              @click="deleteTodo(todo.id)"
              class="opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs transition-opacity"
              style="color: rgba(255,255,255,0.15)"
            >✕</button>
          </div>
        </TransitionGroup>
      </div>

      <p v-if="!todos.length" class="text-center py-6 text-sm" style="color: rgba(255,255,255,0.15)">
        Add a task to get started
      </p>
    </div>

    <p class="mt-8 text-xs" style="color: rgba(255,255,255,0.15)">
      Double-tap a task to edit
    </p>
  </div>
</template>

<style scoped>
.timer-display {
  font-family: 'DM Mono', 'SF Mono', ui-monospace, monospace;
  font-size: 3rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1;
}

/* Settings slide */
.settings-enter-active,
.settings-leave-active {
  transition: all 0.25s ease;
}
.settings-enter-from,
.settings-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Task list transitions */
.task-enter-active {
  transition: all 0.25s ease;
}
.task-leave-active {
  transition: all 0.2s ease;
}
.task-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.task-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
.task-move {
  transition: transform 0.25s ease;
}
</style>
