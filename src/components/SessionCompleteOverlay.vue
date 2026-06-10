<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  sessions: { type: Number, required: true },
  cfg:      { type: Object,  required: true },
})

const emit = defineEmits(['dismiss'])

let timer = null
onMounted(() => { timer = setTimeout(() => emit('dismiss'), 2800) })
onUnmounted(() => clearTimeout(timer))

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  angle: (i / 16) * 360,
  distance: 60 + Math.random() * 50,
  delay: Math.random() * 0.15,
  size: 4 + Math.random() * 5,
}))
</script>

<template>
  <Transition name="completion">
    <div
      class="fixed inset-0 flex items-center justify-center z-50"
      style="background: rgba(0,0,0,0.55); backdrop-filter: blur(4px)"
      role="status"
      aria-live="assertive"
      :aria-label="`Session ${sessions} complete!`"
      @click="$emit('dismiss')"
    >
      <div class="relative flex flex-col items-center select-none">
        <!-- Particle burst -->
        <svg class="absolute" width="240" height="240" viewBox="0 0 240 240" aria-hidden="true">
          <circle
            v-for="(p, i) in PARTICLES" :key="i"
            :cx="120 + Math.cos((p.angle * Math.PI) / 180) * p.distance"
            :cy="120 + Math.sin((p.angle * Math.PI) / 180) * p.distance"
            :r="p.size / 2"
            :fill="cfg.color"
            class="particle"
            :style="{ animationDelay: `${p.delay}s`, opacity: 0 }"
          />
        </svg>

        <!-- Central badge -->
        <div
          class="relative z-10 flex flex-col items-center gap-2 rounded-3xl px-10 py-8 badge"
          :style="{ background: cfg.cardBg, boxShadow: `0 0 40px ${cfg.color}33` }"
        >
          <span class="text-5xl" aria-hidden="true">✦</span>
          <p class="text-lg font-semibold" :style="{ color: cfg.color }">Session complete!</p>
          <p class="text-sm" style="color: rgba(255,255,255,0.5)">
            {{ sessions }} session{{ sessions !== 1 ? 's' : '' }} today
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.completion-enter-active { animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.completion-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.completion-leave-to    { opacity: 0; transform: scale(0.9); }

@keyframes popIn {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}

.badge {
  animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.particle {
  animation: burst 0.6s ease-out forwards;
}

@keyframes burst {
  0%   { opacity: 0; transform: scale(0); }
  30%  { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.5) translateY(8px); }
}
</style>
