import { useEffect } from 'react'

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Map key to shortcut handler
      const key = e.code || e.key

      // Check for modifier combinations
      Object.entries(shortcuts).forEach(([shortcut, handler]) => {
        let matches = false

        if (shortcut === ' ' && key === 'Space') {
          matches = true
        } else if (key === 'Delete' && shortcut === 'Delete') {
          matches = true
        } else if (shortcut === 'z' && key === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          handler(e)
          return
        } else if (shortcut === 'y' && key === 'KeyY' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          handler(e)
          return
        }

        if (matches) {
          e.preventDefault()
          handler(e)
        }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
