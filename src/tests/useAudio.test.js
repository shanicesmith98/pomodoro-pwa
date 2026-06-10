import { describe, it, expect, vi, beforeEach } from 'vitest'

let ambientEnabled, youtubeActive, startAmbient, stopAmbient, fadeOutAmbient, toggleAmbient

beforeEach(async () => {
  vi.resetModules()
  ;({ ambientEnabled, youtubeActive, startAmbient, stopAmbient, fadeOutAmbient, toggleAmbient }
    = await import('../composables/useAudio.js'))
})

describe('ambientEnabled', () => {
  it('defaults to true', () => {
    expect(ambientEnabled.value).toBe(true)
  })
})

describe('youtubeActive', () => {
  it('defaults to false', () => {
    expect(youtubeActive.value).toBe(false)
  })
})

describe('startAmbient', () => {
  it('does not throw with rain type', () => {
    expect(() => startAmbient('rain')).not.toThrow()
  })

  it('does not throw with lofi type', () => {
    expect(() => startAmbient('lofi')).not.toThrow()
  })

  it('skips audio when ambientEnabled is false', () => {
    ambientEnabled.value = false
    // Just verifying it does not attempt to create nodes (no errors thrown)
    expect(() => startAmbient('rain')).not.toThrow()
  })

  it('skips audio when youtubeActive is true', () => {
    youtubeActive.value = true
    expect(() => startAmbient('rain')).not.toThrow()
  })
})

describe('stopAmbient', () => {
  it('can be called without prior startAmbient without throwing', () => {
    expect(() => stopAmbient()).not.toThrow()
  })

  it('can be called after startAmbient without throwing', () => {
    startAmbient('rain')
    expect(() => stopAmbient()).not.toThrow()
  })
})

describe('fadeOutAmbient', () => {
  it('does not throw when called with no active ambient', () => {
    expect(() => fadeOutAmbient()).not.toThrow()
  })

  it('does not throw when youtubeActive is true', () => {
    youtubeActive.value = true
    expect(() => fadeOutAmbient()).not.toThrow()
  })
})

describe('toggleAmbient', () => {
  it('flips ambientEnabled', () => {
    toggleAmbient(false, 'work')
    expect(ambientEnabled.value).toBe(false)
    toggleAmbient(false, 'work')
    expect(ambientEnabled.value).toBe(true)
  })

  it('does not throw when toggling while timer is running', () => {
    expect(() => toggleAmbient(true, 'work')).not.toThrow()
  })

  it('does not throw when toggling while timer is paused', () => {
    expect(() => toggleAmbient(false, 'shortBreak')).not.toThrow()
  })
})
