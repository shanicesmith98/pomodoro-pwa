import { describe, it, expect, vi, beforeEach } from 'vitest'

let useTodos
beforeEach(async () => {
  vi.resetModules()
  ;({ useTodos } = await import('../composables/useTodos.js'))
})

describe('addTodo', () => {
  it('adds a task to the list', () => {
    const { todos, newTodo, addTodo } = useTodos()
    newTodo.value = 'Write tests'
    addTodo()
    expect(todos.value).toHaveLength(1)
    expect(todos.value[0].text).toBe('Write tests')
  })

  it('does not add empty or whitespace-only tasks', () => {
    const { todos, newTodo, addTodo } = useTodos()
    newTodo.value = '   '
    addTodo()
    expect(todos.value).toHaveLength(0)
  })

  it('clears the input after adding', () => {
    const { newTodo, addTodo } = useTodos()
    newTodo.value = 'Task'
    addTodo()
    expect(newTodo.value).toBe('')
  })

  it('sets done: false and estimate: null by default', () => {
    const { todos, newTodo, addTodo } = useTodos()
    newTodo.value = 'Task'
    addTodo()
    expect(todos.value[0].done).toBe(false)
    expect(todos.value[0].estimate).toBeNull()
  })
})

describe('toggleTodo', () => {
  it('marks a pending task as done', () => {
    const { todos, newTodo, addTodo, toggleTodo } = useTodos()
    newTodo.value = 'Task'
    addTodo()
    toggleTodo(todos.value[0].id)
    expect(todos.value[0].done).toBe(true)
  })

  it('unmarks a done task back to pending', () => {
    const { todos, newTodo, addTodo, toggleTodo } = useTodos()
    newTodo.value = 'Task'
    addTodo()
    toggleTodo(todos.value[0].id)
    toggleTodo(todos.value[0].id)
    expect(todos.value[0].done).toBe(false)
  })
})

describe('deleteTodo', () => {
  it('removes the task from the list', () => {
    const { todos, newTodo, addTodo, deleteTodo } = useTodos()
    newTodo.value = 'Task'
    addTodo()
    deleteTodo(todos.value[0].id)
    expect(todos.value).toHaveLength(0)
  })

  it('does not affect other tasks', async () => {
    const { todos, newTodo, addTodo, deleteTodo } = useTodos()
    newTodo.value = 'First'
    addTodo()
    const firstId = todos.value[0].id
    await new Promise(r => setTimeout(r, 2))  // ensure distinct Date.now() ids
    newTodo.value = 'Second'
    addTodo()
    deleteTodo(firstId)
    expect(todos.value).toHaveLength(1)
    expect(todos.value[0].text).toBe('Second')
  })
})

describe('setEstimate', () => {
  it('sets a valid estimate (1–20)', () => {
    const { todos, newTodo, addTodo, setEstimate } = useTodos()
    newTodo.value = 'Task'
    addTodo()
    setEstimate(todos.value[0].id, '3')
    expect(todos.value[0].estimate).toBe(3)
  })

  it('rejects 0 and sets estimate to null', () => {
    const { todos, newTodo, addTodo, setEstimate } = useTodos()
    newTodo.value = 'Task'
    addTodo()
    setEstimate(todos.value[0].id, '0')
    expect(todos.value[0].estimate).toBeNull()
  })

  it('rejects values above 20', () => {
    const { todos, newTodo, addTodo, setEstimate } = useTodos()
    newTodo.value = 'Task'
    addTodo()
    setEstimate(todos.value[0].id, '21')
    expect(todos.value[0].estimate).toBeNull()
  })

  it('rejects non-numeric strings', () => {
    const { todos, newTodo, addTodo, setEstimate } = useTodos()
    newTodo.value = 'Task'
    addTodo()
    setEstimate(todos.value[0].id, 'abc')
    expect(todos.value[0].estimate).toBeNull()
  })
})

describe('incrementActual', () => {
  it('initialises actual to 1 on first increment', () => {
    const { todos, newTodo, addTodo, incrementActual } = useTodos()
    newTodo.value = 'Task'
    addTodo()
    incrementActual(todos.value[0].id)
    expect(todos.value[0].actual).toBe(1)
  })

  it('increments existing actual count', () => {
    const { todos, newTodo, addTodo, incrementActual } = useTodos()
    newTodo.value = 'Task'
    addTodo()
    incrementActual(todos.value[0].id)
    incrementActual(todos.value[0].id)
    expect(todos.value[0].actual).toBe(2)
  })
})

describe('computed helpers', () => {
  it('pendingTodos contains only undone tasks', () => {
    const { newTodo, addTodo, toggleTodo, todos, pendingTodos } = useTodos()
    newTodo.value = 'A'; addTodo()
    newTodo.value = 'B'; addTodo()
    toggleTodo(todos.value[0].id)
    expect(pendingTodos.value).toHaveLength(1)
    expect(pendingTodos.value[0].text).toBe('B')
  })

  it('doneTodos contains only completed tasks', () => {
    const { newTodo, addTodo, toggleTodo, todos, doneTodos } = useTodos()
    newTodo.value = 'A'; addTodo()
    newTodo.value = 'B'; addTodo()
    toggleTodo(todos.value[0].id)
    expect(doneTodos.value).toHaveLength(1)
    expect(doneTodos.value[0].text).toBe('A')
  })

  it('activeTask is the first pending todo', () => {
    const { newTodo, addTodo, activeTask } = useTodos()
    newTodo.value = 'First'; addTodo()
    newTodo.value = 'Second'; addTodo()
    expect(activeTask.value.text).toBe('First')
  })

  it('activeTask is null when all tasks are done', () => {
    const { newTodo, addTodo, toggleTodo, todos, activeTask } = useTodos()
    newTodo.value = 'Task'; addTodo()
    toggleTodo(todos.value[0].id)
    expect(activeTask.value).toBeNull()
  })

  it('completedCount reflects done task count', () => {
    const { newTodo, addTodo, toggleTodo, todos, completedCount } = useTodos()
    newTodo.value = 'A'; addTodo()
    newTodo.value = 'B'; addTodo()
    toggleTodo(todos.value[0].id)
    expect(completedCount.value).toBe(1)
  })
})

describe('localStorage persistence', () => {
  it('persists todos on change', async () => {
    const { newTodo, addTodo } = useTodos()
    newTodo.value = 'Persisted task'
    addTodo()
    await new Promise(r => setTimeout(r, 0))  // flush watcher
    const stored = JSON.parse(localStorage.getItem('pomo-todos'))
    expect(stored[0].text).toBe('Persisted task')
  })

  it('loads todos from localStorage on init', async () => {
    localStorage.setItem('pomo-todos', JSON.stringify([
      { id: 1, text: 'Stored task', done: false, estimate: 2 }
    ]))
    vi.resetModules()
    const { useTodos: fresh } = await import('../composables/useTodos.js')
    const { todos } = fresh()
    expect(todos.value[0].text).toBe('Stored task')
    expect(todos.value[0].estimate).toBe(2)
  })
})
