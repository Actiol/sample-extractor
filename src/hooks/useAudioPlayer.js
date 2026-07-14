import { useState, useRef, useEffect } from 'react'

// Enhanced audio player with play/pause/seek, volume, playbackRate and progress callback
export function useAudioPlayer(audioContextRef) {
  const sourceRef = useRef(null)
  const gainRef = useRef(null)
  const bufferRef = useRef(null)

  // playback tracking
  const startTimeRef = useRef(0) // context.currentTime when started
  const startOffsetRef = useRef(0) // seconds into buffer where start happened
  const pausedAtRef = useRef(null) // seconds position when paused
  const playbackRateRef = useRef(1)
  const volumeRef = useRef(1)

  const rafRef = useRef(null)
  const progressCbRef = useRef(null)
  const fallbackAudioRef = useRef(null) // HTMLAudioElement fallback instance
  const fallbackStartOffsetRef = useRef(0)

  const [isPlaying, setIsPlaying] = useState(false)

  function ensureContext() {
    if (!audioContextRef) return null
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioContextRef.current
  }

  useEffect(() => {
    return () => {
      try { stop(); } catch (e) {}
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function _updateProgress() {
    const cb = progressCbRef.current
    if (cb) {
      cb(getCurrentTime())
    }
    rafRef.current = requestAnimationFrame(_updateProgress)
  }

  function getCurrentTime() {
    // If fallback audio element is active, use its playback time
    try {
      if (fallbackAudioRef.current) {
        const a = fallbackAudioRef.current
        const offset = fallbackStartOffsetRef.current || 0
        const t = (a.currentTime || 0) + offset
        if (bufferRef.current && typeof bufferRef.current.duration === 'number') return Math.min(t, bufferRef.current.duration)
        return t
      }
    } catch (e) {}

    const ctx = ensureContext()
    if (!ctx || !bufferRef.current) return 0
    if (!isPlaying) {
      return pausedAtRef.current != null ? pausedAtRef.current : 0
    }
    const elapsed = (ctx.currentTime - startTimeRef.current) * playbackRateRef.current
    const pos = startOffsetRef.current + elapsed
    // clamp
    return Math.min(Math.max(0, pos), bufferRef.current.duration)
  }

  function _createSource(buffer, offsetSeconds = 0) {
    const ctx = ensureContext()
    if (!ctx) return null
    const src = ctx.createBufferSource()
    src.buffer = buffer
    console.log('useAudioPlayer: creating source buffer duration=', buffer && buffer.duration)
    src.playbackRate.value = playbackRateRef.current
    const gain = ctx.createGain()
    gain.gain.value = volumeRef.current
    src.connect(gain).connect(ctx.destination)
    src.onended = () => {
      console.log('useAudioPlayer: source ended')
      // cleanup and mark stopped
      try { if (sourceRef.current === src) sourceRef.current = null } catch (e) {}
      try { if (gainRef.current === gain) gainRef.current = null } catch (e) {}
      pausedAtRef.current = null
      setIsPlaying(false)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      if (progressCbRef.current) progressCbRef.current(getCurrentTime())
    }
    sourceRef.current = src
    gainRef.current = gain
    return src
  }

  async function play(buffer, startAt = 0) {
    const ctx = ensureContext()
    if (!ctx) return

    // normalize incoming buffer: accept AudioBuffer, Float32Array, ArrayBuffer
    let audioBuf = buffer
    try {
      if (!buffer) {
        console.warn('useAudioPlayer.play called with falsy buffer:', buffer)
          console.trace()
          return false
        }
      // If ArrayBuffer (raw PCM or encoded), try to decodeAudioData
      if (buffer instanceof ArrayBuffer) {
        try {
          audioBuf = await ctx.decodeAudioData(buffer.slice(0))
          console.log('useAudioPlayer: decoded ArrayBuffer into AudioBuffer duration=', audioBuf && audioBuf.duration)
        } catch (e) {
          console.warn('useAudioPlayer: decodeAudioData failed', e)
          return
        }
      }
      // If Float32Array, create AudioBuffer wrapper
      if (buffer instanceof Float32Array || (Array.isArray(buffer) && typeof buffer[0] === 'number')) {
        const samples = buffer instanceof Float32Array ? buffer : Float32Array.from(buffer)
        const b = ctx.createBuffer(1, samples.length, ctx.sampleRate)
        b.getChannelData(0).set(samples)
        audioBuf = b
        console.log('useAudioPlayer: converted Float32Array to AudioBuffer, duration=', audioBuf.duration)
      }
    } catch (e) {
      console.warn('useAudioPlayer: error normalizing buffer', e)
      return
    }

    if (!audioBuf || typeof audioBuf.duration !== 'number') {
      console.warn('useAudioPlayer: invalid audio buffer passed to play():', audioBuf)
      return
    }

    // if same buffer, allow resume/seek
    stop()
    bufferRef.current = audioBuf

    const src = _createSource(audioBuf, startAt)
    try {
        console.log('useAudioPlayer: requested play at', startAt, 'buffer.duration=', audioBuf && audioBuf.duration, 'ctx.state=', ctx.state)
        if (ctx.state === 'suspended') {
          // resume must be called from a user gesture; await to ensure timing
          console.log('useAudioPlayer: context suspended, resuming...')
          await ctx.resume()
          console.log('useAudioPlayer: context resumed; ctx.state=', ctx.state)
        }
        const when = 0
        // start from offset startAt (clamp)
        const clampedStart = Math.max(0, Math.min(startAt, audioBuf.duration))
        src.start(when, clampedStart)
        console.log('useAudioPlayer: source started at ctx.currentTime=', ctx.currentTime, 'startOffset=', clampedStart)
        startTimeRef.current = ctx.currentTime
        startOffsetRef.current = clampedStart
        pausedAtRef.current = null
        setIsPlaying(true)
        // start RAF progress
        if (!rafRef.current) rafRef.current = requestAnimationFrame(_updateProgress)
        // short delay to detect immediate end (source ended synchronously in some environments)
        await new Promise((res) => setTimeout(res, 60))
        if (!sourceRef.current) {
          console.warn('useAudioPlayer: source ended immediately after start — treating as failure')
          // ensure state cleared
          setIsPlaying(false)
          if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
              // attempt HTMLAudioElement fallback using audioBuf and start offset
              try {
                const okFallback = playFallbackWithAudioElement(audioBuf, clampedStart)
                return okFallback
              } catch (e) {
                console.warn('useAudioPlayer: fallback failed', e)
                return false
              }
            }
            return true
          } catch (err) {
            console.error('Play failed', err)
            return false
          }
        }

  function pause() {
    if (!isPlaying) return
    const ctx = ensureContext()
    if (!ctx) return
    // capture current position
    const pos = getCurrentTime()
    pausedAtRef.current = pos
    // stop source
    try {
      if (sourceRef.current) sourceRef.current.stop()
    } catch (e) {}
    sourceRef.current = null
    // stop fallback audio if playing
    try { if (fallbackAudioRef.current) { fallbackAudioRef.current.pause(); fallbackAudioRef.current = null } } catch (e) {}
    setIsPlaying(false)
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  function resume() {
    if (isPlaying || bufferRef.current == null) return
    play(bufferRef.current, pausedAtRef.current || 0)
  }

  function stop() {
    try {
      if (sourceRef.current) sourceRef.current.stop()
    } catch (e) {}
    sourceRef.current = null
    // stop fallback audio
    try { if (fallbackAudioRef.current) { fallbackAudioRef.current.pause(); fallbackAudioRef.current = null } } catch (e) {}
    pausedAtRef.current = null
    bufferRef.current = null
    setIsPlaying(false)
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  function seek(seconds) {
    if (!bufferRef.current) return
    const clamped = Math.max(0, Math.min(seconds, bufferRef.current.duration))
    const wasPlaying = isPlaying
    stop()
    pausedAtRef.current = clamped
    if (wasPlaying) play(bufferRef.current, clamped)
    else if (progressCbRef.current) progressCbRef.current(clamped)
  }

  function setPlaybackRate(rate) {
    playbackRateRef.current = rate
    // if playing, restart at current position to apply rate change
    const pos = getCurrentTime()
    const wasPlaying = isPlaying
    if (wasPlaying && bufferRef.current) {
      stop()
      play(bufferRef.current, pos)
    }
  }

  // HTMLAudioElement fallback player: generate WAV and play
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
    let offset = 44
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
    return buffer
  }

  function playFallbackWithAudioElement(audioBuf, startAtSec = 0) {
    try {
      if (!audioBuf || typeof audioBuf.getChannelData !== 'function') return false
      const sampleRate = audioBuf.sampleRate || (audioContextRef && audioContextRef.current && audioContextRef.current.sampleRate) || 44100
      const channelData = audioBuf.getChannelData(0)
      const startSample = Math.floor(startAtSec * sampleRate)
      const remaining = channelData.length - startSample
      if (remaining <= 0) return false
      const slice = channelData.subarray(startSample)
      const wav = encodeWAV(slice, sampleRate)
      const blob = new Blob([wav], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const a = new Audio(url)
      // store fallback start offset so getCurrentTime can report accurate position
      fallbackStartOffsetRef.current = startAtSec
      fallbackAudioRef.current = a
      a.play().catch(e => {
        console.warn('Fallback Audio playback failed', e)
      })
      a.onended = () => {
        try { URL.revokeObjectURL(url) } catch (e) {}
        if (fallbackAudioRef.current === a) fallbackAudioRef.current = null
        // update playback state and progress callback
        setIsPlaying(false)
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
        if (progressCbRef.current) progressCbRef.current(getCurrentTime())
      }
      // start RAF progress for fallback audio
      if (!rafRef.current) rafRef.current = requestAnimationFrame(_updateProgress)
      setIsPlaying(true)
      return true
    } catch (e) {
      console.warn('playFallbackWithAudioElement error', e)
      return false
    }
  }

  function setVolume(vol) {
    volumeRef.current = vol
    if (gainRef.current) gainRef.current.gain.value = vol
  }

  function onProgress(cb) {
    progressCbRef.current = cb
  }

  return {
    play,
    pause,
    resume,
    stop,
    seek,
    setPlaybackRate,
    setVolume,
    onProgress,
    getCurrentTime,
    isPlaying
  }
}
