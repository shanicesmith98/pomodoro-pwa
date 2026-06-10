<script setup>
defineProps({
  cfg: Object,
  isBreak: Boolean,
  running: Boolean,
  breakWarning: Boolean,
  stretchPrompt: String,
})
</script>

<template>
  <Transition name="settings">
    <div
      v-if="breakWarning"
      class="w-full max-w-sm rounded-2xl px-5 py-3 mb-4 text-center"
      :style="{ background: cfg.cardBg }"
    >
      <p class="text-sm font-medium" :style="{ color: cfg.color }">Break ending soon — start wrapping up.</p>
    </div>
  </Transition>

  <Transition name="settings">
    <div v-if="isBreak && running" class="w-full max-w-sm mb-6">
      <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color: rgba(255,255,255,0.3)">
        Stretch prompt
      </p>
      <div class="rounded-2xl px-5 py-4" :style="{ background: cfg.cardBg }">
        <p class="text-sm leading-relaxed" style="color: rgba(255,255,255,0.75)">{{ stretchPrompt }}</p>
      </div>
    </div>
  </Transition>
</template>
