// Provides audio processing utilities used by the app
// computeAverage(audioBuffer, sampleTimes[])
// Returns a Float32Array containing the averaged waveform centered around the marked times.

export function useAudioProcessing() {
  // default window length for each sample (in seconds)
  const defaultWindowSec = 0.25 // 250ms window

  function computeAverage(audioBuffer, sampleTimes, windowSec = defaultWindowSec) {
    if (!audioBuffer || !sampleTimes || sampleTimes.length === 0) return null
    const sr = audioBuffer.sampleRate
    const windowSamples = Math.max(16, Math.floor(windowSec * sr))
    const half = Math.floor(windowSamples / 2)

    // We'll center each snippet on the sample time and resample/align to windowSamples
    const accum = new Float32Array(windowSamples).fill(0)
    let count = 0

    for (let t of sampleTimes) {
      // clamp
      if (t < 0 || t > audioBuffer.duration) continue
      const centerSample = Math.floor(t * sr)
      const start = centerSample - half
      const snippet = new Float32Array(windowSamples)

      const channelData = audioBuffer.numberOfChannels > 0 ? audioBuffer.getChannelData(0) : null
      if (!channelData) continue

      for (let i = 0; i < windowSamples; i++) {
        const idx = start + i
        if (idx >= 0 && idx < channelData.length) {
          snippet[i] = channelData[idx]
        } else {
          snippet[i] = 0
        }
      }

      // optionally apply a small window (Hann) to reduce edge artifacts
      for (let i = 0; i < windowSamples; i++) {
        const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSamples - 1)))
        accum[i] += snippet[i] * w
      }

      count++
    }

    if (count === 0) return null

    // normalize by count and by window sum
    // compute hann sum
    const hannSum = (() => {
      let s = 0
      for (let i = 0; i < windowSamples; i++) {
        s += 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSamples - 1)))
      }
      return s
    })()

    const out = new Float32Array(windowSamples)
    for (let i = 0; i < windowSamples; i++) {
      out[i] = accum[i] / (count * hannSum / windowSamples)
    }

    // normalize peak to -1..1 to avoid clipping when encoding
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
