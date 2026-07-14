import { useEffect, useRef, useState } from 'react'

// Performance-focused waveform: renders base waveform once (cached), lightweight overlay for playhead
export default function Waveform({
  audioBuffer,
  bpm = 140,
  offset = 0,
  samples = [],
  onAddSample,
  onRemoveSample,
  onSeek,
  onOffsetChange,
  player,
  initialPixelsPerSecond = 200
}) {
  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const baseCanvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const contentWidthRef = useRef(0)
  const [pixelsPerSecond, setPixelsPerSecond] = useState(initialPixelsPerSecond)
  const pixelsPerSecondRef = useRef(pixelsPerSecond)
  useEffect(() => { pixelsPerSecondRef.current = pixelsPerSecond }, [pixelsPerSecond])

  // persistent timeline cursor (when paused or when user places it)
  const [timelinePos, setTimelinePos] = useState(0)
  const timelinePosRef = useRef(0)
  useEffect(() => { timelinePosRef.current = timelinePos }, [timelinePos])

  // adjustable sample length (seconds) and visual region
  const [sampleLengthSec, setSampleLengthSec] = useState(0.25)
  const scrollbarDragRef = useRef({ dragging: false })
  const [debugTick, setDebugTick] = useState(0)

  // Cap total canvas width to avoid huge memory usage
  // Increase display cap to allow deeper zoom; still limits extremely huge widths
  const MAX_CANVAS_PX = 200000

  // tile cache for faster scrolling: map tileKey -> { bitmap or canvas }
  const tileCacheRef = useRef(new Map())
  // tile generation queue flag
  const tileQueueRef = useRef(new Set())

  // cache rendered state to avoid re-rendering expensive waveform
  useEffect(() => {
    if (!audioBuffer) return
    // clear tiles when audio or zoom changes
    tileCacheRef.current.clear()
    tileQueueRef.current.clear()
    renderBaseWaveform()
    // redraw on resize or zoom or samples/bpm/offset change
    window.addEventListener('resize', renderBaseWaveform)
    return () => window.removeEventListener('resize', renderBaseWaveform)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBuffer, pixelsPerSecond, bpm, offset, samples])

  // attach player progress -> overlay draw (no React state changes)
  useEffect(() => {
    if (!player || !overlayCanvasRef.current) return
    let raf = null
    const getOverlayTime = () => {
      if (player && player.isPlaying) return player.getCurrentTime ? player.getCurrentTime() : 0
      return timelinePosRef.current || 0
    }
    const drawLoop = () => {
      drawOverlay(getOverlayTime())
      raf = requestAnimationFrame(drawLoop)
    }
    if (player.isPlaying) {
      raf = requestAnimationFrame(drawLoop)
    } else {
      // draw once when not playing to show timelinePos
      drawOverlay(getOverlayTime())
    }
    // if player toggles play state, user can trigger a re-run; easiest is to add an interval to check state
    const interval = setInterval(() => {
      if (player.isPlaying && !raf) raf = requestAnimationFrame(drawLoop)
      if (!player.isPlaying && raf) { cancelAnimationFrame(raf); raf = null }
    }, 200)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      clearInterval(interval)
    }
  }, [player])

  function computePpsForDuration(duration, desiredPps) {
    // Allow desired pixels-per-second; do not cap here to let the UI control zooming.
    return Math.max(1, desiredPps)
  }

  let totalWidthCss = 0

  function renderBaseWaveform(ppsOverride) {
    const container = containerRef.current
    if (!audioBuffer || !container) return

    const duration = audioBuffer.duration
    const pps = typeof ppsOverride === 'number' ? computePpsForDuration(duration, ppsOverride) : computePpsForDuration(duration, pixelsPerSecond)
    const totalWidth = Math.max(Math.round(duration * pps), container.clientWidth)
    totalWidthCss = totalWidth

    // compute displayed (capped) width to keep scrollbar usable
    const displayWidth = Math.min(totalWidth, MAX_CANVAS_PX)

    // store logical content width and set content width (this creates native scrollbar)
    contentWidthRef.current = totalWidth
    const contentWidthPx = Math.max(displayWidth, container.clientWidth)
    if (contentRef.current) contentRef.current.style.width = `${Math.round(contentWidthPx)}px`

    // helpers for coordinate mapping
    const logicalToDisplay = (lx) => Math.round(lx * (displayWidth / Math.max(1, totalWidth)))
    const displayToLogical = (dx) => Math.floor(dx / Math.max((displayWidth / Math.max(1, totalWidth)), 1e-6))
    const scale = displayWidth / Math.max(1, totalWidth)

    // draw the visible portion using the same pps
    renderBasePortion(pps)
  }

  function renderBasePortion(ppsOverride) {
    const canvas = baseCanvasRef.current
    const container = containerRef.current
    const content = contentRef.current
    if (!canvas || !audioBuffer || !container || !content) return

    const duration = audioBuffer.duration
    const pps = typeof ppsOverride === 'number' ? computePpsForDuration(duration, ppsOverride) : computePpsForDuration(duration, pixelsPerSecond)
    const dpr = window.devicePixelRatio || 1

    // viewport size
    const viewportWidth = container.clientWidth
    const totalWidth = Math.max(Math.round(duration * pps), container.clientWidth)
    const height = 180

    // canvas matches viewport width and is positioned inside content at scrollLeft so it visually covers the viewport
    canvas.width = viewportWidth * dpr
    canvas.height = height * dpr
    canvas.style.width = `${viewportWidth}px`
    canvas.style.height = `${height}px`
    // position canvas inside content so it aligns with visible area
    canvas.style.position = 'absolute'
    canvas.style.left = `0px`
    canvas.style.top = `0px`

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr,0,0,dpr,0,0)
    ctx.clearRect(0, 0, viewportWidth, height)

    // compute global samplesPerPixel across entire content (logical totalWidth)
    const channelData = audioBuffer.getChannelData(0)
    // compute samples-per-pixel as float to map globalX -> sample range
    const displayWidth = Math.min(totalWidth, MAX_CANVAS_PX)
    const scale = displayWidth / Math.max(1, totalWidth)

    const samplesPerPixelFloat = channelData.length / Math.max(1, totalWidth)

    // display scroll (in display pixels)
    const scrollLeftDisplay = container.scrollLeft
    const logicalScrollLeft = displayToLogical(scrollLeftDisplay)

    // background
    ctx.fillStyle = '#071024'
    ctx.fillRect(0, 0, viewportWidth, height)

    // draw waveform using tiled rendering to avoid expensive full redraws during fast scrolling
    const TILE_LOGICAL = 2048 // logical pixels per tile
    const preloadDisplay = Math.min(8000, viewportWidth * 2)
    const viewportStartLogical = displayToLogical(scrollLeftDisplay)
    const viewportLogicalWidth = displayToLogical(scrollLeftDisplay + viewportWidth) - viewportStartLogical
    const preloadLogical = Math.ceil(preloadDisplay / Math.max(scale, 1e-6))
    const startLogical = Math.max(0, viewportStartLogical - preloadLogical)
    const endLogical = Math.min(totalWidth, viewportStartLogical + viewportLogicalWidth + preloadLogical)

    const firstTile = Math.floor(startLogical / TILE_LOGICAL)
    const lastTile = Math.floor(Math.max(firstTile, endLogical / TILE_LOGICAL))

    // helper to draw a cached tile or schedule generation
    const drawTile = (tileIndex) => {
      const key = `${pixelsPerSecondRef.current}-${tileIndex}`
      const tile = tileCacheRef.current.get(key)
      const tileLogicalStart = tileIndex * TILE_LOGICAL
      const tileLogicalEnd = Math.min(totalWidth, (tileIndex + 1) * TILE_LOGICAL)
      const tileDisplayStart = Math.round(tileLogicalStart * scale)
      // if tile exists, draw it at correct position
      if (tile && tile.bitmap) {
        try {
        const drawW = Math.round((tileLogicalEnd - tileLogicalStart) * scale)
        ctx.drawImage(tile.bitmap, tileDisplayStart - scrollLeftDisplay, 0, drawW, height)
      } catch (e) {
        // ignore draw errors
      }
      return
      }
      // draw a quick low-res placeholder vertical bars to avoid blank area
      const pxStart = Math.round(tileLogicalStart * scale) - scrollLeftDisplay
      const pxEnd = Math.round(tileLogicalEnd * scale) - scrollLeftDisplay
      ctx.fillStyle = '#071024'
      ctx.fillRect(pxStart, 0, Math.max(1, pxEnd - pxStart), height)
      ctx.fillStyle = '#334155'
      // draw rough downsample by sampling every Nth sample
      const approxStep = Math.max(1, Math.floor((tileLogicalEnd - tileLogicalStart) / 64))
      for (let lx = tileLogicalStart; lx < tileLogicalEnd; lx += approxStep) {
        const sx = Math.round(lx * scale) - scrollLeftDisplay
        ctx.fillRect(sx, height * 0.45, 1, height * 0.1)
      }

      // schedule generation if not queued
      if (!tileQueueRef.current.has(key)) {
        tileQueueRef.current.add(key)
        // generate asynchronously to avoid blocking scroll
        setTimeout(() => {
          try { generateTile(key, tileIndex, TILE_LOGICAL, pps, channelData, samplesPerPixelFloat, scale, height) } catch (e) { tileQueueRef.current.delete(key) }
        }, 8)
      }
    }

    for (let t = firstTile; t <= lastTile; t++) drawTile(t)

    // draw beat grid for visible area
    if (bpm > 0) {
      const beatSec = 60 / Math.max(1, bpm)
      const firstBeat = offset / 1000
      const startSec = logicalScrollLeft / pps
      const endSec = (logicalScrollLeft + viewportWidth) / pps
      const startBeat = Math.floor((startSec - firstBeat) / beatSec)
      for (let n = startBeat; ; n++) {
        const t = firstBeat + n * beatSec
        if (t > endSec) break
        if (t < startSec) continue
        const globalX = Math.round(t * pps)
        const x = Math.round(globalX * scale) - scrollLeftDisplay
        const beatIndex = n
        if (beatIndex % 4 === 0) {
          ctx.strokeStyle = 'rgba(96,165,250,0.35)'
          ctx.lineWidth = 1.5
        } else {
          ctx.strokeStyle = 'rgba(148,163,184,0.12)'
          ctx.lineWidth = 1
        }
        ctx.beginPath()
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, height)
        ctx.stroke()
      }
    }

    // draw sample markers (thin indicators) and sample regions
    ctx.fillStyle = '#fb7185'
    ctx.globalAlpha = 1
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]
      const globalX = Math.round(s * pps)
      const x = Math.round(globalX * scale) - scrollLeftDisplay
      if (x >= -10 && x <= viewportWidth + 10) ctx.fillRect(x - 1, 0, 2, height)
      // draw sample region (centered on marker)
      const regionHalf = Math.round((sampleLengthSec * pps * scale) / 2)
      const rx = x - regionHalf
      const rw = regionHalf * 2
      ctx.globalAlpha = 0.12
      ctx.fillStyle = '#fb7185'
      if (rx + rw >= -10 && rx <= viewportWidth + 10) ctx.fillRect(rx, 0, rw, height)
      ctx.globalAlpha = 1
    }

    // no custom scrollbar update here (use native)
  }

  // overlay draws playhead and small interactive markers; it is lightweight and updated frequently
  let draggingOffset = false
  let dragStartX = 0
  let originalOffset = 0

  function drawOverlay(currentTime) {
    const overlay = overlayCanvasRef.current
    const base = baseCanvasRef.current
    const container = containerRef.current
    const content = contentRef.current
    if (!overlay || !base || !container || !content || !audioBuffer) return
    const dpr = window.devicePixelRatio || 1
    const viewportWidth = container.clientWidth
    const height = base.height / dpr
    overlay.width = (viewportWidth) * dpr
    overlay.height = height * dpr
    overlay.style.width = `${viewportWidth}px`
    overlay.style.height = `${height}px`
    // position overlay absolute inside content
    overlay.style.position = 'absolute'
    overlay.style.left = `0px`
    overlay.style.top = '0px'
    const ctx = overlay.getContext('2d')
    ctx.setTransform(dpr,0,0,dpr,0,0)
    ctx.clearRect(0, 0, viewportWidth, height)

    const pps = computePpsForDuration(audioBuffer.duration, pixelsPerSecond)
    const totalWidth = Math.max(Math.round(audioBuffer.duration * pps), container.clientWidth)
    const displayWidth = Math.min(totalWidth, MAX_CANVAS_PX)
    const scale = displayWidth / Math.max(1, totalWidth)
    const scrollLeftDisplay = container.scrollLeft

    // playhead
    const playheadGlobalX = Math.round(currentTime * pps)
    const x = Math.round(playheadGlobalX * scale) - scrollLeftDisplay

    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
    ctx.stroke()

    // small triangle marker at top
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x - 6, 10)
    ctx.lineTo(x + 6, 10)
    ctx.closePath()
    ctx.fill()

    // draw offset draggable line
    const offsetGlobal = Math.round((offset / 1000) * pps)
    const offsetX = Math.round(offsetGlobal * scale) - scrollLeftDisplay
    ctx.strokeStyle = 'rgba(249,115,22,0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(offsetX + 0.5, 0)
    ctx.lineTo(offsetX + 0.5, height)
    ctx.stroke()
    ctx.fillStyle = 'rgba(249,115,22,0.9)'
    ctx.fillRect(offsetX - 2, 0, 4, 20)

    // draw markers as small triangles
    ctx.fillStyle = '#fb7185'
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]
      const mx = Math.round((s * pps) * scale) - scrollLeftDisplay
      ctx.beginPath()
      ctx.moveTo(mx, height - 1)
      ctx.lineTo(mx - 6, height - 12)
      ctx.lineTo(mx + 6, height - 12)
      ctx.closePath()
      ctx.fill()
    }

    // keep playhead visible (adjust scroll to keep playhead onscreen) — only while playing
    if (player && player.isPlaying) {
      const rect = container.getBoundingClientRect()
      const viewStart = container.scrollLeft
      const viewEnd = viewStart + rect.width
      const globalX = Math.round(playheadGlobalX * scale)
      if (globalX < viewStart + 40) container.scrollLeft = Math.max(0, globalX - 40)
      else if (globalX > viewEnd - 40) container.scrollLeft = Math.max(0, globalX - rect.width + 40)
    }
  }

  // Generate a tile into an offscreen canvas and cache as ImageBitmap for fast draws
  async function generateTile(key, tileIndex, tileLogicalSize, pps, channelData, samplesPerPixelFloat, scale, height) {
    try {
      const duration = audioBuffer.duration
      const totalWidth = Math.max(Math.round(duration * pps), containerRef.current ? containerRef.current.clientWidth : 0)
      const tileLogicalStart = tileIndex * tileLogicalSize
      const tileLogicalEnd = Math.min(totalWidth, (tileIndex + 1) * tileLogicalSize)
      const tileDisplayWidth = Math.max(1, Math.round((tileLogicalEnd - tileLogicalStart) * scale))
      const dpr = window.devicePixelRatio || 1
      // create canvas to draw tile
      const c = document.createElement('canvas')
      c.width = tileDisplayWidth * dpr
      c.height = height * dpr
      c.style.width = `${tileDisplayWidth}px`
      c.style.height = `${height}px`
      const ctx = c.getContext('2d')
      ctx.setTransform(dpr,0,0,dpr,0,0)
      // fill background
      ctx.fillStyle = '#071024'
      ctx.fillRect(0, 0, tileDisplayWidth, height)
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1

      // for each display pixel in tile, aggregate min/max from channelData
      const samplesLen = channelData.length
      for (let dx = 0; dx < tileDisplayWidth; dx++) {
        // compute logical x for this display pixel
        const logicalX = tileLogicalStart + Math.floor(dx / Math.max(scale, 1e-6))
        const startSample = Math.floor(logicalX * samplesPerPixelFloat)
        const endSample = Math.min(samplesLen - 1, Math.floor((logicalX + 1) * samplesPerPixelFloat) - 1)
        let min = 1.0
        let max = -1.0
        if (startSample <= endSample && startSample < samplesLen) {
          for (let i = startSample; i <= endSample; i++) {
            const v = channelData[i]
            if (v < min) min = v
            if (v > max) max = v
          }
        }
        const y1 = (1 + min) * 0.5 * height
        const y2 = (1 + max) * 0.5 * height
        const sx = dx + 0.5
        ctx.beginPath()
        ctx.moveTo(sx, y1)
        ctx.lineTo(sx, y2)
        ctx.stroke()
      }

      // convert to ImageBitmap if supported for faster draws
      let bitmap = null
      if (typeof createImageBitmap === 'function') {
        try { bitmap = await createImageBitmap(c) } catch (e) { bitmap = c }
      } else bitmap = c

      tileCacheRef.current.set(key, { bitmap })
    } catch (e) {
      // generation failed; ensure key removed from queue and cache
      console.warn('generateTile error', e)
    } finally {
      tileQueueRef.current.delete(key)
    }
  }

  function handleClick(e) {
    const base = baseCanvasRef.current
    const container = containerRef.current
    const content = contentRef.current
    if (!base || !container || !content || !audioBuffer) return
    const rect = base.getBoundingClientRect()
    const clickX = (e.clientX - rect.left)
    const scrollLeftDisplay = container.scrollLeft
    const duration = audioBuffer.duration
    const pps = computePpsForDuration(duration, pixelsPerSecond)
    const totalWidth = Math.max(Math.round(duration * pps), container.clientWidth)
    const displayWidth = Math.min(totalWidth, MAX_CANVAS_PX)
    const displayGlobalX = clickX + scrollLeftDisplay
    const logicalX = displayToLogical(displayGlobalX)
    const time = (logicalX / Math.max(1, totalWidth)) * duration

    // convert pixel threshold to time threshold
    const pxThreshold = 10
    const timeThresholdLogical = Math.max(1, Math.floor((pxThreshold) / Math.max(scale, 1e-6)))
    const timeThreshold = (timeThresholdLogical / Math.max(1, totalWidth)) * duration
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i] - time) <= timeThreshold) {
        onRemoveSample(i)
        return
      }
    }

    onAddSample(time)
  }

  function handleSeek(e) {
    const base = baseCanvasRef.current
    const container = containerRef.current
    const content = contentRef.current
    if (!base || !container || !content || !audioBuffer) return
    const rect = base.getBoundingClientRect()
    const clickX = (e.clientX - rect.left)
    const scrollLeftDisplay = container.scrollLeft
    const duration = audioBuffer.duration
    const pps = computePpsForDuration(duration, pixelsPerSecond)
    const totalWidth = Math.max(Math.round(duration * pps), container.clientWidth)
    const displayWidth = Math.min(totalWidth, MAX_CANVAS_PX)
    const displayGlobalX = clickX + scrollLeftDisplay
    const logicalX = displayToLogical(displayGlobalX)
    const time = (logicalX / Math.max(1, totalWidth)) * duration
    // persist timeline position
    setTimelinePos(time)
    onSeek(time)
  }

  function handleContextMenu(e) {
    e.preventDefault()
    const base = baseCanvasRef.current
    const container = containerRef.current
    const content = contentRef.current
    if (!base || !container || !content || !audioBuffer) return
    const rect = base.getBoundingClientRect()
    const clickX = (e.clientX - rect.left)
    const scrollLeftDisplay = container.scrollLeft
    const duration = audioBuffer.duration
    const pps = computePpsForDuration(duration, pixelsPerSecond)
    const totalWidth = Math.max(Math.round(duration * pps), container.clientWidth)
    const displayWidth = Math.min(totalWidth, MAX_CANVAS_PX)
    const displayGlobalX = clickX + scrollLeftDisplay
    const logicalX = displayToLogical(displayGlobalX)
    const time = (logicalX / Math.max(1, totalWidth)) * duration
    // if right-click near a marker -> remove it (time-based threshold)
    const pxThreshold = 10
    const timeThresholdLogical = Math.max(1, Math.floor((pxThreshold) / Math.max(scale, 1e-6)))
    const timeThreshold = (timeThresholdLogical / Math.max(1, totalWidth)) * duration
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i] - time) <= timeThreshold) {
        onRemoveSample(i)
        return
      }
    }

    // otherwise right-click seeks playhead and persists timeline position
    setTimelinePos(time)
    if (player && typeof player.seek === 'function') player.seek(time)
  }

  // simple scrub: user holds mouse and moves to seek
  function handleMouseMove(e) {
    const base = baseCanvasRef.current
    const container = containerRef.current
    const content = contentRef.current
    if (!base || !container || !content || !audioBuffer) return
    const rect = base.getBoundingClientRect()
    const clickX = (e.clientX - rect.left)
    const scrollLeftDisplay = container.scrollLeft
    const duration = audioBuffer.duration
    const pps = computePpsForDuration(duration, pixelsPerSecond)
    const totalWidth = Math.max(Math.round(duration * pps), container.clientWidth)
    const displayWidth = Math.min(totalWidth, MAX_CANVAS_PX)
    const offsetDisplayX = Math.round(((offset / 1000) / Math.max(1, duration)) * displayWidth) - scrollLeftDisplay
    const nearOffset = Math.abs(clickX - offsetDisplayX) <= 8
    base.style.cursor = nearOffset ? 'ew-resize' : 'crosshair'
  }

  function handleMouseDown(e) {
    // if mousedown near offset line -> start offset drag
    const base = baseCanvasRef.current
    const container = containerRef.current
    const content = contentRef.current
    if (!base || !container || !content || !audioBuffer) return
    const rect = base.getBoundingClientRect()
    const clickX = (e.clientX - rect.left)
    const scrollLeftDisplay = container.scrollLeft
    const duration = audioBuffer.duration
    const pps = computePpsForDuration(duration, pixelsPerSecond)
    const totalWidth = Math.max(Math.round(duration * pps), container.clientWidth)
    const displayWidth = Math.min(totalWidth, MAX_CANVAS_PX)
    const displayX = clickX + scrollLeftDisplay
    const offsetDisplayX = Math.round(((offset / 1000) / Math.max(1, duration)) * displayWidth)
    const nearOffset = Math.abs(displayX - offsetDisplayX) <= 8
    if (nearOffset && typeof onOffsetChange === 'function') {
      // start drag
      draggingOffset = true
      dragStartX = displayX
      originalOffset = offset
      function onMove(ev) {
        const moveX = (ev.clientX - rect.left) + container.scrollLeft
        const newTime = (moveX / Math.max(1, displayWidth)) * duration
        const newOffset = Math.max(0, newTime) * 1000
        onOffsetChange(Math.round(newOffset))
      }
      function onUp() {
        draggingOffset = false
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
      return
    }

    // otherwise scrub
    handleSeek(e)
    function onMove(ev) { handleSeek(ev) }
    function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // scrollbar helpers removed; using native scrollbar for correctness and simplicity

  // schedule render via requestAnimationFrame to avoid heavy work on every scroll event
  const scrollRafRef = useRef(null)
  function scheduleRender() {
    if (scrollRafRef.current) return
    scrollRafRef.current = requestAnimationFrame(() => {
      renderBasePortion()
      // update overlay position immediately only while playing to avoid forcing scroll when idle
      if (player && player.isPlaying && typeof player.getCurrentTime === 'function') {
        try { drawOverlay(player.getCurrentTime()) } catch (e) { console.warn('drawOverlay error', e) }
      } else {
        try { drawOverlay(timelinePosRef.current || 0) } catch (e) { /* ignore */ }
      }
      scrollRafRef.current = null
    })
  }

  // overlay RAF while playing: poll player.isPlaying and start/stop a RAF loop for smooth playhead
  const overlayRafRef = useRef(null)
  const playingPollRef = useRef(false)
  useEffect(() => {
    if (!player) return
    const pollId = setInterval(() => {
      try {
        const playing = !!player.isPlaying
        if (playing && !playingPollRef.current) {
          // start RAF loop
          playingPollRef.current = true
          const getOverlayTime = () => {
            if (player && player.isPlaying) return player.getCurrentTime ? player.getCurrentTime() : 0
            return timelinePosRef.current || 0
          }
          const tick = () => {
            try { drawOverlay(getOverlayTime()) } catch (e) { /* ignore */ }
            overlayRafRef.current = requestAnimationFrame(tick)
          }
          tick()
        } else if (!playing && playingPollRef.current) {
          // stop RAF
          playingPollRef.current = false
          if (overlayRafRef.current) { cancelAnimationFrame(overlayRafRef.current); overlayRafRef.current = null }
          try { drawOverlay(timelinePosRef.current || 0) } catch (e) { /* ignore */ }
        }
      } catch (e) {}
    }, 200)
    return () => { clearInterval(pollId); if (overlayRafRef.current) cancelAnimationFrame(overlayRafRef.current) }
  }, [player])

  // attach a native wheel listener to hijack wheel events for zooming and prevent page scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handler = (e) => {
      // only act when over the container
      e.preventDefault()
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const scrollLeft = container.scrollLeft
      const displayX = mouseX + scrollLeft
      // compute logical position under cursor
      const duration = audioBuffer ? audioBuffer.duration : 1
      const ppsCur = pixelsPerSecondRef.current || pixelsPerSecond
      const totalWidthCur = Math.max(Math.round(duration * ppsCur), container.clientWidth)
      const displayWidthCur = Math.min(totalWidthCur, MAX_CANVAS_PX)
      const scaleCur = displayWidthCur / Math.max(1, totalWidthCur)
      const displayToLogicalLocal = (dx) => Math.floor(dx / Math.max(scaleCur, 1e-6))
      const logicalUnder = displayToLogicalLocal(displayX)

      const delta = e.deltaY
      const factor = Math.exp(-delta * 0.001)
      const cur = pixelsPerSecondRef.current || pixelsPerSecond
      const newPps = Math.max(10, Math.min(200000, Math.round(cur * factor)))

      // compute new scroll so logicalUnder stays under mouseX
      const totalWidthNew = Math.max(Math.round(duration * newPps), container.clientWidth)
      const displayWidthNew = Math.min(totalWidthNew, MAX_CANVAS_PX)
      const scaleNew = displayWidthNew / Math.max(1, totalWidthNew)
      const logicalToDisplayLocal = (lx) => Math.round(lx * scaleNew)
      const newDisplayX = logicalToDisplayLocal(logicalUnder)
      const newScrollLeft = Math.max(0, Math.min(Math.round(newDisplayX - mouseX), Math.max(0, Math.round(displayWidthNew - rect.width))))

      setPixelsPerSecond(newPps)
      // ensure state updated before render; directly set scroll then render
      setTimeout(() => {
        if (container) container.scrollLeft = newScrollLeft
        renderBaseWaveform(newPps)
      }, 0)
    }
    container.addEventListener('wheel', handler, { passive: false })
    return () => container.removeEventListener('wheel', handler)
  }, [audioBuffer])

  // debug tick to force occasional re-render for debug readout
  useEffect(() => {
    const id = setInterval(() => setDebugTick((t) => (t + 1) % 100000), 250)
    return () => clearInterval(id)
  }, [])


  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2">
      <div className="flex items-center gap-3 mb-2">
        <label className="text-xs text-slate-300">Zoom</label>
        <input
          type="range"
          min={20}
          max={2000}
          value={pixelsPerSecond}
          onChange={(e) => {
            const v = Number(e.target.value)
            // zoom into current timeline position
            const container = containerRef.current
            if (container && audioBuffer) {
              const rect = container.getBoundingClientRect()
              const centerSec = player && player.isPlaying ? (player.getCurrentTime ? player.getCurrentTime() : 0) : (timelinePosRef.current || 0)
              const duration = audioBuffer.duration
              const ppsCur = pixelsPerSecondRef.current || pixelsPerSecond
              const totalWidthCur = Math.max(Math.round(duration * ppsCur), container.clientWidth)
              const displayWidthCur = Math.min(totalWidthCur, MAX_CANVAS_PX)
              const scaleCur = displayWidthCur / Math.max(1, totalWidthCur)
              const logicalCenter = Math.round(centerSec * ppsCur)
              // compute new scale and scroll to center logicalCenter in viewport
              const totalWidthNew = Math.max(Math.round(duration * v), container.clientWidth)
              const displayWidthNew = Math.min(totalWidthNew, MAX_CANVAS_PX)
              const scaleNew = displayWidthNew / Math.max(1, totalWidthNew)
              const newDisplayCenter = Math.round(logicalCenter * scaleNew)
              const newScrollLeft = Math.max(0, Math.min(newDisplayCenter - Math.round(rect.width/2), Math.max(0, Math.round(displayWidthNew - rect.width))))
              setPixelsPerSecond(v)
              setTimeout(() => { if (container) container.scrollLeft = newScrollLeft; renderBaseWaveform(v) }, 0)
            } else {
              setPixelsPerSecond(v)
              renderBaseWaveform(v)
            }
          }}
        />
        <div className="text-xs text-slate-400">{pixelsPerSecond} px/s</div>
      </div>

      <div ref={containerRef} className="overflow-x-auto overflow-y-hidden relative" style={{ maxWidth: '100%', height: '180px' }} onScroll={() => scheduleRender() }>
          {/* spacer to create the scroll width */}
          <div ref={contentRef} style={{ height: '180px' }} />
          {/* canvases positioned over the container viewport; draw uses container.scrollLeft to map logical coords */}
          <canvas ref={baseCanvasRef} style={{ position: 'absolute', left: 0, top: 0 }} onClick={handleClick} onDoubleClick={handleClick} onMouseDown={handleMouseDown} onContextMenu={handleContextMenu} onMouseMove={handleMouseMove} />
          <canvas ref={overlayCanvasRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
        </div>

        <div>
          <p className="text-xs text-slate-400 mt-2 mb-2">Click to add a mark. Drag on waveform to scrub/seek. Zoom for detail. Left-click marker to remove; right-click to seek (or right-click marker to remove).</p>

          {/* debug readout to help diagnose scroll/zoom issues */}
          <div className="text-xs text-slate-500">
            <span>scrollLeft: </span>
            <span id="wf-debug-scroll">{containerRef.current ? containerRef.current.scrollLeft : 0}</span>
            <span> • contentWidth: </span>
            <span id="wf-debug-width">{contentRef.current ? contentRef.current.style.width : '0px'}</span>
            <span> • viewport: </span>
            <span id="wf-debug-viewport">{containerRef.current ? containerRef.current.clientWidth : 0}</span>
            <span> • px/s: </span>
            <span>{pixelsPerSecond}</span>
          </div>
        </div>
        </div>
  )
}
