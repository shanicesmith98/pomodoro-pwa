import { ref, computed, watch, nextTick } from 'vue'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

export function useTodos() {
  const todos = ref(loadJSON('pomo-todos', []))
  const newTodo = ref('')
  const editingId = ref(null)
  const editText = ref('')
  const todoInput = ref(null)
  const editInput = ref(null)

  const pendingTodos = computed(() => todos.value.filter(t => !t.done))
  const doneTodos = computed(() => todos.value.filter(t => t.done))
  const completedCount = computed(() => doneTodos.value.length)

  watch(todos, (val) => localStorage.setItem('pomo-todos', JSON.stringify(val)), { deep: true })

  function addTodo() {
    const text = newTodo.value.trim()
    if (!text) return
    todos.value.push({ id: Date.now(), text, done: false })
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
    nextTick(() => editInput.value?.focus())
  }

  function saveEdit(id) {
    const t = todos.value.find(t => t.id === id)
    if (t) t.text = editText.value.trim() || t.text
    editingId.value = null
  }

  function cancelEdit() {
    editingId.value = null
  }

  return {
    todos, newTodo, editingId, editText, todoInput, editInput,
    pendingTodos, doneTodos, completedCount,
    addTodo, toggleTodo, deleteTodo, startEdit, saveEdit, cancelEdit,
  }
}
