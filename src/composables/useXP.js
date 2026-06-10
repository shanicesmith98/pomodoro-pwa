import { ref, computed } from 'vue'
import { loadJSON } from '../utils/storage.js'

const XP_PER_SESSION = 10

// Total XP needed to reach each level (index = level - 1)
const LEVEL_THRESHOLDS = [0, 30, 80, 150, 250, 380, 540, 730, 960, 1240]

const LEVEL_TITLES = [
  'Seedling', 'Sprout', 'Sapling', 'Focused',
  'Consistent', 'Dedicated', 'Unstoppable', 'Flow State',
  'Deep Work', 'Legendary',
]

function computeLevel(xp) {
  let lv = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) lv = i + 1
    else break
  }
  return Math.min(lv, LEVEL_THRESHOLDS.length)
}

export function useXP() {
  const totalXP = ref(loadJSON('pomo-xp', 0))

  const level = computed(() => computeLevel(totalXP.value))
  const levelTitle = computed(() => LEVEL_TITLES[level.value - 1])

  const levelProgress = computed(() => {
    const lo = LEVEL_THRESHOLDS[level.value - 1]
    const hi = LEVEL_THRESHOLDS[level.value] ?? (lo + XP_PER_SESSION * 10)
    return (totalXP.value - lo) / (hi - lo)
  })

  const xpToNextLevel = computed(() => {
    const hi = LEVEL_THRESHOLDS[level.value] ?? null
    if (hi === null) return null
    return hi - totalXP.value
  })

  const isMaxLevel = computed(() => level.value >= LEVEL_THRESHOLDS.length)

  // Returns { xpGained, didLevelUp, newLevel }
  function addSessionXP() {
    const prevLevel = level.value
    totalXP.value += XP_PER_SESSION
    localStorage.setItem('pomo-xp', JSON.stringify(totalXP.value))
    const newLevel = level.value
    return { xpGained: XP_PER_SESSION, didLevelUp: newLevel > prevLevel, newLevel }
  }

  return { totalXP, level, levelTitle, levelProgress, xpToNextLevel, isMaxLevel, addSessionXP }
}
