import { describe, it, expect, vi, beforeEach } from 'vitest'

let useXP
beforeEach(async () => {
  vi.resetModules()
  ;({ useXP } = await import('../composables/useXP.js'))
})

describe('initial state', () => {
  it('starts at 0 XP, level 1, title Seedling', () => {
    const { totalXP, level, levelTitle } = useXP()
    expect(totalXP.value).toBe(0)
    expect(level.value).toBe(1)
    expect(levelTitle.value).toBe('Seedling')
  })

  it('levelProgress is 0 at start', () => {
    const { levelProgress } = useXP()
    expect(levelProgress.value).toBe(0)
  })

  it('isMaxLevel is false at level 1', () => {
    const { isMaxLevel } = useXP()
    expect(isMaxLevel.value).toBe(false)
  })
})

describe('addSessionXP', () => {
  it('adds 10 XP per session', () => {
    const { totalXP, addSessionXP } = useXP()
    addSessionXP()
    expect(totalXP.value).toBe(10)
  })

  it('persists XP to localStorage', () => {
    const { addSessionXP } = useXP()
    addSessionXP()
    expect(JSON.parse(localStorage.getItem('pomo-xp'))).toBe(10)
  })

  it('returns xpGained = 10', () => {
    const { addSessionXP } = useXP()
    const result = addSessionXP()
    expect(result.xpGained).toBe(10)
  })

  it('returns didLevelUp false when not crossing a threshold', () => {
    const { addSessionXP } = useXP()
    const result = addSessionXP()  // 10 XP, threshold for L2 is 30
    expect(result.didLevelUp).toBe(false)
  })

  it('returns didLevelUp true when crossing level threshold', () => {
    const { totalXP, addSessionXP } = useXP()
    totalXP.value = 20  // one more session (10 XP) will hit 30 → level 2
    const result = addSessionXP()
    expect(result.didLevelUp).toBe(true)
    expect(result.newLevel).toBe(2)
  })
})

describe('level progression', () => {
  it('reaches level 2 at 30 XP', () => {
    const { totalXP, level } = useXP()
    totalXP.value = 30
    expect(level.value).toBe(2)
  })

  it('stays at level 2 before reaching level 3 threshold (80 XP)', () => {
    const { totalXP, level } = useXP()
    totalXP.value = 79
    expect(level.value).toBe(2)
  })

  it('reaches level 3 at 80 XP', () => {
    const { totalXP, level, levelTitle } = useXP()
    totalXP.value = 80
    expect(level.value).toBe(3)
    expect(levelTitle.value).toBe('Sapling')
  })

  it('levelProgress is between 0 and 1 within a level', () => {
    const { totalXP, levelProgress } = useXP()
    totalXP.value = 50  // midway through level 2 (30–80)
    expect(levelProgress.value).toBeGreaterThan(0)
    expect(levelProgress.value).toBeLessThan(1)
  })

  it('xpToNextLevel decreases as XP increases', () => {
    const { totalXP, xpToNextLevel } = useXP()
    totalXP.value = 0
    const before = xpToNextLevel.value
    totalXP.value = 10
    expect(xpToNextLevel.value).toBeLessThan(before)
  })
})

describe('localStorage hydration', () => {
  it('loads saved XP on init', async () => {
    localStorage.setItem('pomo-xp', JSON.stringify(80))
    vi.resetModules()
    const { useXP: freshUseXP } = await import('../composables/useXP.js')
    const { totalXP, level } = freshUseXP()
    expect(totalXP.value).toBe(80)
    expect(level.value).toBe(3)
  })
})
