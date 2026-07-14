import { useEffect, useRef } from 'react'

export default function PreviewWaveform({ averagedSample, sampleCount, onPlay }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, width, height)
    if (!averagedSample) return

    const middle = height / 2
    const step = averagedSample.length / width
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x < width; x++) {
      const idx = Math.floor(x * step)
      const v = averagedSample[idx] || 0
      const y = middle - v * (middle * 0.8)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.fillStyle = 'rgba(96,165,250,0.12)'
    ctx.beginPath()
    for (let x = 0; x < width; x++) {
      const idx = Math.floor(x * step)
      const v = averagedSample[idx] || 0
      const y = middle - v * (middle * 0.8)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.lineTo(width, middle)
    ctx.lineTo(0, middle)
    ctx.closePath()
    ctx.fill()
  }, [averagedSample])

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 relative">
      <h3 className="text-sm text-slate-200 font-medium mb-3">Merged sample preview ({sampleCount})</h3>
      <canvas ref={canvasRef} width={400} height={80} className="w-full rounded" />
      {averagedSample && (
        <button
          onClick={onPlay}
          className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-sm"
        >
          ▶
        </button>
      )}
      {!averagedSample && <p className="text-xs text-slate-400 mt-2">No averaged sample yet</p>}
    </div>
  )
}
