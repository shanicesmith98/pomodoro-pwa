// Stub Web Audio API — must be real constructors (used with `new`)
function makeGain() {
  return {
    gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect() {},
  }
}
function makeOscillator() {
  return { type: 'sine', frequency: { setValueAtTime() {}, value: 440 }, detune: { value: 0 }, connect() {}, start() {}, stop() {} }
}
function makeBufferSource() {
  return { buffer: null, loop: false, connect() {}, start() {}, stop() {} }
}
function makeBiquad() {
  return { type: 'lowpass', frequency: { value: 0 }, Q: { value: 0 }, connect() {} }
}

function MockAudioContext() {
  this.state = 'running'
  this.currentTime = 0
  this.sampleRate = 44100
  this.destination = {}
  this.resume = () => Promise.resolve()
  this.createGain = makeGain
  this.createOscillator = makeOscillator
  this.createBufferSource = makeBufferSource
  this.createBiquadFilter = makeBiquad
  this.createBuffer = (channels, length) => ({ getChannelData: () => new Float32Array(length) })
}

global.AudioContext = MockAudioContext
global.webkitAudioContext = MockAudioContext

// Stub Notification API
global.Notification = { permission: 'default', requestPermission: vi.fn() }

// Stub navigator.wakeLock
global.navigator.wakeLock = { request: vi.fn().mockResolvedValue({ release: vi.fn() }) }

// localStorage is available in happy-dom but we clear it between tests
beforeEach(() => localStorage.clear())
