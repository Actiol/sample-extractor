import { useRef } from 'react'

export default function Sidebar({
  audioBuffer,
  onAudioLoaded,
  samples,
  bpm,
  onBpmChange,
  offset,
  onOffsetChange,
  subdivision,
  onSubdivisionChange,
  snapToGrid,
  onSnapToGridChange,
  metronomeEnabled,
  onMetronomeChange,
  metronomeVolume,
  onMetronomeVolumeChange,
  playerVolume,
  onPlayerVolumeChange,
  zoom,
  onZoomChange,
  status,
  onRemoveSample,
  onClearSamples,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  averagedSample,
  onExtract,
}) {
  const fileInputRef = useRef(null)

  const handleLoadAudio = async (files) => {
    if (!files?.[0]) return
    const file = files[0]
    try {
      const arrayBuffer = await file.arrayBuffer()
      onAudioLoaded(arrayBuffer)
    } catch (err) {
      console.error('Failed to load audio', err)
    }
  }

  return (
    <div className="w-80 bg-gradient-to-b from-slate-900/80 to-slate-950/80 border-r border-slate-700/50 flex flex-col overflow-hidden backdrop-blur-sm">
      {/* Logo / Title */}
      <div className="p-6 border-b border-slate-700/30">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-2xl">◆</div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Extractor
          </h1>
        </div>
        <p className="text-xs text-slate-500">Sample precision tool</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* File Input */}
        <div className="p-6 border-b border-slate-700/30 space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audio File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => handleLoadAudio(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-medium transition-colors text-sm"
          >
            {audioBuffer ? '📁 Change Audio' : '📁 Load Audio'}
          </button>
          {audioBuffer && (
            <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
              Duration: <span className="text-cyan-400">{formatDuration(audioBuffer.duration)}</span>
            </div>
          )}
        </div>

        {/* Timing Controls */}
        <div className="p-6 border-b border-slate-700/30 space-y-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Timing</label>

          <div>
            <label className="text-xs text-slate-400 block mb-2">BPM: <span className="text-cyan-400 font-mono">{bpm}</span></label>
            <input
              type="range"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-slate-800 accent-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Offset: <span className="text-cyan-400 font-mono">{offset}ms</span></label>
            <input
              type="range"
              min={0}
              max={2000}
              step={10}
              value={offset}
              onChange={(e) => onOffsetChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-slate-800 accent-orange-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Subdivision</label>
            <select
              value={subdivision}
              onChange={(e) => onSubdivisionChange(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm"
            >
              <option value={1}>1 (whole beat)</option>
              <option value={2}>2 (half beat)</option>
              <option value={4}>4 (quarter beat)</option>
              <option value={8}>8 (eighth)</option>
              <option value={16}>16 (sixteenth)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => onSnapToGridChange(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border border-slate-700 cursor-pointer accent-cyan-500"
            />
            <span className="text-sm text-slate-300 group-hover:text-slate-100">Snap to grid</span>
          </label>
        </div>

        {/* Metronome */}
        <div className="p-6 border-b border-slate-700/30 space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Metronome</label>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={metronomeEnabled}
              onChange={(e) => onMetronomeChange(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border border-slate-700 cursor-pointer accent-cyan-500"
            />
            <span className="text-sm text-slate-300 group-hover:text-slate-100">Enable metronome</span>
          </label>

          {metronomeEnabled && (
            <div>
              <label className="text-xs text-slate-400 block mb-2">Volume</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={metronomeVolume}
                onChange={(e) => onMetronomeVolumeChange(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-800 accent-cyan-500 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Playback */}
        <div className="p-6 border-b border-slate-700/30 space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Playback</label>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Volume</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={playerVolume}
              onChange={(e) => onPlayerVolumeChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-slate-800 accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        {/* View */}
        <div className="p-6 border-b border-slate-700/30 space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">View</label>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Zoom: <span className="text-cyan-400">{zoom}%</span></label>
            <input
              type="range"
              min={25}
              max={400}
              step={25}
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-slate-800 accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Samples */}
        <div className="p-6 border-b border-slate-700/30 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Samples ({samples.length})</label>
            <div className="flex gap-1">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
                title="Undo (Ctrl+Z)"
              >
                ↶
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
                title="Redo (Ctrl+Y)"
              >
                ↷
              </button>
            </div>
          </div>

          {samples.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Click waveform to add samples</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {samples.map((time, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors group"
                >
                  <span className="text-xs font-mono text-cyan-400">{formatTime(time)}</span>
                  <button
                    onClick={() => onRemoveSample(idx)}
                    className="text-xs px-2 py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {samples.length > 0 && (
            <button
              onClick={onClearSamples}
              className="w-full text-xs px-3 py-2 rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-300 border border-red-900/30 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Extract */}
        <div className="p-6 border-b border-slate-700/30">
          <button
            onClick={onExtract}
            disabled={!averagedSample}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-medium transition-all active:scale-95 disabled:cursor-not-allowed"
          >
            ⬇ Extract Sample
          </button>
          {averagedSample && (
            <p className="text-xs text-slate-500 mt-2">
              {samples.length} sample{samples.length !== 1 ? 's' : ''} averaged
            </p>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="p-4 border-t border-slate-700/30 bg-slate-950/50">
        <p className="text-xs text-slate-400 line-clamp-2">{status}</p>
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

function formatDuration(sec) {
  const mm = Math.floor(sec / 60)
  const ss = Math.floor(sec % 60)
  return `${mm}:${String(ss).padStart(2, '0')}`
}
