import { ref, computed } from 'vue'
import { loadJSON } from '../utils/storage.js'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

// Stored shape: { 'YYYY-MM-DD': ['win note', ...], ... }
const log = ref(loadJSON('pomo-wins', {}))

function persist() {
  localStorage.setItem('pomo-wins', JSON.stringify(log.value))
}

export function useWinLog() {
  const todayWins = computed(() => log.value[todayKey()] ?? [])

  function addWin(note) {
    const text = note.trim()
    if (!text) return
    const today = todayKey()
    if (!log.value[today]) log.value[today] = []
    log.value[today].push(text)
    persist()
  }

  return { todayWins, addWin }
}
