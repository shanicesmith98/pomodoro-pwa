import { ref, computed, watch, nextTick } from 'vue'
import { loadJSON } from '../utils/storage.js'

// Module-level singletons — all callers share the same reactive state
const todos = ref(loadJSON('pomo-todos', []))
const newTodo = ref('')
const editingId = ref(null)
const editText = ref('')
const todoInput = ref(null)
const editInput = ref(null)

const pendingTodos = computed(() => todos.value.filter(t => !t.done))
const doneTodos = computed(() => todos.value.filter(t => t.done))
const completedCount = computed(() => doneTodos.value.length)
const activeTask = computed(() => pendingTodos.value[0] ?? null)

watch(todos, (val) => localStorage.setItem('pomo-todos', JSON.stringify(val)), { deep: true })

function addTodo() {
  const text = newTodo.value.trim()
  if (!text) return
  todos.value.push({ id: Date.now(), text, done: false, estimate: null })
  newTodo.value = ''
  nextTick(() => todoInput.value?.focus())
}

function toggleTodo(id) {
  const t = todos.value.find(t => t.id === id)
  if (t) t.done = !t.done
}

function deleteTodo(id) {
  todos.value = todos.value.filter(t => t.id !== id)
}

function startEdit(todo) {
  editingId.value = todo.id
  editText.value = todo.text
  nextTick(() => {
    const el = Array.isArray(editInput.value) ? editInput.value[0] : editInput.value
    el?.focus()
  })
}

function saveEdit(id) {
  const t = todos.value.find(t => t.id === id)
  if (t) t.text = editText.value.trim() || t.text
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

function setEstimate(id, val) {
  const t = todos.value.find(t => t.id === id)
  if (!t) return
  const num = parseInt(val)
  t.estimate = (num > 0 && num <= 20) ? num : null
}

function incrementActual(id) {
  const t = todos.value.find(t => t.id === id)
  if (!t) return
  t.actual = (t.actual ?? 0) + 1
}

export function useTodos() {
  return {
    todos, newTodo, editingId, editText, todoInput, editInput,
    pendingTodos, doneTodos, completedCount, activeTask,
    addTodo, toggleTodo, deleteTodo, startEdit, saveEdit, cancelEdit, setEstimate, incrementActual,
  }
}
