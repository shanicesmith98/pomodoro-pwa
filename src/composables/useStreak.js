import { ref, computed } from 'vue'
import { loadJSON, todayKey } from '../utils/storage.js'

function yesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Stored shape: { streak: number, lastDate: 'YYYY-MM-DD' }
const stored = loadJSON('pomo-streak', { streak: 0, lastDate: null })

const streak = ref(stored.streak)
const lastDate = ref(stored.lastDate)

function persist() {
  localStorage.setItem('pomo-streak', JSON.stringify({
    streak: streak.value,
    lastDate: lastDate.value,
  }))
}

// Call once after a work session completes
export function recordSessionDay() {
  const today = todayKey()
  if (lastDate.value === today) return  // already counted today

  if (lastDate.value === yesterdayKey()) {
    streak.value++   // continuing a streak
  } else {
    streak.value = 1  // streak broken or first ever session
  }

  lastDate.value = today
  persist()
}

export function useStreak() {
  const isActiveToday = computed(() => lastDate.value === todayKey())

  return { streak, isActiveToday }
}
