import { useEffect, useState } from 'react'

export default function Player({
  audioBuffer,
  player,
  averagedSample,
  audioContextRef,
  bpm,
  offset,
  metronomeEnabled,
  setMetronomeEnabled,
  metronomeVolume,
  setMetronomeVolume,
}) {
  const [pos, setPos] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    if (!player) return
    // lightweight progress subscription to update UI; throttle internally in hook if needed
    player.onProgress((t) => setPos(t))
  }, [player])

  useEffect(() => {
    if (!player) return
    player.setVolume(volume)
  }, [volume, player])

  useEffect(() => {
    if (!player) return
    player.setPlaybackRate(speed)
  }, [speed, player])

  useEffect(() => {
    const id = setInterval(() => {
      if (!player) return
      setIsPlaying(player.isPlaying)
    }, 200)
    return () => clearInterval(id)
  }, [player])

  async function handlePlayPause() {
    if (!player || !audioBuffer) return
    if (player.isPlaying) {
      console.log('Player: pause requested')
      player.pause()
    } else {
      console.log('Player: play requested')
      // ensure audio context exists and is resumed inside this user gesture
      try {
        if (audioContextRef && !audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
          console.log('Player: created AudioContext')
        }
        if (audioContextRef && audioContextRef.current && typeof audioContextRef.current.resume === 'function') {
          await audioContextRef.current.resume()
          console.log('Player: AudioContext resumed')
        }
      } catch (e) {
        // ignore resume errors; we'll still try to play
        console.warn('AudioContext resume failed', e)
      }
      // start from current pos (ask player for authoritative time if available)
      const startAt = player.getCurrentTime ? player.getCurrentTime() : (pos || 0)
      console.log('Player: starting play at', startAt)
      const ok = await player.play(audioBuffer, startAt)
      if (!ok) {
        console.warn('Player: WebAudio play failed, falling back to HTMLAudioElement')
        try {
          const samples = audioBuffer.getChannelData(0)
          const wav = encodeWAV(samples, audioBuffer.sampleRate)
          const blob = new Blob([wav], { type: 'audio/wav' })
          const url = URL.createObjectURL(blob)
          const a = new Audio(url)
          a.play().catch(e => console.warn('HTMLAudioElement fallback failed', e))
          a.onended = () => URL.revokeObjectURL(url)
        } catch (e) { console.warn('Fallback play failed', e) }
      }
    }
  }

  function handleStop() {
    if (!player) return
    player.stop()
    setPos(0)
  }

  async function playAveraged() {
    if (!averagedSample || !audioContextRef) return
    console.log('Player: playAveraged requested, samples=', averagedSample && averagedSample.length)
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      if (audioContextRef && audioContextRef.current && typeof audioContextRef.current.resume === 'function') {
        await audioContextRef.current.resume()
      }
    } catch (e) {
      console.warn('AudioContext resume failed', e)
    }
    const buffer = audioContextRef.current.createBuffer(1, averagedSample.length, audioContextRef.current.sampleRate)
    buffer.getChannelData(0).set(averagedSample)
    console.log('Player: playing averaged buffer duration=', buffer.duration)
    const ok = await player.play(buffer, 0)
    if (!ok) {
      // fallback: play via HTMLAudioElement
      console.warn('Player: WebAudio play failed, using HTMLAudioElement fallback')
      const wav = encodeWAV(buffer.getChannelData(0), audioContextRef.current.sampleRate)
      const blob = new Blob([wav], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const a = new Audio(url)
      a.play().catch(e => console.warn('HTMLAudioElement fallback failed', e))
      a.onended = () => { URL.revokeObjectURL(url) }
    }
  }

  function handleSeek(e) {
    const rect = e.target.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    if (!audioBuffer) return
    const t = Math.max(0, Math.min(audioBuffer.duration, pct * audioBuffer.duration))
    player.seek(t)
    setPos(t)
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex gap-3 items-center mb-3">
        <button onClick={handlePlayPause} className="btn-primary px-3">
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={handleStop} className="btn-secondary px-3">⏹ Stop</button>
          {averagedSample && (
            <button
              onClick={() => playAveraged()}
              className="btn-secondary px-3"
            >
              ▶ Play extracted
            </button>
          )}

          <div className="flex-1">
            <div className="relative h-3 bg-slate-900 rounded" onClick={handleSeek} style={{ cursor: 'pointer' }}>
              <div className="absolute left-0 top-0 bottom-0 bg-blue-600" style={{ width: `${(pos / (audioBuffer ? audioBuffer.duration : 1)) * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <div>{formatTime(pos)}</div>
              <div>{audioBuffer ? formatTime(audioBuffer.duration) : '00:00.000'}</div>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-slate-300">Volume</label>
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-slate-300">Speed</label>
          <input type="range" min={0.25} max={4} step={0.01} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          <div className="text-xs text-slate-400">{speed.toFixed(2)}x</div>
        </div>
        <div>
          <label className="text-xs text-slate-300">Metronome</label>
          <div className="flex items-center gap-2 mt-1">
            <input id="metronome" type="checkbox" checked={metronomeEnabled} onChange={(e) => setMetronomeEnabled(e.target.checked)} />
            <input type="range" min={0} max={1} step={0.01} value={metronomeVolume} onChange={(e) => setMetronomeVolume(Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Audio enable helper: forces creation/resume of AudioContext inside a user gesture */}
      <div className="mt-3">
        <button
          onClick={async () => {
            try {
              if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
              if (audioContextRef.current && typeof audioContextRef.current.resume === 'function') await audioContextRef.current.resume()
              // inform user via console (visible if devtools open)
              console.log('AudioContext resumed via user button')
            } catch (e) {
              console.warn('AudioContext resume failed', e)
            }
          }}
          className="text-xs btn-secondary px-3"
        >
          Enable audio (if Chrome blocked playback)
        </button>
      </div>
    </div>
  )
}

function formatTime(sec) {
  if (!sec && sec !== 0) return '00:00.000'
  const mm = Math.floor(sec / 60)
  const ss = Math.floor(sec % 60)
  const ms = Math.floor((sec - Math.floor(sec)) * 1000)
  return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}.${String(ms).padStart(3,'0')}`
}

// Minimal WAV encoder for fallback playback — 16-bit PCM mono
function encodeWAV(float32Array, sampleRate) {
  const numChannels = 1
  const dataLength = float32Array.length * numChannels * 2
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)
  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
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
  // convert to 16-bit PCM
  let offset = 44
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}
