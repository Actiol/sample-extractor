import { useState, useCallback } from 'react'

export function useUndoRedo(initialValue) {
  const [history, setHistory] = useState([initialValue])
  const [historyIndex, setHistoryIndex] = useState(0)

  const state = history[historyIndex]

  const push = useCallback((newState) => {
    // Remove any "future" states when pushing a new one
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  const undo = useCallback(() => {
    setHistoryIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const redo = useCallback(() => {
    setHistoryIndex((prev) => Math.min(history.length - 1, prev + 1))
  }, [history.length])

  return {
    state,
    push,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  }
}
