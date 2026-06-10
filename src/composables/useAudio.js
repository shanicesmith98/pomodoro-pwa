import { ref } from 'vue'

let sharedCtx = null
let ambientNodes = []
let ambientMaster = null
let fadeOutTimer = null

export const ambientEnabled = ref(true)
export const youtubeActive = ref(false)

function getAudioCtx() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (sharedCtx.state === 'suspended') sharedCtx.resume()
  return sharedCtx
}

function playNote(ctx, freq, startTime, duration, volume = 0.25, type = 'sine') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function playChime(type = 'work') {
  const ctx = getAudioCtx()

  if (type === 'work') {
    // Satisfying ascending major arpeggio with a final chord bloom
    const arp = [523.25, 659.25, 783.99, 1046.5]
    let t = ctx.currentTime
    arp.forEach((freq, i) => {
      playNote(ctx, freq, t, 0.7, i === arp.length - 1 ? 0.3 : 0.22)
      t += 0.16
    })
    // Bloom: play all notes together at the end
    const bloom = ctx.currentTime + arp.length * 0.16 + 0.05
    arp.forEach(freq => playNote(ctx, freq, bloom, 1.4, 0.12, 'sine'))
  } else {
    // Gentle descending for break end
    const notes = [783.99, 659.25, 523.25]
    let t = ctx.currentTime
    notes.forEach(freq => {
      playNote(ctx, freq, t, 0.6, 0.2)
      t += 0.18
    })
  }
}

export function stopAmbient() {
  if (fadeOutTimer) { clearTimeout(fadeOutTimer); fadeOutTimer = null }
  ambientNodes.forEach(n => { try { n.stop() } catch {} })
  ambientNodes = []
  ambientMaster = null
}

export function fadeOutAmbient() {
  if (!ambientMaster || youtubeActive.value) return
  const ctx = getAudioCtx()
  ambientMaster.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5)
  fadeOutTimer = setTimeout(stopAmbient, 1600)
}

function buildRain(ctx, master) {
  const bufferSize = ctx.sampleRate * 3
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  noise.loop = true

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2200

  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 600
  bp.Q.value = 0.6

  const gain = ctx.createGain()
  gain.gain.value = 0.35

  noise.connect(lp)
  lp.connect(bp)
  bp.connect(gain)
  gain.connect(master)
  noise.start()
  ambientNodes.push(noise)
}

function buildLofi(ctx, master) {
  const chordFreqs = [87.3, 130.8, 164.8, 220]
  chordFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = i === 0 ? 'sine' : 'triangle'
    osc.frequency.value = freq
    osc.detune.value = (Math.random() - 0.5) * 10

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 700

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.25 + Math.random() * 0.15
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.04
    lfo.connect(lfoDepth)

    const gain = ctx.createGain()
    gain.gain.value = i === 0 ? 0.18 : 0.1
    lfoDepth.connect(gain.gain)

    osc.connect(lp)
    lp.connect(gain)
    gain.connect(master)
    osc.start()
    lfo.start()
    ambientNodes.push(osc, lfo)
  })
}

export function startAmbient(type) {
  stopAmbient()
  if (!ambientEnabled.value || youtubeActive.value) return

  const ctx = getAudioCtx()
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, ctx.currentTime)
  master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2)
  master.connect(ctx.destination)
  ambientMaster = master

  type === 'rain' ? buildRain(ctx, master) : buildLofi(ctx, master)
}

export function toggleAmbient(isRunning, currentMode) {
  ambientEnabled.value = !ambientEnabled.value
  if (!isRunning) return
  ambientEnabled.value
    ? startAmbient(currentMode === 'work' ? 'rain' : 'lofi')
    : fadeOutAmbient()
}
