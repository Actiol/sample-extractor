export default function Controls({
  bpm,
  offset,
  subdivision = 1,
  preLengthMs,
  postLengthMs,
  onBpmChange,
  onOffsetChange,
  onSubdivisionChange,
  onPreLengthChange,
  onPostLengthChange,
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-300">BPM</label>
          <input
            className="input-field mt-1"
            type="number"
            min="20"
            max="400"
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-xs text-slate-300">Offset (ms)</label>
          <input
            className="input-field mt-1"
            type="number"
            value={offset}
            onChange={(e) => onOffsetChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-xs text-slate-300">Beat subdivision</label>
          <select className="input-field mt-1" value={subdivision} onChange={(e) => onSubdivisionChange(Number(e.target.value))}>
            <option value={1}>1 (one per beat)</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
            <option value={8}>8</option>
            <option value={16}>16</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-300">Pre-marker length (ms)</label>
          <input
            className="input-field mt-1"
            type="number"
            min={0}
            value={preLengthMs}
            onChange={(e) => onPreLengthChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-xs text-slate-300">Post-marker length (ms)</label>
          <input
            className="input-field mt-1"
            type="number"
            min={0}
            value={postLengthMs}
            onChange={(e) => onPostLengthChange(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  )
}
