<script setup>
import { MODES } from '../config/modes.js'

defineProps({
  cfg:            { type: Object,  required: true },
  durations:      { type: Object,  required: true },
  ambientEnabled: { type: Boolean, default: true },
})

defineEmits(['updateDuration', 'toggleAmbient'])

const durationFields = Object.entries(MODES).map(([key, val]) => ({ key, label: val.label }))
</script>

<template>
  <div
    class="w-full max-w-sm rounded-2xl p-4 mb-6"
    :style="{ background: cfg.cardBg, boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }"
    role="region"
    aria-label="Settings"
  >
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

    <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color: rgba(255,255,255,0.5)">
      Duration (minutes)
    </p>
    <div class="flex gap-3">
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
  </div>
</template>
