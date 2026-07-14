export default function SampleList({ samples, onRemove }) {
  const formatTime = (t) => {
    if (t == null) return ''
    const mm = Math.floor(t / 60)
    const ss = Math.floor(t % 60)
    const ms = Math.floor((t - Math.floor(t)) * 1000)
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-sm text-slate-200 font-medium mb-3">Marked samples</h3>
      {samples.length === 0 ? (
        <p className="text-sm text-slate-400">No marks yet. Click the waveform to add.</p>
      ) : (
        <ul className="space-y-2">
          {samples.map((s, i) => (
            <li key={i} className="flex items-center justify-between">
              <span className="text-sm text-slate-100">{formatTime(s)}</span>
              <button onClick={() => onRemove(i)} className="btn-danger text-sm">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
