<script setup>
import { ref } from 'vue'
import { useTimer } from './composables/useTimer.js'
import { ambientEnabled, toggleAmbient } from './composables/useAudio.js'
import { MODES } from './config/modes.js'
import ProgressRing from './components/ProgressRing.vue'
import BreakScreen from './components/BreakScreen.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import TodoList from './components/TodoList.vue'

const showSettings = ref(false)

const {
  mode, running, sessions, durations, timeLeft, currentStretchPrompt,
  cfg, progress, isBreak, breakWarning,
  formatTime, toggleTimer, resetTimer, switchMode, updateDuration,
} = useTimer()
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
      >{{ val.label }}</button>
    </div>

    <!-- Timer ring -->
    <div class="relative flex items-center justify-center mb-6">
      <ProgressRing
        :radius="110" :stroke="8"
        :progress="progress"
        :color="cfg.ring" :track-color="cfg.track"
      />
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="timer-display" :style="{ color: cfg.color }">{{ formatTime(timeLeft) }}</span>
        <span
          class="text-xs mt-1.5 font-medium uppercase tracking-widest"
          :style="{ color: cfg.color, opacity: 0.5 }"
        >{{ cfg.label }}</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-3 mb-2">
      <button
        @click="toggleTimer"
        class="px-8 py-2.5 rounded-full text-sm font-semibold tracking-wide uppercase transition-transform active:scale-95"
        :style="{ background: cfg.color, color: cfg.bg }"
      >{{ running ? 'Pause' : 'Start' }}</button>

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
      <SettingsPanel
        v-if="showSettings"
        :cfg="cfg"
        :durations="durations"
        :ambient-enabled="ambientEnabled"
        @update-duration="updateDuration"
        @toggle-ambient="toggleAmbient(running, mode)"
      />
    </Transition>

    <BreakScreen
      :cfg="cfg"
      :is-break="isBreak"
      :running="running"
      :break-warning="breakWarning"
      :stretch-prompt="currentStretchPrompt"
    />

    <TodoList :cfg="cfg" :is-break="isBreak" :running="running" />

    <p class="mt-8 text-xs" style="color: rgba(255,255,255,0.15)">Double-tap a task to edit</p>
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
