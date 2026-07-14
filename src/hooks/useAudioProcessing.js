// Provides audio processing utilities used by the app
// computeAverage(audioBuffer, sampleTimes[])
// Returns a Float32Array containing the averaged waveform centered around the marked times.

export function useAudioProcessing() {
  // default window length for each sample (in seconds)
  const defaultWindowSec = 0.25 // 250ms window

  function computeAverage(audioBuffer, sampleTimes, windowSecOrConfig = defaultWindowSec) {
    if (!audioBuffer || !sampleTimes || sampleTimes.length === 0) return null
    const sr = audioBuffer.sampleRate

    let preSec = defaultWindowSec / 2
    let postSec = defaultWindowSec / 2
    if (typeof windowSecOrConfig === 'number') {
      preSec = windowSecOrConfig / 2
      postSec = windowSecOrConfig / 2
    } else if (windowSecOrConfig && typeof windowSecOrConfig === 'object') {
      if (typeof windowSecOrConfig.preSec === 'number') preSec = windowSecOrConfig.preSec
      if (typeof windowSecOrConfig.postSec === 'number') postSec = windowSecOrConfig.postSec
      if (typeof windowSecOrConfig.totalSec === 'number') {
        const half = windowSecOrConfig.totalSec / 2
        preSec = half
        postSec = half
      }
    }

    const preSamples = Math.max(0, Math.floor(preSec * sr))
    const postSamples = Math.max(0, Math.floor(postSec * sr))
    const windowSamples = Math.max(16, preSamples + postSamples)

    const accum = new Float32Array(windowSamples).fill(0)
    let count = 0

    const channelData = audioBuffer.numberOfChannels > 0 ? audioBuffer.getChannelData(0) : null
    if (!channelData) return null
    const audioLength = channelData.length

    for (let t of sampleTimes) {
      if (t < 0 || t > audioBuffer.duration) continue
      const centerSample = Math.floor(t * sr)
      const start = centerSample - preSamples
      const snippet = new Float32Array(windowSamples)

      for (let i = 0; i < windowSamples; i++) {
        const idx = start + i
        if (idx >= 0 && idx < audioLength) {
          snippet[i] = channelData[idx]
        }
      }

      for (let i = 0; i < windowSamples; i++) {
        const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSamples - 1)))
        accum[i] += snippet[i] * w
      }

      count++
    }

    if (count === 0) return null

    const hannSum = (() => {
      let s = 0
      for (let i = 0; i < windowSamples; i++) {
        s += 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSamples - 1)))
      }
      return s
    })()

    const out = new Float32Array(windowSamples)
    const scale = count * hannSum / windowSamples
    for (let i = 0; i < windowSamples; i++) {
      out[i] = accum[i] / scale
    }

    let max = 0
    for (let i = 0; i < out.length; i++) {
      const v = Math.abs(out[i])
      if (v > max) max = v
    }
    if (max > 1e-6) {
      for (let i = 0; i < out.length; i++) out[i] = out[i] / max
    }

    return out
  }

  return { computeAverage }
}
