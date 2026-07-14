import { useState, useEffect, useRef } from 'react'
import AudioLoader from './components/AudioLoader'
import Controls from './components/Controls'
import Waveform from './components/Waveform'
import Player from './components/Player'
import SampleList from './components/SampleList'
import PreviewWaveform from './components/PreviewWaveform'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useAudioProcessing } from './hooks/useAudioProcessing'

export default function App() {
  const [audioBuffer, setAudioBuffer] = useState(null)
  const [bpm, setBpm] = useState(140)
  const [offset, setOffset] = useState(0)
  const [samples, setSamples] = useState([])
  const [averagedSample, setAveragedSample] = useState(null)
  const [status, setStatus] = useState('Load an audio file to begin')

  // player & audio context
  const audioContextRef = useRef(null)
  const player = useAudioPlayer(audioContextRef)
  const { computeAverage } = useAudioProcessing()

  // UI state for player and metronome
  const [playerVolume, setPlayerVolume] = useState(1)
  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [metronomeVolume, setMetronomeVolume] = useState(0.5)
  const [isPlayingState, setIsPlayingState] = useState(false)
  const [zoomPps, setZoomPps] = useState(200)
  const [subdivision, setSubdivision] = useState(1)

  // Apply player volume when changed
  useEffect(() => {
    if (player) player.setVolume(playerVolume)
  }, [player, playerVolume])

  // Keep isPlayingState in sync (not updated every frame)
  useEffect(() => {
    setIsPlayingState(player.isPlaying)
  }, [player])


  // Metronome: schedule a simple click using oscillator while player is playing
  useEffect(() => {
    let intervalId = null
    let timeoutId = null
    if (!metronomeEnabled) return () => {}

    const ctx = audioContextRef.current
    if (!ctx) return () => {}

    function playClick() {
      try {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'square'
        o.frequency.value = 1200
        g.gain.value = metronomeVolume
        o.connect(g).connect(ctx.destination)
        const now = ctx.currentTime
        g.gain.setValueAtTime(metronomeVolume, now)
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
        o.start(now)
        o.stop(now + 0.06)
      } catch (e) {
        // ignore
      }
    }

    function schedule() {
      const beatSec = 60 / Math.max(1, bpm)
      const offsetSec = offset / 1000
      const pos = player.getCurrentTime ? player.getCurrentTime() : 0
      // next beat time after current pos
      let n = Math.ceil((pos - offsetSec) / beatSec)
      if (pos < offsetSec) n = 0
      const nextBeat = offsetSec + n * beatSec
      const delayMs = Math.max(0, (nextBeat - pos) * 1000)
      timeoutId = setTimeout(() => {
        playClick()
        // then schedule repeated interval
        intervalId = setInterval(() => playClick(), beatSec * 1000)
      }, delayMs)
    }

    // start scheduling if player is playing
    if (player && player.isPlaying) schedule()

    // react to player state changes by rescheduling
    const id = setInterval(() => {
      if (!player) return
      if (player.isPlaying && intervalId == null && timeoutId == null) schedule()
      if (!player.isPlaying && intervalId != null) {
        clearInterval(intervalId); intervalId = null
        if (timeoutId != null) { clearTimeout(timeoutId); timeoutId = null }
      }
    }, 200)

    return () => {
      clearInterval(id)
      if (intervalId) clearInterval(intervalId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [metronomeEnabled, bpm, offset, metronomeVolume, player])


  const handleAudioLoaded = async (payload) => {
    // payload may be an ArrayBuffer (from AudioLoader) or an already-decoded AudioBuffer
    try {
      if (payload instanceof ArrayBuffer) {
        // decode using the app audio context so playback uses the same context
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        const decoded = await audioContextRef.current.decodeAudioData(payload.slice(0))
        setAudioBuffer(decoded)
      } else {
        setAudioBuffer(payload)
      }
      setSamples([])
      setAveragedSample(null)
      setStatus('Audio loaded. Adjust timing and mark samples.')
    } catch (err) {
      console.error('Failed to decode audio in app context', err)
      setStatus('Failed to decode audio file')
    }
  }

  const handleAddSample = (time) => {
    if (!audioBuffer) return
    const beatSec = 60 / Math.max(1, bpm)
    const gridSec = beatSec / Math.max(1, subdivision)
    const snappedTime = Math.round(time / gridSec) * gridSec

    // avoid duplicates (within 5ms)
    const epsilon = 0.005
    if (samples.some(s => Math.abs(s - snappedTime) < epsilon)) return

    const newSamples = [...samples, snappedTime].sort((a, b) => a - b)
    setSamples(newSamples)

    // Compute average
    if (audioBuffer && newSamples.length > 0) {
      const averaged = computeAverage(audioBuffer, newSamples)
      setAveragedSample(averaged)
    }
  }

  const handleRemoveSample = (index) => {
    const newSamples = samples.filter((_, i) => i !== index)
    setSamples(newSamples)
    
    if (audioBuffer && newSamples.length > 0) {
      const averaged = computeAverage(audioBuffer, newSamples)
      setAveragedSample(averaged)
    } else {
      setAveragedSample(null)
    }
  }

  const handleClearSamples = () => {
    setSamples([])
    setAveragedSample(null)
    player.stop()
  }

  const handlePlayAveraged = async () => {
    if (averagedSample && audioContextRef.current) {
      console.log('App: handlePlayAveraged requested, samples=', averagedSample.length)
      try {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        if (typeof audioContextRef.current.resume === 'function') await audioContextRef.current.resume()
      } catch (e) { console.warn('AudioContext resume failed', e) }
      const buffer = audioContextRef.current.createBuffer(
        1,
        averagedSample.length,
        audioContextRef.current.sampleRate
      )
      buffer.getChannelData(0).set(averagedSample)
      console.log('App: playing averaged buffer duration=', buffer.duration)
      const ok = await player.play(buffer, 0) // play averaged at 0
      if (!ok) {
        console.warn('App: WebAudio play failed, falling back to HTMLAudioElement')
        const wav = encodeWAV(buffer.getChannelData(0), audioContextRef.current.sampleRate)
        const blob = new Blob([wav], { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)
        const a = new Audio(url)
        a.play().catch(e => console.warn('HTMLAudioElement fallback failed', e))
        a.onended = () => URL.revokeObjectURL(url)
      }
    }
  }

  const handleExtract = () => {
    if (!averagedSample) {
      setStatus('No averaged sample to extract')
      return
    }

    const wav = encodeWAV(
      averagedSample,
      audioContextRef.current.sampleRate
    )
    const blob = new Blob([wav], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'extracted_sample.wav'
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Sample extracted!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-50 mb-2">Sample Extractor</h1>
          <p className="text-slate-400">Mark occurrences, average, extract. Frame-perfect precision.</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="col-span-8 space-y-6">
            {/* Audio Loader */}
            <AudioLoader onAudioLoaded={handleAudioLoaded} setStatus={setStatus} />

            {/* Timing Controls */}
            {audioBuffer && (
              <Controls
                bpm={bpm}
                offset={offset}
                subdivision={subdivision}
                onBpmChange={setBpm}
                onOffsetChange={setOffset}
                onSubdivisionChange={setSubdivision}
              />
            )}

            {/* Waveform */}
            {audioBuffer && (
              <Waveform
                audioBuffer={audioBuffer}
                bpm={bpm}
                offset={offset}
                samples={samples}
                onAddSample={handleAddSample}
                onRemoveSample={handleRemoveSample}
                onSeek={(t) => player.seek(t)}
                onOffsetChange={setOffset}
                player={player}
                initialPixelsPerSecond={zoomPps}
              />
            )}

            {/* Player (unified playback controls + metronome) */}
            {audioBuffer && (
              <Player
                audioBuffer={audioBuffer}
                player={player}
                averagedSample={averagedSample}
                audioContextRef={audioContextRef}
                bpm={bpm}
                offset={offset}
                metronomeEnabled={metronomeEnabled}
                setMetronomeEnabled={setMetronomeEnabled}
                metronomeVolume={metronomeVolume}
                setMetronomeVolume={setMetronomeVolume}
              />
            )}
          </div>

          {/* Right Column */}
          <div className="col-span-4 space-y-6">
            {/* Sample List */}
            {audioBuffer && (
              <SampleList
                samples={samples}
                onRemove={handleRemoveSample}
              />
            )}

            {/* Preview */}
            {audioBuffer && (
              <PreviewWaveform
                averagedSample={averagedSample}
                sampleCount={samples.length}
                onPlay={handlePlayAveraged}
              />
            )}

            {/* Extract Button */}
            {audioBuffer && (
              <button
                onClick={handleExtract}
                disabled={!averagedSample}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3 text-lg"
              >
                ⬇ Extract sample
              </button>
            )}

            {/* Status */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-300">{status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// WAV encoding utility
function encodeWAV(float32Array, sampleRate) {
  const numChannels = 1
  // 16-bit PCM data length in bytes
  const dataLength = float32Array.length * numChannels * 2
  const arrayBuffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(arrayBuffer)

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true) // file size - 8
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // audio format (1 = PCM)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true) // byte rate
  view.setUint16(32, numChannels * 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return arrayBuffer
}