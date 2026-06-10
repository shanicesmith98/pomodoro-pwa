<script setup>
import { computed } from 'vue'

const props = defineProps({
  radius:     { type: Number, required: true, validator: v => v > 0 },
  stroke:     { type: Number, default: 8,     validator: v => v > 0 },
  progress:   { type: Number, default: 0,     validator: v => v >= 0 && v <= 1 },
  color:      { type: String, default: '#8B9ADF' },
  trackColor: { type: String, default: '#252540' },
  label:      { type: String, default: 'Timer progress' },
})

const size = computed(() => props.radius * 2)
const innerR = computed(() => props.radius - props.stroke / 2)
const circumference = computed(() => 2 * Math.PI * innerR.value)
</script>

<template>
  <svg
    :width="size" :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    class="block"
    role="img"
    :aria-label="label"
  >
    <circle
      :cx="radius" :cy="radius" :r="innerR"
      fill="none" :stroke="trackColor" :stroke-width="stroke"
    />
    <circle
      :cx="radius" :cy="radius" :r="innerR"
      fill="none" :stroke="color" :stroke-width="stroke"
      stroke-linecap="round"
      :stroke-dasharray="circumference"
      :stroke-dashoffset="circumference * (1 - progress)"
      class="progress-arc"
    />
  </svg>
</template>

<style scoped>
.progress-arc {
  transition: stroke-dashoffset 0.4s ease, stroke 0.5s ease;
  transform: rotate(-90deg);
  transform-origin: center;
}
</style>
