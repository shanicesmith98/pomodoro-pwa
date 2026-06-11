import { ref, onMounted, onUnmounted } from 'vue'

// Realistic focus activity curve by hour (0–23), index = hour
const HOURLY_BASE = [
  2, 1, 1, 1, 2, 4, 8, 14,   // 0–7:  night → early morning ramp
  22, 28, 32, 30, 26, 22, 24, 27, // 8–15: peak morning, post-lunch dip, afternoon
  25, 20, 15, 10, 7, 5, 4, 3,    // 16–23: evening wind-down
]

// Weekends are quieter
const DAY_MULTIPLIER = [0.45, 1, 1, 1, 1, 1, 0.55] // Sun=0, Mon=1 … Sat=6

function generateCount() {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const day = now.getDay()

  // Interpolate between current and next hour for smooth transitions
  const base = HOURLY_BASE[hour]
  const next = HOURLY_BASE[(hour + 1) % 24]
  const interpolated = base + (next - base) * (minute / 60)

  const scaled = Math.round(interpolated * DAY_MULTIPLIER[day])

  // Add deterministic-ish jitter seeded by the current 3-minute window
  // so it doesn't change every second but does drift naturally
  const timeWindow = Math.floor(now.getTime() / (3 * 60 * 1000))
  const jitter = ((timeWindow * 2654435761) >>> 0) % 7 - 3  // -3 to +3
  return Math.max(1, scaled + jitter)
}

export function useBodyDoubling() {
  const focuserCount = ref(generateCount())

  onMounted(() => {
    const interval = setInterval(() => {
      focuserCount.value = generateCount()
    }, 3 * 60 * 1000)
    onUnmounted(() => clearInterval(interval))
  })

  return { focuserCount }
}
