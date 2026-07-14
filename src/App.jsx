import { useState, useRef, useEffect, useCallback } from 'react'
import Editor from './components/Editor'
import Sidebar from './components/Sidebar'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useAudioProcessing } from './hooks/useAudioProcessing'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useUndoRedo } from './hooks/useUndoRedo'

export default function App() {
  const audioContextRef = useRef(null)
  const player = useAudioPlayer(audioContextRef)
  const { computeAverage } = useAudioProcessing()

  // Audio state
  const [audioBuffer, setAudioBuffer] = useState(null)
  const [bpm, setBpm] = useState(120)
  const [offset, setOffset] = useState(0)
  
  // Undo/redo for samples
  const { state: samples, push: setSamples, undo, redo, canUndo, canRedo } = useUndoRedo([])

  // UI state
  const [averagedSample, setAveragedSample] = useState(null)
  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [metronomeVolume, setMetronomeVolume] = useState(0.3)
  const [playerVolume, setPlayerVolume] = useState(1)
  const [status, setStatus] = useState('Load an audio file to begin')
  const [showSettings, setShowSettings] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [subdivision, setSubdivision] = useState(4)
  const [zoom, setZoom] = useState(100)

  // Recalculate averaged sample when samples change
  useEffect(() => {
    if (audioBuffer && samples.length > 0) {
      const averaged = computeAverage(audioBuffer, samples)
      setAveragedSample(averaged)
    } else {
      setAveragedSample(null)
    }
  }, [samples, audioBuffer, computeAverage])

  // Setup audio context metronome
  useEffect(() => {
    let intervalId = null
    let timeoutId = null
    if (!metronomeEnabled || !audioContextRef.current || !player.isPlaying) return

    const playClick = () => {
      try {
        const ctx = audioContextRef.current
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        o.frequency.value = 1000
        g.gain.value = metronomeVolume
        o.connect(g).connect(ctx.destination)
        const now = ctx.currentTime
        g.gain.setValueAtTime(metronomeVolume, now)
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
        o.start(now)
        o.stop(now + 0.1)
      } catch (e) {}
    }

    const schedule = () => {
      const beatSec = 60 / Math.max(1, bpm)
      const offsetSec = offset / 1000
      const pos = player.getCurrentTime ? player.getCurrentTime() : 0
      let n = Math.ceil((pos - offsetSec) / beatSec)
      if (pos < offsetSec) n = 0
      const nextBeat = offsetSec + n * beatSec
      const delayMs = Math.max(0, (nextBeat - pos) * 1000)
      timeoutId = setTimeout(() => {
        playClick()
        intervalId = setInterval(playClick, beatSec * 1000)
      }, delayMs)
    }

    if (player.isPlaying) schedule()

    const checkId = setInterval(() => {
      if (player.isPlaying && !intervalId && !timeoutId) schedule()
      if (!player.isPlaying && intervalId) {
        clearInterval(intervalId)
        intervalId = null
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
      }
    }, 200)

    return () => {
      clearInterval(checkId)
      if (intervalId) clearInterval(intervalId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [metronomeEnabled, bpm, offset, metronomeVolume, player])

  // Sync player volume
  useEffect(() => {
    if (player) player.setVolume(playerVolume)
  }, [player, playerVolume])

  const handleAudioLoaded = async (arrayBuffer) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const decoded = await audioContextRef.current.decodeAudioData(arrayBuffer.slice(0))
      setAudioBuffer(decoded)
      setSamples([]) // Reset samples on new audio
      setStatus('Audio loaded. Click waveform to mark samples.')
    } catch (err) {
      console.error('Failed to decode audio', err)
      setStatus('Failed to decode audio file')
    }
  }

  const handleAddSample = useCallback((time) => {
    if (!audioBuffer) return
    const beatSec = 60 / Math.max(1, bpm)
    const gridSec = beatSec / Math.max(1, subdivision)
    const snappedTime = snapToGrid ? Math.round(time / gridSec) * gridSec : time

    // Avoid duplicates
    if (samples.some(s => Math.abs(s - snappedTime) < 0.005)) return

    const newSamples = [...samples, snappedTime].sort((a, b) => a - b)
    setSamples(newSamples)
    setStatus(`Marked sample at ${formatTime(snappedTime)}`)
  }, [audioBuffer, bpm, samples, snapToGrid, subdivision])

  const handleRemoveSample = useCallback((index) => {
    const newSamples = samples.filter((_, i) => i !== index)
    setSamples(newSamples)
    setStatus(`Removed sample at ${formatTime(samples[index])}`)
  }, [samples])

  const handleClearSamples = () => {
    setSamples([])
    setStatus('Cleared all samples')
  }

  const handleExtract = () => {
    if (!averagedSample || !audioContextRef.current) {
      setStatus('No samples to extract')
      return
    }

    const wav = encodeWAV(averagedSample, audioContextRef.current.sampleRate)
    const blob = new Blob([wav], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sample_${Date.now()}.wav`
    link.click()
    URL.revokeObjectURL(url)
    setStatus('Sample extracted!')
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    ' ': () => player.isPlaying ? player.pause() : player.play(audioBuffer, player.getCurrentTime?.()),
    'Delete': () => samples.length > 0 && handleRemoveSample(samples.length - 1),
    'z': (e) => e.ctrlKey && undo(),
    'y': (e) => e.ctrlKey && redo(),
  })

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-hidden">
      <Sidebar
        audioBuffer={audioBuffer}
        onAudioLoaded={handleAudioLoaded}
        samples={samples}
        bpm={bpm}
        onBpmChange={setBpm}
        offset={offset}
        onOffsetChange={setOffset}
        subdivision={subdivision}
        onSubdivisionChange={setSubdivision}
        snapToGrid={snapToGrid}
        onSnapToGridChange={setSnapToGrid}
        metronomeEnabled={metronomeEnabled}
        onMetronomeChange={setMetronomeEnabled}
        metronomeVolume={metronomeVolume}
        onMetronomeVolumeChange={setMetronomeVolume}
        playerVolume={playerVolume}
        onPlayerVolumeChange={setPlayerVolume}
        zoom={zoom}
        onZoomChange={setZoom}
        status={status}
        onRemoveSample={handleRemoveSample}
        onClearSamples={handleClearSamples}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        averagedSample={averagedSample}
        onExtract={handleExtract}
      />

      <Editor
        audioBuffer={audioBuffer}
        bpm={bpm}
        offset={offset}
        samples={samples}
        onAddSample={handleAddSample}
        onRemoveSample={handleRemoveSample}
        player={player}
        audioContextRef={audioContextRef}
        zoom={zoom}
        averagedSample={averagedSample}
        onPlayAveraged={() => {
          if (averagedSample && audioContextRef.current) {
            const buf = audioContextRef.current.createBuffer(1, averagedSample.length, audioContextRef.current.sampleRate)
            buf.getChannelData(0).set(averagedSample)
            player.play(buf, 0)
          }
        }}
        snapToGrid={snapToGrid}
        subdivision={subdivision}
      />
    </div>
  )
}

function formatTime(sec) {
  const mm = Math.floor(sec / 60)
  const ss = Math.floor(sec % 60)
  const ms = Math.floor((sec - Math.floor(sec)) * 1000)
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

function encodeWAV(float32Array, sampleRate) {
  const numChannels = 1
  const dataLength = float32Array.length * numChannels * 2
  const arrayBuffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(arrayBuffer)

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return arrayBuffer
}
