<script setup>
defineProps({
  cfg:           { type: Object,  required: true },
  isBreak:       { type: Boolean, default: false },
  running:       { type: Boolean, default: false },
  breakWarning:  { type: Boolean, default: false },
  stretchPrompt: { type: String,  default: '' },
})
</script>

<template>
  <Transition name="break-warning">
    <div
      v-if="breakWarning"
      role="status"
      aria-live="polite"
      class="w-full max-w-sm rounded-2xl px-5 py-3 mb-4 text-center"
      :style="{ background: cfg.cardBg }"
    >
      <p class="text-sm font-medium" :style="{ color: cfg.color }">Break ending soon — start wrapping up.</p>
    </div>
  </Transition>

  <Transition name="stretch-prompt">
    <div v-if="isBreak && running" class="w-full max-w-sm mb-6" aria-live="polite">
      <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color: rgba(255,255,255,0.5)">
        Stretch prompt
      </p>
      <div class="rounded-2xl px-5 py-4" :style="{ background: cfg.cardBg }">
        <p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.75)">{{ stretchPrompt }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.break-warning-enter-active, .break-warning-leave-active,
.stretch-prompt-enter-active, .stretch-prompt-leave-active {
  transition: all 0.25s ease;
}
.break-warning-enter-from, .break-warning-leave-to,
.stretch-prompt-enter-from, .stretch-prompt-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
