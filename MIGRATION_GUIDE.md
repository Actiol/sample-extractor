# Migration Guide: Implementing the Overhaul

## Step-by-Step Integration

### 1. Backup Original Files
```bash
# Before starting, backup your current project
cp -r src/ src.backup/
```

### 2. Update Dependencies
No new dependencies needed! The overhaul uses only existing packages:
- React 18.2.0
- Tailwind CSS (already configured)
- Vite (already configured)

### 3. File Structure Setup

Create new component directory structure:
```bash
mkdir -p src/components
mkdir -p src/hooks
```

### 4. Copy New Files

**Core Components** (replace existing):
- `App.jsx` → `src/App.jsx`
- `index.css` → `src/index.css`

**New Components**:
- `Editor.jsx` → `src/components/Editor.jsx`
- `Waveform.jsx` → `src/components/Waveform.jsx`
- `Sidebar.jsx` → `src/components/Sidebar.jsx`

**New Hooks** (create):
- `useUndoRedo.js` → `src/hooks/useUndoRedo.js`
- `useKeyboardShortcuts.js` → `src/hooks/useKeyboardShortcuts.js`

**Keep Existing** (don't modify):
- `useAudioPlayer.js` → `src/hooks/useAudioPlayer.js`
- `useAudioProcessing.js` → `src/hooks/useAudioProcessing.js`
- `main.jsx` → `src/main.jsx`

### 5. Delete Old Components (if keeping both, rename them)

These are replaced by new versions:
```bash
rm src/components/PreviewWaveform.jsx
rm src/components/Controls.jsx
rm src/components/Player.jsx
rm src/components/SampleList.jsx
rm src/components/AudioLoader.jsx
rm src/components/Waveform.jsx  # (completely rewritten)
```

### 6. Verify Imports

Make sure all imports are correct. Check:

**In App.jsx:**
```javascript
import Editor from './components/Editor'
import Sidebar from './components/Sidebar'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useAudioProcessing } from './hooks/useAudioProcessing'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useUndoRedo } from './hooks/useUndoRedo'
```

**In Editor.jsx:**
```javascript
import Waveform from './Waveform'
```

**In Waveform.jsx:**
- No component imports, only React

**In Sidebar.jsx:**
- No component imports

### 7. Update index.html (if needed)

The existing `index.html` should work fine. Just verify:
```html
<div id="root"></div>
```

### 8. Tailwind Configuration

Ensure your `tailwind.config.js` is correctly configured (should already be):
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Custom colors are defined in index.css now
    },
  },
  plugins: [],
}
```

### 9. Start Development Server

```bash
npm run dev
```

You should see:
- Modern dark theme with gradient backgrounds
- Sidebar on the left with controls
- Main editor area on the right with waveform
- Status message: "Load an audio file to begin"

### 10. Test Basic Workflow

1. Load an audio file (click "Load Audio")
2. Click waveform to add markers
3. Play/pause with spacebar or button
4. Adjust BPM and offset
5. Extract sample
6. Test undo/redo (Ctrl+Z/Ctrl+Y)

## Troubleshooting During Migration

### Issue: Components not found
**Solution**: Check file paths in imports. All component paths should be relative:
```javascript
// ✅ Correct
import Sidebar from './components/Sidebar'

// ❌ Wrong
import Sidebar from 'components/Sidebar'
```

### Issue: Tailwind classes not working
**Solution**: Ensure `index.css` is imported in `main.jsx`:
```javascript
import './index.css'
```

### Issue: Hooks not found
**Solution**: Create `src/hooks/` directory if it doesn't exist:
```bash
mkdir -p src/hooks
```

### Issue: Old imports still referenced
**Solution**: Search for old component names and update:
```bash
# Find old component references
grep -r "PreviewWaveform\|Controls\|Player" src/

# Remove or update them
```

### Issue: Build errors
**Solution**: Clear cache and rebuild:
```bash
rm -rf node_modules/.vite
npm run dev
```

## Verification Checklist

After migration, verify:

- [ ] App loads without console errors
- [ ] Audio file can be loaded
- [ ] Waveform displays correctly
- [ ] Click on waveform adds samples
- [ ] Samples appear as red markers
- [ ] Play/pause works with spacebar
- [ ] Playhead moves during playback
- [ ] Double-click removes sample
- [ ] Undo/redo works (Ctrl+Z/Ctrl+Y)
- [ ] Status messages display
- [ ] Extract button downloads WAV
- [ ] Zoom adjusts waveform scale
- [ ] BPM adjustment updates grid
- [ ] Beat grid is visible
- [ ] Metronome can be toggled
- [ ] Volume controls work

## Performance Checklist

- [ ] Waveform renders smoothly (no jank)
- [ ] Playhead scrolls smoothly during playback
- [ ] No console warnings
- [ ] Memory usage is reasonable (DevTools)
- [ ] Responsive to interactions (no lag)

## Data Migration

All sample data is stored in React state - nothing persists. If you want to add localStorage:

**Optional: Add persistence**
```javascript
// In App.jsx, add after samples state changes:
useEffect(() => {
  localStorage.setItem('samples', JSON.stringify(samples))
}, [samples])

// And load on mount:
useEffect(() => {
  const saved = localStorage.getItem('samples')
  if (saved) setSamples(JSON.parse(saved))
}, [])
```

## Rollback

If you need to revert:
```bash
rm -rf src/
cp -r src.backup/ src/
npm run dev
```

## What If You Have Custom Changes?

If you have custom modifications to the old code:

1. **Identify changes**: What did you modify in the original?
2. **Apply to new**: Re-implement in the new architecture
3. **Most likely places**:
   - Sample processing logic → stays in `useAudioProcessing.js`
   - Player logic → stays in `useAudioPlayer.js`
   - UI styling → update in component JSX or `index.css`
   - New features → add in appropriate components/hooks

## Performance Optimization Notes

The new Waveform is simpler but still fast. If you need to:

**Handle very long audio files (>2 hours)**:
- Consider re-implementing tiling from original
- Or implement virtual scrolling
- Monitor memory usage in DevTools

**Add more features**:
- Keep components small (single responsibility)
- Use hooks for logic
- Consider Context API for shared state

**Improve rendering**:
- WebGL is overkill for this use case
- Canvas 2D is sufficient
- Offscreen canvas if needed for complex operations

## Style Customization

To change colors/theme, edit in `index.css` or `Sidebar.jsx`:

**Primary accent** (cyan):
- Search for `#06b6d4` or `cyan-500`
- Replace with your color

**Sample marker** (rose):
- Search for `#fb7185` or `rose` color codes
- Replace with your color

**Offset line** (orange):
- Search for `#f97316` or `orange`
- Replace with your color

## Post-Migration Checklist

After everything works:

- [ ] Delete `src.backup/` folder
- [ ] Commit changes to git
- [ ] Test on different browsers
- [ ] Test on mobile (should work but not optimized)
- [ ] Update any documentation
- [ ] Share with team
- [ ] Gather feedback

## Getting Help

If something doesn't work:

1. Check browser console for errors (F12)
2. Check the Troubleshooting section above
3. Verify all file paths match directory structure
4. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)
5. Check that Tailwind CSS is properly configured

## Support

The overhaul maintains 100% compatibility with the original audio processing logic. All features are preserved with improved UX and reliability.

Happy extracting! 🎵
