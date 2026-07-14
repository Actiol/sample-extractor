import { useRef } from 'react'

export default function AudioLoader({ onAudioLoaded, setStatus }) {
  const inputRef = useRef(null)

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setStatus(`Loading ${file.name}...`)
    try {
      const arrayBuffer = await file.arrayBuffer()
      // Pass raw arrayBuffer to parent so the app can decode with the main AudioContext (avoids cross-context issues)
      onAudioLoaded(arrayBuffer)
    } catch (err) {
      console.error(err)
      setStatus('Failed to load audio file')
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <label className="block text-sm text-slate-300 mb-2">Load audio</label>
      <div className="flex gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="input-field"
        />
        <button
          onClick={() => inputRef.current && inputRef.current.click()}
          className="btn-primary"
        >
          Browse
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">Supported: WAV, MP3, AAC, OGG — browser-decoded formats.</p>
    </div>
  )
}
