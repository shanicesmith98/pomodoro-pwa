<script setup>
import { ref, computed, watch, watchEffect } from 'vue'
import { useTimer } from './composables/useTimer.js'
import { useTodos } from './composables/useTodos.js'
import { useXP } from './composables/useXP.js'
import { useStreak, recordSessionDay } from './composables/useStreak.js'
import { useWinLog } from './composables/useWinLog.js'
import { useBodyDoubling } from './composables/useBodyDoubling.js'
import { ambientEnabled, toggleAmbient, youtubeActive, startAmbient } from './composables/useAudio.js'
import { focusYouTubeUrl, breakYouTubeUrl, parseYouTubeUrl } from './composables/useYouTube.js'
import { MODES } from './config/modes.js'
import ProgressRing from './components/ProgressRing.vue'
import BreakScreen from './components/BreakScreen.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import TodoList from './components/TodoList.vue'
import SessionCompleteOverlay from './components/SessionCompleteOverlay.vue'
import YouTubePlayer from './components/YouTubePlayer.vue'

const showSettings = ref(false)

const modeKeys = Object.keys(MODES)
function onModeKeydown(e, key) {
  const idx = modeKeys.indexOf(key)
  if (e.key === 'ArrowRight') switchMode(modeKeys[(idx + 1) % modeKeys.length])
  else if (e.key === 'ArrowLeft') switchMode(modeKeys[(idx - 1 + modeKeys.length) % modeKeys.length])
}

const {
  mode, running, sessions, durations, timeLeft, currentStretchPrompt, todayMinutes,
  cfg, progress, isBreak, breakWarning, showCompletion,
  formatTime, toggleTimer, resetTimer, switchMode, updateDuration,
} = useTimer()

const { activeTask, incrementActual } = useTodos()
const { level, levelTitle, levelProgress, xpToNextLevel, isMaxLevel, addSessionXP } = useXP()
const { streak, isActiveToday } = useStreak()
const { todayWins, addWin } = useWinLog()
const { focuserCount } = useBodyDoubling()

const completionXP = ref(0)
const completionLevelUp = ref(false)
const completionNewLevel = ref(1)
const completionLevelTitle = ref('')

// When a work session completes: credit task, award XP, record streak
watch(sessions, () => {
  if (activeTask.value) incrementActual(activeTask.value.id)
  const result = addSessionXP()
  completionXP.value = result.xpGained
  completionLevelUp.value = result.didLevelUp
  completionNewLevel.value = result.newLevel
  completionLevelTitle.value = levelTitle.value
  recordSessionDay()
})

// YouTube — pick URL for current mode, disable ambient when active
const activeYouTubeUrl = computed(() => isBreak.value ? breakYouTubeUrl.value : focusYouTubeUrl.value)
watchEffect(() => { youtubeActive.value = !!parseYouTubeUrl(activeYouTubeUrl.value) })

function onYouTubeEnded() {
  youtubeActive.value = false  // lift the guard so startAmbient can run
  if (ambientEnabled.value && running.value) {
    startAmbient(isBreak.value ? 'lofi' : 'rain')
  }
}

// #4 — Animate ring track color as session progresses
function lerpHex(a, b, t) {
  const parse = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]
  const [ar,ag,ab] = parse(a), [br,bg,bb] = parse(b)
  const r = Math.round(ar + (br-ar)*t).toString(16).padStart(2,'0')
  const g = Math.round(ag + (bg-ag)*t).toString(16).padStart(2,'0')
  const bv = Math.round(ab + (bb-ab)*t).toString(16).padStart(2,'0')
  return `#${r}${g}${bv}`
}
const animatedTrackColor = computed(() =>
  lerpHex(cfg.value.track, cfg.value.ring, progress.value * 0.45)
)

// #3 — Today's focus bar (target: 4 full work sessions)
const todayTarget = computed(() => 4 * durations.value.work)
const todayProgress = computed(() => Math.min(todayMinutes.value / todayTarget.value, 1))
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center px-4 py-12 pb-12 transition-colors duration-500"
    :style="{ background: cfg.bg }"
  >
    <!-- Mode tabs -->
    <div
      role="tablist"
      aria-label="Timer mode"
      class="flex gap-1 rounded-full p-1 mb-6"
      style="background: rgba(255,255,255,0.06)"
    >
      <button
        v-for="(val, key) in MODES" :key="key"
        role="tab"
        :aria-selected="mode === key"
        @click="switchMode(key)"
        @keydown="onModeKeydown($event, key)"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
        :style="{
          background: mode === key ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: mode === key ? val.color : 'rgba(255,255,255,0.5)',
          boxShadow: mode === key ? '0 1px 6px rgba(0,0,0,0.3)' : 'none',
        }"
      >{{ val.label }}</button>
    </div>

    <!-- Timer ring -->
    <div class="relative flex items-center justify-center mb-6">
      <ProgressRing
        :radius="110" :stroke="8"
        :progress="progress"
        :color="cfg.ring" :track-color="animatedTrackColor"
        :label="`${formatTime(timeLeft)} remaining in ${cfg.label}`"
      />
      <div class="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span class="timer-display" :style="{ color: cfg.color }">{{ formatTime(timeLeft) }}</span>
        <span
          class="text-xs mt-1.5 font-medium uppercase tracking-widest"
          :style="{ color: cfg.color, opacity: 0.6 }"
        >{{ cfg.label }}</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-3 mb-2" role="group" aria-label="Timer controls">
      <button
        @click="toggleTimer"
        :aria-label="running ? 'Pause timer' : 'Start timer'"
        class="px-8 py-2.5 rounded-full text-sm font-semibold tracking-wide uppercase transition-transform active:scale-95"
        :style="{ background: cfg.color, color: cfg.bg }"
      >{{ running ? 'Pause' : 'Start' }}</button>

      <button
        @click="resetTimer"
        aria-label="Reset timer"
        class="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style="background: rgba(255,255,255,0.07)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 2v5h5" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2.5 7A6 6 0 1 1 3.8 11" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>

      <button
        @click="showSettings = !showSettings"
        :aria-expanded="showSettings"
        aria-controls="settings-panel"
        aria-label="Toggle settings"
        class="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        :style="{ background: showSettings ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)' }"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="2" stroke="rgba(255,255,255,0.5)" stroke-width="1.3"/>
          <path d="M8 1v2m0 10v2M1 8h2m10 0h2m-1.5-5.5L12 4m-8 8-1.5 1.5m0-11L4 4m8 8 1.5 1.5" stroke="rgba(255,255,255,0.5)" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Session dots -->
    <div class="flex items-center gap-1.5 mb-3" aria-label="Session progress" role="status">
      <div
        v-for="i in 4" :key="i"
        class="w-2.5 h-2.5 rounded-full transition-colors"
        :aria-label="`Session ${i}: ${(i - 1) < (sessions % 4) ? 'complete' : 'incomplete'}`"
        :style="{ background: (i - 1) < (sessions % 4) ? cfg.color : cfg.track }"
      />
      <span class="text-xs ml-1.5" style="color: rgba(255,255,255,0.5)">
        {{ sessions }} session{{ sessions !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Body doubling indicator -->
    <p class="text-xs mb-4" style="color: rgba(255,255,255,0.28)" aria-live="polite">
      {{ focuserCount }} {{ focuserCount === 1 ? 'person' : 'people' }} focusing right now
    </p>

    <!-- XP / level badge -->
    <div class="flex items-center gap-2 mb-4" aria-label="Experience points and level">
      <div
        class="flex items-center gap-1.5 rounded-full px-3 py-1"
        style="background: rgba(255,255,255,0.06)"
      >
        <span class="text-xs font-bold" :style="{ color: cfg.color }">Lv {{ level }}</span>
        <span class="text-xs" style="color: rgba(255,255,255,0.35)">{{ levelTitle }}</span>
      </div>
      <div class="flex-1 max-w-24 rounded-full h-1" style="background: rgba(255,255,255,0.08)">
        <div
          class="h-1 rounded-full transition-all duration-700"
          :style="{ width: `${levelProgress * 100}%`, background: cfg.color }"
        />
      </div>
      <span v-if="!isMaxLevel" class="text-xs" style="color: rgba(255,255,255,0.3)">
        {{ xpToNextLevel }} XP
      </span>
    </div>

    <!-- Streak badge -->
    <div
      v-if="streak > 0"
      class="flex items-center gap-1.5 rounded-full px-3 py-1 mb-4"
      :style="{ background: isActiveToday ? `${cfg.color}18` : 'rgba(255,255,255,0.04)' }"
      :aria-label="`${streak}-day streak${isActiveToday ? ', active today' : ', not yet active today'}`"
    >
      <span :style="{ opacity: isActiveToday ? 1 : 0.4 }">🔥</span>
      <span class="text-xs font-semibold" :style="{ color: isActiveToday ? cfg.color : 'rgba(255,255,255,0.3)' }">
        {{ streak }} day{{ streak !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Today's focus bar -->
    <div class="w-full max-w-sm mb-6" role="meter" :aria-valuenow="todayMinutes" :aria-valuemax="todayTarget" aria-label="Today's focus time">
      <div class="flex justify-between mb-1">
        <span class="text-xs" style="color: rgba(255,255,255,0.5)">Today</span>
        <span class="text-xs" style="color: rgba(255,255,255,0.5)">{{ todayMinutes }} / {{ todayTarget }} min</span>
      </div>
      <div class="w-full rounded-full h-1" :style="{ background: cfg.track }">
        <div
          class="h-1 rounded-full transition-all duration-1000"
          :style="{ width: `${todayProgress * 100}%`, background: cfg.color }"
        />
      </div>
    </div>

    <!-- Settings panel -->
    <Transition name="settings">
      <SettingsPanel
        v-if="showSettings"
        id="settings-panel"
        :cfg="cfg"
        :durations="durations"
        :ambient-enabled="ambientEnabled"
        :focus-url="focusYouTubeUrl"
        :break-url="breakYouTubeUrl"
        @update-duration="updateDuration"
        @toggle-ambient="toggleAmbient(running, mode)"
        @update-focus-url="focusYouTubeUrl = $event"
        @update-break-url="breakYouTubeUrl = $event"
      />
    </Transition>

    <!-- YouTube mini-player -->
    <YouTubePlayer
      :url="activeYouTubeUrl"
      :playing="running"
      :cfg="cfg"
      @ended="onYouTubeEnded"
    />

    <BreakScreen
      :cfg="cfg"
      :is-break="isBreak"
      :running="running"
      :break-warning="breakWarning"
      :stretch-prompt="currentStretchPrompt"
    />

    <TodoList :cfg="cfg" :is-break="isBreak" :running="running" />

    <!-- Today's wins -->
    <div v-if="todayWins.length" class="w-full max-w-sm mt-6" aria-label="Today's wins">
      <p class="text-xs font-semibold uppercase tracking-widest mb-2" style="color: rgba(255,255,255,0.35)">
        Today's wins
      </p>
      <ul class="flex flex-col gap-1.5 list-none p-0 m-0">
        <li
          v-for="(win, i) in todayWins" :key="i"
          class="text-sm rounded-xl px-4 py-2.5"
          :style="{ background: cfg.doneBg, color: 'rgba(255,255,255,0.6)' }"
        >{{ win }}</li>
      </ul>
    </div>

    <SessionCompleteOverlay
      v-if="showCompletion"
      :sessions="sessions"
      :cfg="cfg"
      :xp-gained="completionXP"
      :did-level-up="completionLevelUp"
      :new-level="completionNewLevel"
      :level-title="completionLevelTitle"
      @dismiss="showCompletion = false"
      @add-win="addWin"
    />
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

.settings-enter-active, .settings-leave-active { transition: all 0.25s ease; }
.settings-enter-from, .settings-leave-to { opacity: 0; transform: translateY(-8px); }

.task-enter-active { transition: all 0.25s ease; }
.task-leave-active { transition: all 0.2s ease; }
.task-enter-from { opacity: 0; transform: translateY(-8px); }
.task-leave-to { opacity: 0; transform: translateX(20px); }
.task-move { transition: transform 0.25s ease; }
</style>
