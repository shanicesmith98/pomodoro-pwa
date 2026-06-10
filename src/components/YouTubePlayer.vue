<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { loadYouTubeApi, parseYouTubeUrl } from '../composables/useYouTube.js'

const props = defineProps({
  url:     { type: String,  default: '' },
  playing: { type: Boolean, default: false },
  cfg:     { type: Object,  required: true },
})

// Increment to force Vue to replace the inner div after destroy()
const playerKey = ref(0)
const playerId  = computed(() => `yt-player-${playerKey.value}`)
const parsed    = computed(() => parseYouTubeUrl(props.url))
const ready     = ref(false)
let ytPlayer = null
let initSeq = 0  // guards against stale inits when url changes rapidly

async function initPlayer() {
  if (!parsed.value) return
  const seq = ++initSeq
  await loadYouTubeApi()
  if (seq !== initSeq) return  // a newer init superseded this one

  const vars = { rel: 0, modestbranding: 1, autoplay: 0 }
  if (parsed.value.type === 'playlist') {
    vars.listType = 'playlist'
    vars.list     = parsed.value.listId
    if (parsed.value.videoId) vars.videoId = parsed.value.videoId
  }

  ytPlayer = new window.YT.Player(playerId.value, {
    height: '80',
    width: '100%',
    videoId: parsed.value.type === 'video' ? parsed.value.videoId : undefined,
    playerVars: vars,
    events: {
      onReady() {
        if (seq !== initSeq) return  // stale — a newer player took over
        ready.value = true
        if (props.playing) ytPlayer.playVideo()
      },
    },
  })
}

function destroyPlayer() {
  initSeq++  // invalidate any in-flight init
  if (!ytPlayer) return
  try { ytPlayer.destroy() } catch {}
  ytPlayer = null
  ready.value = false
}

watch(() => props.url, async () => {
  destroyPlayer()
  if (!props.url) return
  playerKey.value++   // new div id → fresh DOM node after nextTick
  await nextTick()
  initPlayer()
})

watch(() => props.playing, (val) => {
  if (!ready.value || !ytPlayer) return
  val ? ytPlayer.playVideo() : ytPlayer.pauseVideo()
})

onMounted(() => { if (props.url) initPlayer() })
onUnmounted(destroyPlayer)
</script>

<template>
  <Transition name="yt-player">
    <div
      v-if="parsed"
      class="w-full max-w-sm mb-4 rounded-2xl overflow-hidden"
      :style="{ boxShadow: '0 2px 16px rgba(0,0,0,0.3)', border: `1px solid ${cfg.color}22` }"
      aria-label="YouTube music player"
    >
      <!-- Label strip -->
      <div
        class="flex items-center gap-2 px-3 py-1.5"
        :style="{ background: cfg.cardBg }"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <rect width="12" height="12" rx="2.5" fill="#FF0000"/>
          <polygon points="4.5,3 9,6 4.5,9" fill="white"/>
        </svg>
        <span class="text-xs" :style="{ color: cfg.color, opacity: 0.7 }">
          {{ parsed.type === 'playlist' ? 'Playlist' : 'Video' }} · {{ playing ? 'Playing' : 'Paused' }}
        </span>
      </div>
      <!-- YT iframe mounts here -->
      <div :id="playerId" :key="playerKey" />
    </div>
  </Transition>
</template>

<style scoped>
.yt-player-enter-active, .yt-player-leave-active { transition: all 0.25s ease; }
.yt-player-enter-from, .yt-player-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
