<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  sessions:   { type: Number,  required: true },
  cfg:        { type: Object,  required: true },
  xpGained:   { type: Number,  default: 0 },
  didLevelUp: { type: Boolean, default: false },
  newLevel:   { type: Number,  default: 1 },
  levelTitle: { type: String,  default: '' },
})

const emit = defineEmits(['dismiss'])

let timer = null
onMounted(() => { timer = setTimeout(() => emit('dismiss'), 3200) })
onUnmounted(() => clearTimeout(timer))

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  angle: (i / 18) * 360,
  distance: 55 + (i % 3) * 20,
  delay: (i % 4) * 0.06,
  size: 4 + (i % 3) * 2,
}))
</script>

<template>
  <Transition name="completion">
    <div
      class="fixed inset-0 flex items-center justify-center z-50"
      style="background: rgba(0,0,0,0.55); backdrop-filter: blur(4px)"
      role="status"
      aria-live="assertive"
      :aria-label="`Session ${sessions} complete! +${xpGained} XP${didLevelUp ? `. Level up to ${levelTitle}!` : ''}`"
      @click="$emit('dismiss')"
    >
      <div class="relative flex flex-col items-center select-none">
        <!-- Particle burst -->
        <svg class="absolute pointer-events-none" width="260" height="260" viewBox="0 0 260 260" aria-hidden="true">
          <circle
            v-for="(p, i) in PARTICLES" :key="i"
            :cx="130 + Math.cos((p.angle * Math.PI) / 180) * p.distance"
            :cy="130 + Math.sin((p.angle * Math.PI) / 180) * p.distance"
            :r="p.size / 2"
            :fill="cfg.color"
            class="particle"
            :style="{ animationDelay: `${p.delay}s` }"
          />
        </svg>

        <!-- Central badge -->
        <div
          class="relative z-10 flex flex-col items-center gap-3 rounded-3xl px-10 py-8 badge"
          :style="{ background: cfg.cardBg, boxShadow: `0 0 48px ${cfg.color}44` }"
        >
          <!-- Level-up banner -->
          <Transition name="levelup">
            <div
              v-if="didLevelUp"
              class="absolute -top-5 left-0 right-0 flex justify-center"
            >
              <span
                class="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full levelup-badge"
                :style="{ background: cfg.color, color: cfg.bg }"
              >Level up!</span>
            </div>
          </Transition>

          <span class="text-5xl" aria-hidden="true">✦</span>
          <p class="text-lg font-semibold" :style="{ color: cfg.color }">Session complete!</p>
          <p class="text-sm" style="color: rgba(255,255,255,0.5)">
            {{ sessions }} session{{ sessions !== 1 ? 's' : '' }} today
          </p>

          <!-- XP row -->
          <div
            class="flex items-center gap-2 rounded-full px-4 py-1.5 xp-pop"
            style="background: rgba(255,255,255,0.06)"
          >
            <span class="text-xs font-bold" :style="{ color: cfg.color }">+{{ xpGained }} XP</span>
            <span class="text-xs" style="color: rgba(255,255,255,0.4)">·</span>
            <span class="text-xs" style="color: rgba(255,255,255,0.5)">
              {{ didLevelUp ? levelTitle : `Level ${newLevel}` }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.completion-enter-active { animation: popIn 0.38s cubic-bezier(0.34, 1.56, 0.64, 1); }
.completion-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.completion-leave-to    { opacity: 0; transform: scale(0.9); }

@keyframes popIn {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}

.badge { animation: popIn 0.38s cubic-bezier(0.34, 1.56, 0.64, 1); }

.xp-pop { animation: popIn 0.4s 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

.levelup-badge { animation: popIn 0.45s 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

.particle { opacity: 0; animation: burst 0.7s ease-out forwards; }

@keyframes burst {
  0%   { opacity: 0; transform: scale(0); }
  25%  { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.4) translateY(6px); }
}

.levelup-enter-active { animation: popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
</style>
