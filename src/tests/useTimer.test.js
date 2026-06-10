import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

// Run a composable inside a real component instance so lifecycle hooks work
function withSetup(composableFn) {
  let result
  mount(defineComponent({
    setup() { result = composableFn(); return () => {} },
    template: '<div />',
  }))
  return result
}

// Re-import fresh module state before each test
let useTimer
beforeEach(async () => {
  vi.resetModules()
  ;({ useTimer } = await import('../composables/useTimer.js'))
})

describe('initial state', () => {
  it('starts in work mode, not running', () => {
    const { mode, running, sessions } = withSetup(() => useTimer())
    expect(mode.value).toBe('work')
    expect(running.value).toBe(false)
    expect(sessions.value).toBe(0)
  })

  it('timeLeft matches work duration in seconds', () => {
    const { timeLeft, durations } = withSetup(() => useTimer())
    expect(timeLeft.value).toBe(durations.value.work * 60)
  })

  it('progress is 0 before timer starts', () => {
    const { progress } = withSetup(() => useTimer())
    expect(progress.value).toBe(0)
  })
})

describe('toggleTimer', () => {
  it('sets running true on first toggle', () => {
    const { running, toggleTimer } = withSetup(() => useTimer())
    toggleTimer()
    expect(running.value).toBe(true)
  })

  it('sets running false on second toggle (pause)', () => {
    const { running, toggleTimer } = withSetup(() => useTimer())
    toggleTimer()
    toggleTimer()
    expect(running.value).toBe(false)
  })
})

describe('resetTimer', () => {
  it('stops the timer and restores full duration', () => {
    const { running, timeLeft, durations, toggleTimer, resetTimer } = withSetup(() => useTimer())
    toggleTimer()
    timeLeft.value = 100  // simulate some elapsed time
    resetTimer()
    expect(running.value).toBe(false)
    expect(timeLeft.value).toBe(durations.value.work * 60)
  })
})

describe('switchMode', () => {
  it('changes mode and resets timeLeft to new duration', () => {
    const { mode, timeLeft, durations, switchMode } = withSetup(() => useTimer())
    switchMode('shortBreak')
    expect(mode.value).toBe('shortBreak')
    expect(timeLeft.value).toBe(durations.value.shortBreak * 60)
  })

  it('switching mode stops a running timer', () => {
    const { running, toggleTimer, switchMode } = withSetup(() => useTimer())
    toggleTimer()
    expect(running.value).toBe(true)
    switchMode('longBreak')
    expect(running.value).toBe(false)
  })
})

describe('updateDuration', () => {
  it('clamps values below 1 to 1', () => {
    const { durations, updateDuration } = withSetup(() => useTimer())
    updateDuration('work', 0)
    expect(durations.value.work).toBe(1)
  })

  it('clamps values above 120 to 120', () => {
    const { durations, updateDuration } = withSetup(() => useTimer())
    updateDuration('work', 999)
    expect(durations.value.work).toBe(120)
  })

  it('updates timeLeft when changing current mode duration while paused', () => {
    const { timeLeft, updateDuration } = withSetup(() => useTimer())
    updateDuration('work', 30)
    expect(timeLeft.value).toBe(30 * 60)
  })

  it('does not update timeLeft when timer is running', () => {
    const { timeLeft, toggleTimer, updateDuration } = withSetup(() => useTimer())
    toggleTimer()
    const before = timeLeft.value
    updateDuration('work', 30)
    expect(timeLeft.value).toBe(before)
  })
})

describe('isBreak / breakWarning', () => {
  it('isBreak is false in work mode', () => {
    const { isBreak } = withSetup(() => useTimer())
    expect(isBreak.value).toBe(false)
  })

  it('isBreak is true in shortBreak mode', () => {
    const { isBreak, switchMode } = withSetup(() => useTimer())
    switchMode('shortBreak')
    expect(isBreak.value).toBe(true)
  })

  it('isBreak is true in longBreak mode', () => {
    const { isBreak, switchMode } = withSetup(() => useTimer())
    switchMode('longBreak')
    expect(isBreak.value).toBe(true)
  })

  it('breakWarning is false when not running', () => {
    const { breakWarning, switchMode } = withSetup(() => useTimer())
    switchMode('shortBreak')
    expect(breakWarning.value).toBe(false)
  })

  it('breakWarning is true when break is running with ≤20% time left', () => {
    const { breakWarning, timeLeft, totalDuration, switchMode, toggleTimer } = withSetup(() => useTimer())
    switchMode('shortBreak')
    toggleTimer()
    // Set time left to 10% of total
    timeLeft.value = Math.floor(totalDuration.value * 0.1)
    expect(breakWarning.value).toBe(true)
  })

  it('breakWarning is false when break is running with >20% time left', () => {
    const { breakWarning, timeLeft, totalDuration, switchMode, toggleTimer } = withSetup(() => useTimer())
    switchMode('shortBreak')
    toggleTimer()
    timeLeft.value = Math.floor(totalDuration.value * 0.5)
    expect(breakWarning.value).toBe(false)
  })
})

describe('session completion flow (simulated)', () => {
  it('increments sessions and switches to shortBreak after 4th tick hits 0', async () => {
    vi.useFakeTimers()
    const { mode, sessions, running, timeLeft, toggleTimer } = withSetup(() => useTimer())

    // Fast-forward: set time to 1 second, start, let interval fire
    timeLeft.value = 1
    toggleTimer()
    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(sessions.value).toBe(1)
    expect(mode.value).toBe('shortBreak')
    expect(running.value).toBe(false)
    vi.useRealTimers()
  })

  it('switches to longBreak after every 4th work session', async () => {
    vi.useFakeTimers()
    const { mode, sessions, timeLeft, toggleTimer, switchMode } = withSetup(() => useTimer())

    for (let i = 0; i < 4; i++) {
      switchMode('work')
      timeLeft.value = 1
      toggleTimer()
      vi.advanceTimersByTime(1000)
      await nextTick()
      // Skip through the break to get back to work
      if (i < 3) switchMode('work')
    }

    expect(sessions.value).toBe(4)
    expect(mode.value).toBe('longBreak')
    vi.useRealTimers()
  })

  it('showCompletion is true after a work session ends', async () => {
    vi.useFakeTimers()
    const { showCompletion, timeLeft, toggleTimer } = withSetup(() => useTimer())

    timeLeft.value = 1
    toggleTimer()
    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(showCompletion.value).toBe(true)
    vi.useRealTimers()
  })
})

describe('formatTime', () => {
  it('formats seconds into MM:SS with zero-padding', () => {
    const { formatTime } = withSetup(() => useTimer())
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(65)).toBe('01:05')
    expect(formatTime(25 * 60)).toBe('25:00')
  })
})

describe('todayMinutes', () => {
  it('starts at 0 with empty localStorage', () => {
    const { todayMinutes } = withSetup(() => useTimer())
    expect(todayMinutes.value).toBe(0)
  })

  it('accumulates minutes after a session completes', async () => {
    vi.useFakeTimers()
    const { todayMinutes, timeLeft, durations, toggleTimer } = withSetup(() => useTimer())
    const workMins = durations.value.work

    timeLeft.value = 1
    toggleTimer()
    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(todayMinutes.value).toBe(workMins)
    vi.useRealTimers()
  })
})
