<script setup>
import { useTodos } from '../composables/useTodos.js'

const props = defineProps({
  cfg: Object,
  isBreak: Boolean,
  running: Boolean,
})

const {
  todos, newTodo, editingId, editText, todoInput, editInput,
  pendingTodos, doneTodos, completedCount,
  addTodo, toggleTodo, deleteTodo, startEdit, saveEdit, cancelEdit,
} = useTodos()
</script>

<template>
  <div
    class="w-full max-w-sm"
    :class="{ 'opacity-30 pointer-events-none select-none': isBreak && running }"
  >
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold uppercase tracking-widest" style="color: rgba(255,255,255,0.3)">Tasks</h2>
      <span v-if="todos.length" class="text-xs" style="color: rgba(255,255,255,0.2)">
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
        class="flex-1 rounded-xl px-4 py-2.5 text-sm border focus:outline-none focus:ring-2 placeholder:opacity-30"
        :style="{ borderColor: 'rgba(255,255,255,0.08)', background: cfg.cardBg, color: 'rgba(255,255,255,0.85)' }"
      />
      <button
        @click="addTodo"
        class="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 transition-transform active:scale-95"
        :style="{ background: cfg.color, color: cfg.bg }"
      >+</button>
    </div>

    <TransitionGroup name="task" tag="div" class="flex flex-col gap-2">
      <div
        v-for="todo in pendingTodos" :key="todo.id"
        class="flex items-center gap-3 rounded-xl px-4 py-3 group"
        :style="{ background: cfg.cardBg, boxShadow: '0 1px 6px rgba(0,0,0,0.15)' }"
      >
        <button
          @click="toggleTodo(todo.id)"
          class="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
          :style="{ borderColor: cfg.track }"
        />
        <input
          v-if="editingId === todo.id"
          ref="editInput"
          v-model="editText"
          @keydown.enter="saveEdit(todo.id)"
          @keydown.escape="cancelEdit"
          @blur="saveEdit(todo.id)"
          class="flex-1 text-sm bg-transparent border-b focus:outline-none"
          :style="{ borderColor: cfg.color, color: 'rgba(255,255,255,0.85)' }"
        />
        <span
          v-else
          @dblclick="startEdit(todo)"
          class="flex-1 text-sm cursor-pointer select-none"
          style="color: rgba(255,255,255,0.8)"
        >{{ todo.text }}</span>
        <button
          @click="deleteTodo(todo.id)"
          class="opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs transition-opacity"
          style="color: rgba(255,255,255,0.2)"
        >✕</button>
      </div>
    </TransitionGroup>

    <div v-if="doneTodos.length" class="mt-4">
      <p class="text-xs font-medium uppercase tracking-widest mb-2" style="color: rgba(255,255,255,0.2)">Completed</p>
      <TransitionGroup name="task" tag="div" class="flex flex-col gap-1.5">
        <div
          v-for="todo in doneTodos" :key="todo.id"
          class="flex items-center gap-3 rounded-xl px-4 py-2.5 group"
          :style="{ background: cfg.doneBg }"
        >
          <button
            @click="toggleTodo(todo.id)"
            class="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
            :style="{ background: cfg.track }"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 5l2.5 2.5L8 3" :stroke="cfg.color" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="flex-1 text-sm line-through" style="color: rgba(255,255,255,0.25)">{{ todo.text }}</span>
          <button
            @click="deleteTodo(todo.id)"
            class="opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs transition-opacity"
            style="color: rgba(255,255,255,0.15)"
          >✕</button>
        </div>
      </TransitionGroup>
    </div>

    <p v-if="!todos.length" class="text-center py-6 text-sm" style="color: rgba(255,255,255,0.15)">
      Add a task to get started
    </p>
  </div>
</template>
