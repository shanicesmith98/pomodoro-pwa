import { ref, watch } from 'vue'

function loadJSON(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback }
  catch { return fallback }
}

export const focusYouTubeUrl = ref(loadJSON('yt-focus-url', ''))
export const breakYouTubeUrl = ref(loadJSON('yt-break-url', ''))

watch(focusYouTubeUrl, v => localStorage.setItem('yt-focus-url', JSON.stringify(v)))
watch(breakYouTubeUrl, v => localStorage.setItem('yt-break-url', JSON.stringify(v)))

export function parseYouTubeUrl(url) {
  if (!url || !url.trim()) return null
  try {
    const u = new URL(url.trim())
    const listId = u.searchParams.get('list')
    let videoId = u.searchParams.get('v')
    if (!videoId && u.hostname === 'youtu.be') videoId = u.pathname.slice(1).split('?')[0]
    if (listId) return { type: 'playlist', listId, videoId: videoId || undefined }
    if (videoId) return { type: 'video', videoId }
  } catch {}
  return null
}

// Singleton API loader — resolves once the YT script fires onYouTubeIframeAPIReady
let apiPromise = null

export function loadYouTubeApi() {
  if (apiPromise) return apiPromise
  apiPromise = new Promise(resolve => {
    if (window.YT && window.YT.Player) { resolve(); return }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev()
      resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return apiPromise
}
