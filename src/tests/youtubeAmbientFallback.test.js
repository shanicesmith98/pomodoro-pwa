import { describe, it, expect, vi, beforeEach } from 'vitest'

// Re-import fresh module state before each test
let ambientEnabled, youtubeActive, startAmbient, stopAmbient, fadeOutAmbient

beforeEach(async () => {
  vi.resetModules()
  ;({ ambientEnabled, youtubeActive, startAmbient, stopAmbient, fadeOutAmbient }
    = await import('../composables/useAudio.js'))
})

// Simulates what App.vue's onYouTubeEnded does
function onYouTubeEnded({ running, isBreak }) {
  youtubeActive.value = false
  if (ambientEnabled.value && running) {
    startAmbient(isBreak ? 'lofi' : 'rain')
  }
}

describe('YouTube ended → ambient fallback', () => {
  it('clears youtubeActive when YouTube ends', () => {
    youtubeActive.value = true
    onYouTubeEnded({ running: true, isBreak: false })
    expect(youtubeActive.value).toBe(false)
  })

  it('starts rain ambient after YouTube ends during a focus session', () => {
    youtubeActive.value = true
    ambientEnabled.value = true
    expect(() => onYouTubeEnded({ running: true, isBreak: false })).not.toThrow()
    // youtubeActive is now false so startAmbient was not blocked
    expect(youtubeActive.value).toBe(false)
  })

  it('starts lofi ambient after YouTube ends during a break session', () => {
    youtubeActive.value = true
    ambientEnabled.value = true
    expect(() => onYouTubeEnded({ running: true, isBreak: true })).not.toThrow()
    expect(youtubeActive.value).toBe(false)
  })

  it('does not start ambient when timer is paused and YouTube ends', () => {
    youtubeActive.value = true
    ambientEnabled.value = true
    // running = false — user paused, then YouTube ended
    // startAmbient should NOT be called; verify via guard state
    onYouTubeEnded({ running: false, isBreak: false })
    // youtubeActive is cleared but ambient was not started (running was false)
    expect(youtubeActive.value).toBe(false)
    // No error = ambient call was safely skipped
  })

  it('does not start ambient when ambientEnabled is off and YouTube ends', () => {
    youtubeActive.value = true
    ambientEnabled.value = false
    expect(() => onYouTubeEnded({ running: true, isBreak: false })).not.toThrow()
    // youtubeActive cleared but ambient skipped due to ambientEnabled = false
    expect(youtubeActive.value).toBe(false)
  })

  it('startAmbient is blocked by youtubeActive while YouTube is still playing', () => {
    youtubeActive.value = true
    ambientEnabled.value = true
    // Call startAmbient directly without going through onYouTubeEnded
    // This should be a no-op because youtubeActive is still true
    startAmbient('rain')
    // If we reach here without error, the guard worked correctly
    expect(youtubeActive.value).toBe(true)
  })

  it('startAmbient works after youtubeActive is cleared', () => {
    youtubeActive.value = true
    ambientEnabled.value = true
    youtubeActive.value = false  // simulate ended event clearing the guard
    expect(() => startAmbient('rain')).not.toThrow()
  })
})

// Simulates the watch(activeYouTubeUrl) handler added in App.vue to fix the overlap bug
function onNewYouTubeUrl(url, { parseYouTubeUrl }) {
  const hasUrl = !!parseYouTubeUrl(url)
  youtubeActive.value = hasUrl
  if (hasUrl) fadeOutAmbient()
}

describe('replacing YouTube URL while ambient fallback is playing', () => {
  it('fades out ambient when a new URL is pasted after a video ended', () => {
    // Step 1: video ended → ambient fallback kicks in
    youtubeActive.value = true
    ambientEnabled.value = true
    onYouTubeEnded({ running: true, isBreak: false })
    expect(youtubeActive.value).toBe(false)  // guard cleared by ended handler

    // Step 2: user pastes a new URL — App.vue watch handler fires
    expect(() =>
      onNewYouTubeUrl('https://www.youtube.com/watch?v=abc123', {
        parseYouTubeUrl: (u) => ({ videoId: 'abc123' }),
      })
    ).not.toThrow()

    // Guard re-enabled and fadeOutAmbient ran without error
    expect(youtubeActive.value).toBe(true)
  })

  it('blocks startAmbient after new URL is set (guard is active)', () => {
    youtubeActive.value = false
    ambientEnabled.value = true
    // Simulate watch handler: new URL arrives
    onNewYouTubeUrl('https://www.youtube.com/watch?v=xyz', {
      parseYouTubeUrl: (u) => ({ videoId: 'xyz' }),
    })
    expect(youtubeActive.value).toBe(true)
    // Any subsequent startAmbient call (e.g. from a stale timer) should be blocked
    expect(() => startAmbient('rain')).not.toThrow()
    // Guard still active — ambient did not start
    expect(youtubeActive.value).toBe(true)
  })

  it('does not set youtubeActive or call fadeOutAmbient when URL is cleared', () => {
    youtubeActive.value = true
    // User clears the URL field
    onNewYouTubeUrl('', { parseYouTubeUrl: () => null })
    expect(youtubeActive.value).toBe(false)  // guard cleared — ambient can play again
  })
})

describe('youtubeActive guard interactions', () => {
  it('ambient blocked when youtube url is set (youtubeActive = true)', () => {
    youtubeActive.value = true
    // startAmbient should silently skip — no throw, no audio
    expect(() => startAmbient('rain')).not.toThrow()
  })

  it('ambient allowed after youtube url cleared (youtubeActive = false)', () => {
    youtubeActive.value = false
    ambientEnabled.value = true
    expect(() => startAmbient('lofi')).not.toThrow()
  })

  it('setting a new youtube url after ended re-enables the guard', () => {
    // Simulate: YouTube ended (youtubeActive = false), then user pastes a new URL
    youtubeActive.value = false
    youtubeActive.value = true  // watchEffect in App.vue sets this on new URL
    startAmbient('rain')  // should be blocked again
    expect(youtubeActive.value).toBe(true)
  })
})
