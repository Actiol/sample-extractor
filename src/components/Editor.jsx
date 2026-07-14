import { useState, useEffect } from 'react'
import Waveform from './Waveform'

export default function Editor({
  audioBuffer,
  bpm,
  offset,
  samples,
  onAddSample,
  onRemoveSample,
  player,
  audioContextRef,
  zoom,
  averagedSample,
  onPlayAveraged,
  snapToGrid,
  subdivision,
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)

  // Sync playback state
  useEffect(() => {
    const interval = setInterval(() => {
      if (player) {
        setIsPlaying(player.isPlaying)
        if (player.getCurrentTime) {
          setCurrentTime(player.getCurrentTime())
        }
      }
    }, 50)
    return () => clearInterval(interval)
  }, [player])

  const handlePlayPause = async () => {
    if (!player || !audioBuffer) return
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      if (typeof audioContextRef.current.resume === 'function') {
        await audioContextRef.current.resume()
      }
    } catch (e) {}

    if (player.isPlaying) {
      player.pause()
    } else {
      const startAt = player.getCurrentTime?.() || currentTime || 0
      player.play(audioBuffer, startAt)
    }
  }

  const handleStop = () => {
    if (player) {
      player.stop()
      setCurrentTime(0)
    }
  }

  const handleSeek = (time) => {
    if (player) {
      player.seek(time)
      setCurrentTime(time)
    }
  }

  useEffect(() => {
    if (player) {
      player.setPlaybackRate(playbackRate)
    }
  }, [player, playbackRate])

  if (!audioBuffer) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-10">♪</div>
          <p className="text-slate-400 text-lg">Load an audio file to begin</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-6">
      {/* Waveform */}
      <Waveform
        audioBuffer={audioBuffer}
        bpm={bpm}
        offset={offset}
        samples={samples}
        onAddSample={onAddSample}
        onRemoveSample={onRemoveSample}
        onSeek={handleSeek}
        player={player}
        zoom={zoom}
        snapToGrid={snapToGrid}
        subdivision={subdivision}
      />

      {/* Playback Controls */}
      <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 backdrop-blur">
        {/* Main Controls */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handlePlayPause}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition-all active:scale-95 shadow-lg hover:shadow-cyan-500/20"
          >
            {isPlaying ? (
              <>
                <span className="text-lg">⏸</span>
                <span>Pause</span>
              </>
            ) : (
              <>
                <span className="text-lg">▶</span>
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={handleStop}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium transition-colors border border-slate-700"
          >
            ⏹ Stop
          </button>

          {averagedSample && (
            <button
              onClick={onPlayAveraged}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium transition-colors border border-slate-700"
            >
              ▶ Play Sample ({samples.length})
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Playback Rate */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 font-medium">Speed</label>
            <input
              type="range"
              min={0.25}
              max={2}
              step={0.05}
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="w-24 h-2 rounded-lg bg-slate-800 accent-cyan-500 cursor-pointer"
            />
            <span className="text-xs text-slate-300 w-10">{playbackRate.toFixed(2)}×</span>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="space-y-2">
          <div
            className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = (e.clientX - rect.left) / rect.width
              const time = pct * (audioBuffer?.duration || 1)
              handleSeek(time)
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
              style={{ width: `${(currentTime / (audioBuffer?.duration || 1)) * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
              style={{ left: `${(currentTime / (audioBuffer?.duration || 1)) * 100}%`, marginLeft: '-6px' }}
            />
          </div>

          {/* Time Display */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">{formatTime(currentTime)}</span>
            <span className="font-mono">{formatTime(audioBuffer?.duration || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTime(sec) {
  const mm = Math.floor(sec / 60)
  const ss = Math.floor(sec % 60)
  const ms = Math.floor((sec - Math.floor(sec)) * 1000)
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}
