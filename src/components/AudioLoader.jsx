import { useRef, useState } from 'react'

export default function AudioLoader({ onAudioLoaded, setStatus }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

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

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={`bg-slate-800 border rounded-lg p-4 ${dragOver ? 'border-blue-400 bg-slate-700' : 'border-slate-700'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <label className="block text-sm text-slate-300 mb-2">Load audio</label>
      <div className="flex gap-3 items-center">
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
        <span className="text-xs text-slate-400">or drag & drop an audio file here</span>
      </div>
      <p className="text-xs text-slate-400 mt-2">Supported: WAV, MP3, AAC, OGG — browser-decoded formats.</p>
    </div>
  )
}
