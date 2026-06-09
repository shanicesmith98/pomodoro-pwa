<script setup>
const props = defineProps({
  radius: { type: Number, required: true },
  stroke: { type: Number, default: 8 },
  progress: { type: Number, default: 0 },
  color: { type: String, default: '#E07A5F' },
  trackColor: { type: String, default: '#3D2A24' }
})

const norm = Math.max(props.radius, 1)
const innerR = norm - props.stroke / 2
const circumference = 2 * Math.PI * innerR
</script>

<template>
  <svg :width="norm * 2" :height="norm * 2" class="block">
    <circle
      :cx="norm" :cy="norm" :r="innerR"
      fill="none" :stroke="trackColor" :stroke-width="stroke"
    />
    <circle
      :cx="norm" :cy="norm" :r="innerR"
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
