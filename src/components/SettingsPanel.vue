<script setup>
import { MODES } from '../config/modes.js'

defineProps({
  cfg:            { type: Object,  required: true },
  durations:      { type: Object,  required: true },
  ambientEnabled: { type: Boolean, default: true },
  focusUrl:       { type: String,  default: '' },
  breakUrl:       { type: String,  default: '' },
})

defineEmits(['updateDuration', 'toggleAmbient', 'updateFocusUrl', 'updateBreakUrl'])

const durationFields = Object.entries(MODES).map(([key, val]) => ({ key, label: val.label }))
</script>

<template>
  <div
    class="w-full max-w-sm rounded-2xl p-4 mb-6"
    :style="{ background: cfg.cardBg, boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }"
    role="region"
    aria-label="Settings"
    id="settings-panel"
  >
    <!-- Ambient sound toggle -->
    <div class="flex items-center justify-between mb-4">
      <p class="text-xs font-semibold uppercase tracking-widest" style="color: rgba(255,255,255,0.5)">Ambient sound</p>
      <button
        @click="$emit('toggleAmbient')"
        :aria-pressed="ambientEnabled"
        aria-label="Toggle ambient sound"
        class="text-xs px-3 py-1 rounded-full transition-colors"
        :style="{ background: ambientEnabled ? cfg.color : 'rgba(255,255,255,0.08)', color: ambientEnabled ? cfg.bg : 'rgba(255,255,255,0.4)' }"
      >{{ ambientEnabled ? 'On' : 'Off' }}</button>
    </div>

    <!-- Duration inputs -->
    <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color: rgba(255,255,255,0.5)">
      Duration (minutes)
    </p>
    <div class="flex gap-3 mb-5">
      <label
        v-for="{ key, label } in durationFields" :key="key"
        class="flex-1 flex flex-col items-center gap-1"
      >
        <span class="text-xs" style="color: rgba(255,255,255,0.5)">{{ label }}</span>
        <input
          type="number" :min="1" :max="120"
          :value="durations[key]"
          :aria-label="`${label} duration in minutes`"
          @input="$emit('updateDuration', key, $event.target.value)"
          class="w-full text-center rounded-lg border py-1.5 text-sm font-medium focus:outline-none focus:ring-2"
          :style="{ borderColor: 'rgba(255,255,255,0.1)', background: cfg.inputBg, color: 'rgba(255,255,255,0.85)' }"
        />
      </label>
    </div>

    <!-- YouTube music URLs -->
    <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color: rgba(255,255,255,0.5)">
      Music (YouTube URL)
    </p>
    <div class="flex flex-col gap-2">
      <label class="flex flex-col gap-1">
        <span class="text-xs" style="color: rgba(255,255,255,0.4)">Focus</span>
        <input
          type="url"
          :value="focusUrl"
          placeholder="youtube.com/watch?v=… or playlist"
          aria-label="YouTube URL for focus music"
          @change="$emit('updateFocusUrl', $event.target.value)"
          class="w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-2 placeholder:opacity-30"
          :style="{ borderColor: 'rgba(255,255,255,0.1)', background: cfg.inputBg, color: 'rgba(255,255,255,0.8)' }"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-xs" style="color: rgba(255,255,255,0.4)">Break</span>
        <input
          type="url"
          :value="breakUrl"
          placeholder="youtube.com/watch?v=… or playlist"
          aria-label="YouTube URL for break music"
          @change="$emit('updateBreakUrl', $event.target.value)"
          class="w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-2 placeholder:opacity-30"
          :style="{ borderColor: 'rgba(255,255,255,0.1)', background: cfg.inputBg, color: 'rgba(255,255,255,0.8)' }"
        />
      </label>
    </div>
  </div>
</template>
