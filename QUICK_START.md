# Quick Start Guide

## Installation (2 minutes)

1. **Copy these files to your project**:
   ```
   src/
   ├── App.jsx (replace)
   ├── index.css (replace)
   ├── components/
   │   ├── Editor.jsx (new)
   │   ├── Waveform.jsx (replace)
   │   └── Sidebar.jsx (new)
   └── hooks/
       ├── useUndoRedo.js (new)
       └── useKeyboardShortcuts.js (new)
   ```

2. **Keep these existing files**:
   ```
   src/
   ├── main.jsx
   ├── hooks/
   │   ├── useAudioPlayer.js
   │   └── useAudioProcessing.js
   ```

3. **Start the app**:
   ```bash
   npm install  # if needed
   npm run dev
   ```

## First Use (5 minutes)

### 1. Load an Audio File
- Click **"Load Audio"** button in the sidebar (left side)
- Select any audio file (MP3, WAV, AAC, OGG, etc.)
- You'll see the waveform appear in the main area
- Blue line = audio waveform
- Gray lines = beat grid

### 2. Adjust Settings
**BPM** (Beats Per Minute):
- Use the slider or type a number
- This sets the timing grid
- Default: 120 BPM (good for testing)

**Offset** (milliseconds):
- Adjusts where beat 1 starts
- Orange line shows offset position
- Usually 0 for most audio

**Subdivision**:
- How many marks per beat
- Higher = more precise grid
- Try 4 for quarter notes

**Enable Snap to Grid**:
- Makes marks align perfectly to grid
- Recommended: ON

### 3. Mark Samples
**Click on the waveform** to add a sample marker:
- You'll see a red dot appear
- Red shaded region shows sample window (0.25 seconds by default)
- Each sample appears in the list on the left

**To remove a sample**:
- Double-click the marker, OR
- Click the ✕ button next to it in the list

### 4. Play & Review
- Click **Play** button (or press Space)
- Waveform scrolls automatically
- White line = current playback position
- Adjust **Speed** to slow down for careful listening

### 5. Extract the Sample
- Once you have samples marked, click **Extract Sample**
- A WAV file downloads automatically
- The extracted sample is averaged from all your marks
- File named: `sample_[timestamp].wav`

## Common Tasks

### Mark a Series of Drums
1. Set BPM to match your audio (tap tempo if needed)
2. Turn ON snap-to-grid
3. Set Subdivision to 4
4. Click each drum hit - they'll snap to the grid
5. Extract to get perfect drum sample

### Find Exact Timing
1. Zoom in with the Zoom slider (200%+ for precision)
2. Enable metronome to hear the click
3. Listen carefully
4. Mark right at the beat
5. Use Undo if you miss (Ctrl+Z)

### Adjust Playback Speed
1. Use the Speed slider (0.25x to 2x)
2. Slower = easier to hear details
3. Faster = hear overall shape
4. This doesn't affect the extracted audio

### Remove Accidental Marks
- Single click → selects and seeks
- Ctrl+Z → undo last action
- Delete key → remove last mark
- Double-click → delete specific mark

## Keyboard Shortcuts

```
Space          Play/Pause playback
Delete         Remove last sample
Ctrl+Z (Cmd+Z) Undo
Ctrl+Y (Cmd+Y) Redo
```

**Scroll**: Zoom in/out on waveform
**Right-click**: Seek to clicked position

## Pro Tips

### Get Better Results
1. **Listen first** - understand the audio structure
2. **Mark multiple examples** - 3-5 good samples → better average
3. **Use the grid** - snap-to-grid prevents timing issues
4. **Zoom in** - mark with precision at 200%+
5. **Verify playback** - always listen before extracting

### Troubleshooting

**"Load an audio file to begin"**
- Click "Load Audio" button
- Some browsers need user interaction first

**Marks won't appear**
- Check zoom level
- Make sure snap-to-grid matches grid
- Try zooming to 100%

**Playhead jumps around**
- Refresh browser (F5)
- Reload audio file
- Check browser developer tools (F12) for errors

**Download doesn't work**
- Check browser download settings
- Clear browser cache (Ctrl+Shift+Del)
- Try different browser

### Settings Explained

| Control | Range | What It Does |
|---------|-------|-------------|
| BPM | 40-240 | Tempo of the grid |
| Offset | 0-2000ms | When beat 1 starts |
| Subdivision | 1, 2, 4, 8, 16 | Marks per beat |
| Snap to Grid | On/Off | Auto-align marks |
| Zoom | 25%-400% | Magnification level |
| Speed | 0.25x-2x | Playback speed |
| Volume | 0-100% | Playback loudness |
| Metronome | On/Off | Click sound during playback |

## Sample Extraction Explained

**What happens when you click Extract**:
1. Each sample window (0.25s) is centered on your marks
2. All windows are averaged together
3. Hann window applied to reduce edge artifacts
4. Peak normalized to prevent clipping
5. Encoded as 16-bit PCM WAV
6. Downloaded as `sample_[timestamp].wav`

**The result**:
- Clean averaged sample
- Perfect timing (frame-accurate)
- Ready to drop into production
- No re-encoding artifacts
- Full audio quality preserved

## Examples

### Extract a Snare Drum
1. Load breakbeat loop
2. BPM: 130 (or detect from audio)
3. Subdivision: 4
4. Click every snare hit (usually on 2 and 4)
5. Extract → instant snare sample

### Extract a Bass Loop
1. Load funk bass sample
2. BPM: 95
3. Set Offset to align with downbeat
4. Mark 1-2 clean bass cycles
5. Extract → loopable bass sample

### Extract Vocal Chop
1. Load vocal phrase
2. BPM: 100
3. Mark each syllable
4. Extract → individual samples to chop

## File Information

**Supported Formats**:
- MP3 (all modern browsers)
- WAV (all browsers)
- AAC/M4A (most modern browsers)
- OGG/Opus (all modern browsers)
- FLAC (most browsers)

**Extract Format**:
- WAV (16-bit PCM, 44.1kHz or original sample rate)
- Compatible with all DAWs and audio software

## Getting Help

### Check the Docs
- **README.md** - Full feature documentation
- **CHANGES_SUMMARY.md** - What's new
- **MIGRATION_GUIDE.md** - Setup instructions

### Debugging
- Open Developer Tools (F12)
- Check Console tab for errors
- Try reloading the page
- Clear browser cache
- Try different browser

### Report Issues
- Screenshots help! (F11 for fullscreen)
- Note browser and OS
- Describe exact steps to reproduce
- Share any error messages from console

## Next Steps

1. **Load your first audio** → get familiar with the interface
2. **Practice marking samples** → test snap-to-grid and zoom
3. **Extract your first sample** → verify it sounds right
4. **Explore settings** → find your preferred workflow
5. **Use keyboard shortcuts** → speed up your workflow

---

## Workflow Summary

```
1. Load audio file
   ↓
2. Set BPM and offset for timing grid
   ↓
3. Enable snap-to-grid for precision
   ↓
4. Click waveform to mark sample locations
   (3-5 marks recommended)
   ↓
5. Play and verify marks align with audio
   (use speed control to listen carefully)
   ↓
6. Remove any bad marks (double-click or Delete)
   ↓
7. Click "Extract Sample" to download WAV
   ↓
Done! Use the WAV in your production
```

**Total time**: 2-5 minutes per extraction

---

## Pro Workflow (Advanced)

### Batch Extract Multiple Samples

1. Load first audio file
2. Mark and extract 5-6 samples in different sections
3. Load different audio file (samples clear automatically, use Ctrl+Z if needed)
4. Repeat with new BPM/settings
5. Organize all extracted samples in folder

### Create Sample Packs

1. Extract multiple variations from one audio file
   - Different regions
   - Different zoom levels (close vs wide)
   - Different snap settings

2. Name them logically:
   - `kick_variation_01.wav`
   - `kick_variation_02.wav`
   - etc.

3. Zip them together for distribution

### Sync to DAW Tempo

1. Know your DAW tempo
2. Set Sample Extractor BPM to match
3. Align Offset if needed
4. Extract → samples will align perfectly when dropped in DAW

---

**You're ready!** Start with the Basic Workflow above and explore from there. The app is designed to be intuitive - just start clicking and marking. 🎵

Have fun extracting!
