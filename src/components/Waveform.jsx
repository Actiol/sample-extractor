import { useEffect, useRef, useState } from 'react'

export default function Waveform({
  audioBuffer,
  bpm = 120,
  offset = 0,
  samples = [],
  onAddSample,
  onRemoveSample,
  onSeek,
  player,
  zoom = 100,
  snapToGrid = true,
  subdivision = 4,
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)

  // Compute pixels per second from zoom level
  const pixelsPerSecond = 50 * (zoom / 100)

  // Draw loop for playhead
  useEffect(() => {
    if (!player) return
    
    let rafId = null
    const updatePlayhead = () => {
      if (player.isPlaying) {
        const time = player.getCurrentTime?.() || 0
        setCurrentTime(time)
      }
      rafId = requestAnimationFrame(updatePlayhead)
    }

    rafId = requestAnimationFrame(updatePlayhead)
    return () => cancelAnimationFrame(rafId)
  }, [player])

  // Main render loop
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    // Set canvas size to match container
    const width = container.clientWidth
    const height = container.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#0f172a')
    gradient.addColorStop(1, '#0f1419')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Draw waveform
    const channelData = audioBuffer.getChannelData(0)
    const duration = audioBuffer.duration
    const totalPixels = duration * pixelsPerSecond

    // Scroll position
    const scrollLeft = container.scrollLeft

    // Compute visible range
    const startTime = scrollLeft / pixelsPerSecond
    const endTime = (scrollLeft + width) / pixelsPerSecond

    // Draw waveform line
    ctx.strokeStyle = '#0ea5e9'
    ctx.lineWidth = 1.2
    ctx.beginPath()

    let firstPoint = true
    for (let px = 0; px < width; px++) {
      const time = startTime + (px / width) * (endTime - startTime)
      const sampleIdx = Math.floor(time * audioBuffer.sampleRate)
      
      if (sampleIdx < 0 || sampleIdx >= channelData.length) continue

      const sample = channelData[sampleIdx]
      const y = (height / 2) - (sample * height * 0.4)

      if (firstPoint) {
        ctx.moveTo(px, y)
        firstPoint = false
      } else {
        ctx.lineTo(px, y)
      }
    }
    ctx.stroke()

    // Draw beat grid
    if (bpm > 0) {
      const beatSec = 60 / bpm
      const gridStep = beatSec / subdivision
      const offsetSec = offset / 1000

      for (let time = Math.max(0, startTime - offsetSec); time < endTime - offsetSec; time += gridStep) {
        const actualTime = time + offsetSec
        const px = (actualTime - startTime) * pixelsPerSecond
        
        const beatIndex = Math.floor(time / beatSec)
        const isMainBeat = (beatIndex % 4) === 0

        ctx.strokeStyle = isMainBeat ? 'rgba(96, 165, 250, 0.3)' : 'rgba(148, 163, 184, 0.08)'
        ctx.lineWidth = isMainBeat ? 1.5 : 0.5
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, height)
        ctx.stroke()
      }
    }

    // Draw offset line
    const offsetPx = (offset / 1000) * pixelsPerSecond - scrollLeft
    if (offsetPx >= -5 && offsetPx <= width + 5) {
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(offsetPx, 0)
      ctx.lineTo(offsetPx, height)
      ctx.stroke()
    }

    // Draw sample markers
    samples.forEach((sampleTime, idx) => {
      const px = sampleTime * pixelsPerSecond - scrollLeft
      if (px < -10 || px > width + 10) return

      // Draw marker line
      ctx.strokeStyle = '#fb7185'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, height)
      ctx.stroke()

      // Draw marker dot at top
      ctx.fillStyle = '#fb7185'
      ctx.beginPath()
      ctx.arc(px, 8, 4, 0, Math.PI * 2)
      ctx.fill()

      // Draw sample region (centered, semi-transparent)
      const windowSec = 0.25
      const regionStart = sampleTime - windowSec / 2
      const regionEnd = sampleTime + windowSec / 2
      const x1 = regionStart * pixelsPerSecond - scrollLeft
      const x2 = regionEnd * pixelsPerSecond - scrollLeft
      
      if (x2 > -10 && x1 < width + 10) {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.1)'
        ctx.fillRect(Math.max(0, x1), 0, Math.min(width, x2 - x1), height)
      }
    })

    // Draw playhead
    const playheadPx = currentTime * pixelsPerSecond - scrollLeft
    if (playheadPx >= -2 && playheadPx <= width + 2) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadPx, 0)
      ctx.lineTo(playheadPx, height)
      ctx.stroke()

      // Playhead triangle at top
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.beginPath()
      ctx.moveTo(playheadPx, 0)
      ctx.lineTo(playheadPx - 5, 8)
      ctx.lineTo(playheadPx + 5, 8)
      ctx.closePath()
      ctx.fill()
    }

    // Keep playhead visible during playback
    if (player?.isPlaying) {
      const viewportCenter = scrollLeft + width / 2
      if (playheadPx < scrollLeft + 50) {
        container.scrollLeft = Math.max(0, playheadPx - 50)
      } else if (playheadPx > scrollLeft + width - 50) {
        container.scrollLeft = Math.max(0, playheadPx - width + 50)
      }
    }
  }, [audioBuffer, bpm, offset, samples, currentTime, pixelsPerSecond, player?.isPlaying])

  // Handle interactions
  const handleMouseDown = (e) => {
    const container = containerRef.current
    if (!container || !audioBuffer) return

    const rect = container.getBoundingClientRect()
    const clickX = e.clientX - rect.left + container.scrollLeft
    const time = clickX / pixelsPerSecond

    if (e.button === 2) {
      // Right click: seek to position
      e.preventDefault()
      onSeek?.(time)
      return
    }

    // Left click: check if clicking near a marker
    const threshold = 15 / pixelsPerSecond
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i] - time) < threshold) {
        if (e.detail === 2) {
          // Double click to remove
          onRemoveSample(i)
        } else {
          // Single click to select
          onSeek?.(samples[i])
        }
        return
      }
    }

    // Otherwise add a sample
    const beatSec = 60 / Math.max(1, bpm)
    const gridSec = beatSec / Math.max(1, subdivision)
    const snappedTime = snapToGrid ? Math.round(time / gridSec) * gridSec : time
    onAddSample?.(snappedTime)
  }

  const handleScroll = () => {
    // Force redraw on scroll
    if (canvasRef.current) {
      canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 p-6 bg-slate-900/30 rounded-xl border border-slate-700/50">
      <div
        ref={containerRef}
        className="flex-1 relative overflow-x-auto overflow-y-hidden rounded-lg bg-slate-950 border border-slate-700/50 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => e.preventDefault()}
        onScroll={handleScroll}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ imageRendering: 'crisp-edges' }}
        />
      </div>

      {/* Timeline labels */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-2">
        <span>0:00</span>
        <span>{audioBuffer ? `${Math.floor(audioBuffer.duration / 60)}:${String(Math.floor(audioBuffer.duration % 60)).padStart(2, '0')}` : '--:--'}</span>
      </div>

      {/* Instructions */}
      <div className="text-xs text-slate-400 space-y-1">
        <p>• <strong>Click</strong> to mark sample • <strong>Double-click</strong> to remove • <strong>Right-click</strong> to seek • <strong>Scroll</strong> to zoom</p>
      </div>
    </div>
  )
}
