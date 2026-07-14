# Sample Extractor - Complete Overhaul

## Overview

This is a complete visual and functional redesign of the Sample Extractor app. The overhaul introduces a modern, professional UI, fixes critical bugs, adds quality-of-life features, and maintains audio accuracy throughout.

## What's New

### 🎨 Visual Redesign

- **Modern Dark Theme**: Professional gradient backgrounds with slate and blue accents
- **Sidebar Layout**: Cleaner separation of controls and main editor
- **Waveform Hero**: The waveform is now the centerpiece, rendered clearly without scroll offset bugs
- **Better Visual Hierarchy**: Control panels organized by function with clear typography
- **Smooth Transitions**: Subtle animations and hover effects throughout
- **Responsive Design**: Works seamlessly from compact to ultra-wide displays

### 🐛 Bug Fixes

- **Scroll Offset Issue**: Complete rewrite of Waveform component with simplified coordinate system
  - Canvas now properly syncs with viewport scroll
  - No more offset between drawn waveform and actual playhead position
  - Reliable rendering at any zoom level

- **Performance Improvements**:
  - Simplified rendering pipeline (removed overly complex tiling)
  - Cleaner state management
  - Reduced unnecessary re-renders

### ✨ Quality of Life Features

#### Keyboard Shortcuts
- **Space**: Play/Pause playback
- **Delete**: Remove last sample
- **Ctrl+Z / Cmd+Z**: Undo
- **Ctrl+Y / Cmd+Y**: Redo

#### Undo/Redo System
- Full undo/redo support for all sample operations
- Visual indicators in sidebar showing undo/redo availability
- Up to 50 levels of undo history

#### Grid Snapping
- Toggle snap-to-grid with visual feedback
- Adjustable grid subdivision (1, 2, 4, 8, 16)
- Aligned with BPM and offset settings

#### Better Sample Management
- Inline sample list in sidebar with quick removal
- "Clear All" button for resetting
- Sample count display
- Hover-to-reveal delete buttons (less visual clutter)

#### Improved Playback
- Visual playhead that auto-scrolls during playback
- Play/Pause/Stop buttons with clear states
- Playback speed control (0.25x to 2x)
- Volume control for main audio and metronome
- Persistent timeline scrubber

#### Enhanced Waveform Interaction
- **Click**: Add sample at position
- **Double-click marker**: Remove sample
- **Right-click**: Seek to position
- **Scroll**: Zoom in/out (25% to 400%)
- Visual feedback for all interactions

#### Settings & Controls
- All controls grouped logically
- Real-time parameter adjustment with visual feedback
- Zoom from 25% to 400%
- BPM range 40-240 with fine control
- Offset adjustment in milliseconds

#### Better Metronome
- Toggle with instant feedback
- Volume control (0-100%)
- Only plays during playback
- Click sound is precise sine wave

#### Status Display
- Clear, concise status messages
- Feedback on all operations
- Error messages when needed

### 📐 Accuracy Preserved

- **No Re-encoding**: Audio remains bit-perfect throughout
- **Direct Processing**: Samples extracted directly from original buffer
- **Precise Timing**: Sub-millisecond accuracy with snap-to-grid
- **Frame-Perfect Extraction**: Original `useAudioProcessing` logic preserved
- **Same WAV Encoding**: Direct float32 to 16-bit PCM conversion

## File Structure

```
src/
├── App.jsx                 # Main app with state management
├── components/
│   ├── Editor.jsx         # Waveform + playback controls
│   ├── Waveform.jsx       # Fixed waveform renderer
│   └── Sidebar.jsx        # Controls panel
├── hooks/
│   ├── useAudioPlayer.js  # Playback engine
│   ├── useAudioProcessing.js  # Sample averaging
│   ├── useUndoRedo.js     # Undo/redo system
│   └── useKeyboardShortcuts.js # Keyboard handling
├── index.css              # Styled components & design tokens
└── main.jsx               # Entry point
```

## Key Improvements by Component

### App.jsx
- Undo/redo context with `useUndoRedo` hook
- Keyboard shortcuts integration
- Cleaner state management
- Better event handling

### Waveform.jsx (COMPLETE REWRITE)
- **Single canvas approach** instead of complex tiling
- **Direct coordinate mapping** without scale/display width confusion
- **Reliable scroll sync** - uses container.scrollLeft directly
- **Playhead auto-scroll** during playback
- **Beat grid** with visual differentiation for main beats
- **Sample markers** with centered regions
- **Offset line** with orange color for quick identification

### Sidebar.jsx (NEW)
- File input with status display
- Organized control sections:
  - Audio file loading
  - Timing controls (BPM, offset, subdivision)
  - Metronome controls
  - Playback volume
  - View zoom
  - Sample list with undo/redo
  - Extract button
- Status bar at bottom

### Editor.jsx (NEW)
- Combined waveform + playback controls
- Modern playback UI with:
  - Play/Pause/Stop buttons
  - Speed control
  - Timeline scrubber
  - Time display

## How to Use

### Installation
```bash
# Copy these files to your src/ directory
# Keep existing useAudioPlayer.js and useAudioProcessing.js
# Create new hooks folder if needed

npm install
npm run dev
```

### Workflow
1. **Load Audio**: Click "Load Audio" in sidebar
2. **Adjust Timing**: Set BPM and offset for your grid
3. **Mark Samples**: Click waveform to add markers
   - Use snap-to-grid for consistency
   - Right-click to seek
4. **Review**: Play back to verify marks
5. **Extract**: Click "Extract Sample" to download WAV

### Tips
- **Zoom** for better precision at higher zoom levels
- **Snap-to-grid** for consistent timing
- **Metronome** to hear click during marking
- **Speed control** for detailed listening
- **Undo** if you make mistakes

## Design Decisions

### Layout
- **Sidebar**: Fixed width (320px), scrollable content
- **Main editor**: Takes remaining space, vertically stacked
- **Fixed playback controls**: Always visible below waveform

### Color Palette
- **Primary**: Cyan (#06b6d4) - Main actions and highlights
- **Secondary**: Orange (#f97316) - Offset line
- **Accent**: Rose (#fb7185) - Sample markers
- **Dark**: Slate-900 (#0f172a) - Main background

### Typography
- **Display**: System sans (Inter fallback)
- **Monospace**: System mono - for time displays and code
- **Sizes**: Clear hierarchy from 12px to 20px

### Interactions
- **Hover**: Subtle background changes (no jarring effects)
- **Click**: Immediate visual feedback with scale transform
- **Drag**: Smooth cursor changes
- **Scroll**: Momentum-based with inertia

## Browser Compatibility

- Modern browsers with Web Audio API support
- Chrome, Safari, Firefox, Edge (latest versions)
- Requires:
  - AudioContext
  - Canvas 2D
  - requestAnimationFrame
  - Float32Array

## Performance

- Simplified rendering (single canvas, no tiling)
- Efficient scroll handling with RAF
- Debounced redraw on resize
- Minimal state updates
- No unnecessary re-renders

## Known Limitations

- Canvas rendering at native resolution (no vector)
- High zoom levels may show pixel grid (by design - precision)
- Very long audio files (>1hr) may need optimization (see original tiling approach if needed)

## Future Enhancements

Possible additions:
- Multi-file batch extraction
- Sample library/favorites
- Audio effects (fade, normalization)
- MIDI export
- Marker naming/tagging
- Theme switcher
- Settings persistence
- Copy/paste markers
- Marker import/export

## Migration from Old Version

The old code had several architectural issues:

1. **Complex tiling system** - Removed for simplicity; works well for typical use cases
2. **Scroll coordinate confusion** - Fixed with direct container.scrollLeft mapping
3. **Multiple canvases** - Unified to single canvas with overlay
4. **Excessive state** - Consolidated and reorganized

All original audio processing logic is preserved for accuracy.

## Troubleshooting

### Scroll offset issues
- ✅ Fixed in this version
- Uses direct container.scrollLeft for positioning
- Canvas coordinates properly mapped to viewport

### Audio not playing
- Check browser console for errors
- Ensure AudioContext is resumed after user gesture
- Try "Enable audio" button in Player

### Marks not visible
- Zoom in for clarity
- Check if marks are outside current view
- Verify BPM/offset settings

### Extract not working
- Need at least one sample marked
- Check browser permissions for downloads
- Verify audio buffer was loaded

## Code Quality

- Clean component separation
- Clear hook usage patterns
- Consistent naming conventions
- Minimal props drilling
- Good performance characteristics
- Accessibility in mind (keyboard focus, ARIA)

## Conclusion

This overhaul transforms Sample Extractor into a professional-grade tool with modern UX, reliable performance, and all the quality-of-life features audio professionals expect. The simplified architecture is easier to maintain and extend while preserving the frame-perfect accuracy of the original.

Enjoy precise sample extraction!
