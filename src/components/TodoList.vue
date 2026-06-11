<script setup>
import { computed, ref } from 'vue'
import { useTodos } from '../composables/useTodos.js'



const props = defineProps({
  cfg:     { type: Object,  required: true },
  isBreak: { type: Boolean, default: false },
  running: { type: Boolean, default: false },
})

const {
  todos, newTodo, editingId, editText, todoInput, editInput,
  pendingTodos, doneTodos, completedCount, activeTask, pinnedTaskId,
  addTodo, toggleTodo, deleteTodo, startEdit, saveEdit, cancelEdit, setEstimate, setActiveTask,
} = useTodos()

const showAll = ref(false)
const focusMode = computed(() => props.running && !props.isBreak)
const spinning = ref(false)

function spinWheel() {
  if (pendingTodos.value.length < 2 || spinning.value) return
  spinning.value = true

  const TICKS = 8
  const INTERVAL_MS = 60
  let tick = 0
  const originalId = pinnedTaskId.value  // capture before the spin mutates it

  const cycle = setInterval(() => {
    // Pick a random task that isn't the current highlight, for visual variety
    const others = pendingTodos.value.filter(t => t.id !== activeTask.value?.id)
    const pool = others.length ? others : pendingTodos.value
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setActiveTask(pick.id)
    tick++
    if (tick >= TICKS) {
      clearInterval(cycle)
      // Final pick: anything except where we started
      const finalPool = pendingTodos.value.length > 1
        ? pendingTodos.value.filter(t => t.id !== originalId)
        : pendingTodos.value
      setActiveTask(finalPool[Math.floor(Math.random() * finalPool.length)].id)
      spinning.value = false
    }
  }, INTERVAL_MS)
}

function accuracyLabel(todo) {
  if (!todo.estimate && !todo.actual) return null
  const est = todo.estimate ?? '?'
  const act = todo.actual ?? 0
  return `${est} est · ${act} actual`
}

function accuracyColor(todo) {
  if (!todo.estimate || !todo.actual) return 'rgba(255,255,255,0.3)'
  const diff = todo.actual - todo.estimate
  if (diff <= 0) return '#6BC4B4'
  if (diff === 1) return '#E8C87A'
  return '#E07A5F'
}
</script>

<template>
  <div
    class="w-full max-w-sm"
    :class="{ 'opacity-30 pointer-events-none select-none': isBreak && running }"
  >
    <!-- Focus card: shown when work session is running -->
    <Transition name="task">
      <div v-if="focusMode" class="mb-4">
        <div
          v-if="activeTask"
          class="rounded-2xl px-5 py-4"
          :style="{ background: cfg.cardBg, boxShadow: '0 1px 12px rgba(0,0,0,0.2)' }"
        >
          <p class="text-xs font-semibold uppercase tracking-widest mb-2" style="color: rgba(255,255,255,0.5)">Now focusing on</p>
          <div class="flex items-start gap-3">
            <button
              @click="toggleTodo(activeTask.id)"
              :aria-label="`Mark '${activeTask.text}' as complete`"
              class="w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 transition-colors"
              :style="{ borderColor: cfg.color }"
            />
            <p class="text-base leading-snug flex-1" style="color: rgba(255,255,255,0.9)">{{ activeTask.text }}</p>
          </div>
          <div v-if="activeTask.estimate" class="mt-2 ml-8 text-xs" :style="{ color: cfg.color, opacity: 0.6 }">
            {{ activeTask.estimate }} pomodoro{{ activeTask.estimate !== 1 ? 's' : '' }} estimated
            <span v-if="activeTask.actual"> · {{ activeTask.actual }} actual so far</span>
          </div>
        </div>
        <p v-else class="text-center text-sm py-3" style="color: rgba(255,255,255,0.35)">
          No tasks — add one below to get started.
        </p>

        <button
          @click="showAll = !showAll"
          :aria-expanded="showAll"
          aria-controls="full-task-list"
          class="mt-2 w-full text-xs py-1.5 text-center transition-colors"
          style="color: rgba(255,255,255,0.35)"
        >{{ showAll ? 'Hide task list' : 'See all tasks' }}</button>
      </div>
    </Transition>

    <!-- Full task list -->
    <div id="full-task-list" v-show="!focusMode || showAll">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold uppercase tracking-widest" style="color: rgba(255,255,255,0.5)">Tasks</h2>
        <span v-if="todos.length" class="text-xs" style="color: rgba(255,255,255,0.35)">
          {{ completedCount }}/{{ todos.length }} done
        </span>
      </div>

      <div class="flex gap-2 mb-4">
        <input
          ref="todoInput"
          v-model="newTodo"
          @keydown.enter="addTodo"
          type="text"
          placeholder="What are you working on?"
          aria-label="New task"
          class="flex-1 rounded-xl px-4 py-2.5 text-sm border focus:outline-none focus:ring-2 placeholder:opacity-30"
          :style="{ borderColor: 'rgba(255,255,255,0.08)', background: cfg.cardBg, color: 'rgba(255,255,255,0.85)' }"
        />
        <button
          @click="addTodo"
          aria-label="Add task"
          class="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 transition-transform active:scale-95"
          :style="{ background: cfg.color, color: cfg.bg }"
          aria-hidden="false"
        >+</button>
      </div>

      <TransitionGroup name="task" tag="ul" class="flex flex-col gap-2 list-none p-0 m-0" aria-label="Pending tasks">
        <li
          v-for="todo in pendingTodos" :key="todo.id"
          class="flex items-center gap-3 rounded-xl px-4 py-3 group transition-all"
          :class="{ 'cursor-pointer': focusMode && todo.id !== activeTask?.id }"
          :style="{
            background: cfg.cardBg,
            boxShadow: focusMode && todo.id === activeTask?.id
              ? `0 0 0 2px ${cfg.color}, 0 1px 6px rgba(0,0,0,0.15)`
              : '0 1px 6px rgba(0,0,0,0.15)',
          }"
          @click.self="focusMode && setActiveTask(todo.id)"
        >
          <button
            @click="toggleTodo(todo.id)"
            :aria-label="`Mark '${todo.text}' as complete`"
            class="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
            :style="{ borderColor: focusMode && todo.id === activeTask?.id ? cfg.color : cfg.track }"
          />
          <input
            v-if="editingId === todo.id"
            ref="editInput"
            v-model="editText"
            @keydown.enter="saveEdit(todo.id)"
            @keydown.escape="cancelEdit"
            @blur="saveEdit(todo.id)"
            :aria-label="`Edit task: ${todo.text}`"
            class="flex-1 text-sm bg-transparent border-b focus:outline-none"
            :style="{ borderColor: cfg.color, color: 'rgba(255,255,255,0.85)' }"
          />
          <span
            v-else
            @dblclick="!focusMode && startEdit(todo)"
            @click="focusMode && setActiveTask(todo.id)"
            :aria-label="focusMode ? `Focus on '${todo.text}'` : todo.text"
            :aria-pressed="focusMode ? todo.id === activeTask?.id : undefined"
            :role="focusMode ? 'button' : undefined"
            class="flex-1 text-sm select-none transition-colors"
            :class="{ 'cursor-pointer': focusMode }"
            :style="{
              color: focusMode && todo.id === activeTask?.id
                ? 'rgba(255,255,255,0.95)'
                : 'rgba(255,255,255,0.8)',
            }"
          >{{ todo.text }}</span>
          <input
            type="number"
            min="1" max="20"
            :value="todo.estimate ?? ''"
            placeholder="—"
            :aria-label="`Estimated pomodoros for '${todo.text}'`"
            @change="setEstimate(todo.id, $event.target.value)"
            class="w-8 text-center text-xs rounded-md bg-transparent border focus:outline-none focus:ring-1 py-0.5 placeholder:opacity-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            :style="{ borderColor: todo.estimate ? cfg.color : 'rgba(255,255,255,0.12)', color: todo.estimate ? cfg.color : 'rgba(255,255,255,0.35)' }"
          />
          <button
            @click="deleteTodo(todo.id)"
            :aria-label="`Delete '${todo.text}'`"
            class="opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs transition-opacity"
            style="color: rgba(255,255,255,0.35)"
          >✕</button>
        </li>
      </TransitionGroup>

      <!-- Random task picker -->
      <Transition name="spin-btn">
        <div v-if="pendingTodos.length >= 2" class="mt-3 flex justify-center">
          <button
            @click="spinWheel"
            :disabled="spinning"
            aria-label="Pick a random task to focus on"
            class="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all active:scale-95"
            :class="{ 'spin-shake': spinning }"
            :style="{
              background: 'rgba(255,255,255,0.06)',
              color: spinning ? cfg.color : 'rgba(255,255,255,0.4)',
              border: `1px solid ${spinning ? cfg.color + '60' : 'rgba(255,255,255,0.08)'}`,
              cursor: spinning ? 'default' : 'pointer',
            }"
          >
            <svg
              width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
              :class="{ 'spin-icon': spinning }"
            >
              <circle cx="6.5" cy="6.5" r="5.5" :stroke="spinning ? cfg.color : 'rgba(255,255,255,0.4)'" stroke-width="1.2"/>
              <path d="M4 6.5h5M6.5 4l2.5 2.5L6.5 9" :stroke="spinning ? cfg.color : 'rgba(255,255,255,0.4)'" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ spinning ? 'Picking…' : 'Pick for me' }}
          </button>
        </div>
      </Transition>

      <div v-if="doneTodos.length" class="mt-4">
        <p class="text-xs font-medium uppercase tracking-widest mb-2" style="color: rgba(255,255,255,0.35)">Completed</p>
        <TransitionGroup name="task" tag="ul" class="flex flex-col gap-1.5 list-none p-0 m-0" aria-label="Completed tasks">
          <li
            v-for="todo in doneTodos" :key="todo.id"
            class="flex items-center gap-3 rounded-xl px-4 py-2.5 group"
            :style="{ background: cfg.doneBg }"
          >
            <button
              @click="toggleTodo(todo.id)"
              :aria-label="`Mark '${todo.text}' as incomplete`"
              class="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
              :style="{ background: cfg.track }"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 5l2.5 2.5L8 3" :stroke="cfg.color" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="flex-1 min-w-0">
              <span class="text-sm line-through block" style="color: rgba(255,255,255,0.25)">{{ todo.text }}</span>
              <span
                v-if="accuracyLabel(todo)"
                class="text-xs"
                :style="{ color: accuracyColor(todo) }"
                :aria-label="`Calibration: ${accuracyLabel(todo)}`"
              >{{ accuracyLabel(todo) }}</span>
            </div>
            <button
              @click="deleteTodo(todo.id)"
              :aria-label="`Delete '${todo.text}'`"
              class="opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs transition-opacity shrink-0"
              style="color: rgba(255,255,255,0.25)"
            >✕</button>
          </li>
        </TransitionGroup>
      </div>

      <p v-if="!todos.length" class="text-center py-6 text-sm" style="color: rgba(255,255,255,0.35)">
        Add a task to get started
      </p>
    </div>

    <p class="mt-8 text-xs text-center" style="color: rgba(255,255,255,0.25)">
      {{ focusMode ? 'Tap a task to switch focus' : 'Double-tap a task to edit' }}
    </p>
  </div>
</template>

<style scoped>
.spin-icon {
  animation: spin 0.5s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin-btn-enter-active,
.spin-btn-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.spin-btn-enter-from,
.spin-btn-leave-to { opacity: 0; transform: translateY(4px); }
</style>
